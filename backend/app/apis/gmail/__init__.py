from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import base64
import json
from typing import List, Optional
from fastapi.responses import RedirectResponse, HTMLResponse
from app.env import mode, Mode
from app.config import get_settings, get_secret
import asyncpg
from app.auth import AuthorizedUser
from typing import Annotated
from fastapi import Depends
import secrets
import asyncio

router = APIRouter(prefix="/gmail")

# Gmail API scopes - we need modify to download attachments
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
]

class AuthUrlResponse(BaseModel):
    auth_url: str

class GmailStatusResponse(BaseModel):
    connected: bool
    email: str | None = None

class OAuthCallbackRequest(BaseModel):
    code: str

class OAuthCallbackResponse(BaseModel):
    success: bool
    message: str

class ReceiptEmail(BaseModel):
    email_id: str
    subject: str
    sender: str
    date: str
    has_attachments: bool
    attachment_count: int

class ReceiptEmailsResponse(BaseModel):
    emails: List[ReceiptEmail]
    count: int

class Attachment(BaseModel):
    filename: str
    mime_type: str
    size: int

class AttachmentsResponse(BaseModel):
    attachments: List[Attachment]

@router.get("/status")
async def get_gmail_status(user: AuthorizedUser) -> GmailStatusResponse:
    """
    Check if the user has connected their Gmail account.
    Returns connection status and email if connected.
    """
    print(f"Gmail status check for user: {user.sub}")
    try:
        settings = get_settings()
        database_url = settings.DATABASE_URL
        
        # Quick database check with 2-second timeout
        conn = await asyncpg.connect(database_url, timeout=2)
        try:
            row = await asyncio.wait_for(
                conn.fetchrow(
                    "SELECT token_data FROM gmail_tokens WHERE user_id = $1",
                    user.sub
                ),
                timeout=2.0
            )
            
            if row:
                print(f"Gmail status: CONNECTED (found tokens for {user.sub})")
                return GmailStatusResponse(connected=True)
            else:
                print(f"Gmail status: NOT CONNECTED (no tokens found for {user.sub})")
                return GmailStatusResponse(connected=False)
        finally:
            await conn.close()
            
    except Exception as e:
        print(f"Error checking Gmail status: {type(e).__name__}: {str(e)}")
        return GmailStatusResponse(connected=False)

@router.get("/auth/start")
async def start_gmail_auth(user: AuthorizedUser):
    """
    Starts the Gmail OAuth flow by generating an authorization URL.
    The user clicks this to grant access to their Gmail account.
    Returns the URL that the frontend should open in a popup.
    """
    try:
        print(f"Starting Gmail OAuth for user: {user.sub}")
        credentials_json = get_secret("GMAIL_OAUTH_CREDENTIALS")
        credentials_data = json.loads(credentials_json)
        print("Gmail credentials loaded successfully")
        
        # Get redirect URI from settings
        settings = get_settings()
        redirect_uri = f'{settings.BACKEND_URL}/routes/gmail/auth/callback'
        
        print(f"Creating OAuth flow with redirect URI: {redirect_uri}")
        flow = Flow.from_client_config(
            credentials_data,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        print("OAuth flow created successfully")
        
        # Generate a state token to prevent CSRF and link to user
        state_token = secrets.token_urlsafe(32)
        print(f"Generated state token: {state_token[:10]}...")
        
        # Store state token in database with user_id
        settings = get_settings()
        database_url = settings.DATABASE_URL
        
        print("Connecting to database to store state token...")
        conn = await asyncpg.connect(database_url, timeout=3)
        try:
            print("Inserting state token into database...")
            await asyncio.wait_for(
                conn.execute(
                    """
                    INSERT INTO gmail_oauth_states (state_token, user_id, created_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                    """,
                    state_token,
                    user.sub
                ),
                timeout=3.0
            )
            print("State token stored successfully")
        finally:
            await conn.close()

        print("Generating authorization URL...")
        auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline', state=state_token)
        print(f"Authorization URL generated: {auth_url[:100]}...")
        
        return AuthUrlResponse(auth_url=auth_url)
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Invalid Gmail OAuth credentials format in secrets."
        )
    except Exception as e:
        print(f"Error in start_gmail_auth: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start OAuth flow: {str(e)}"
        )

@router.get("/auth/callback", dependencies=[])
async def gmail_auth_callback(code: str, state: str | None = None):
    """
    Handle the OAuth callback from Google.
    Google redirects here after user grants permissions.
    Uses state parameter to link to the authenticated user.
    Redirects back to home page after success.
    """
    print(f"Gmail callback started with state: {state[:10] if state else 'None'}...")
    try:
        if not state:
            print("ERROR: Missing state parameter")
            # Get frontend URL from settings
            settings = get_settings()
            home_url = settings.FRONTEND_URL
            
            return HTMLResponse(content=f"""
            <!DOCTYPE html>
            <html>
            <head><title>Gmail OAuth</title></head>
            <body>
                <h2>Authentication failed: Missing state parameter</h2>
                <p><a href="{home_url}">Return to home</a></p>
            </body>
            </html>
            """)
        
        # Get database and frontend URL from settings
        settings = get_settings()
        database_url = settings.DATABASE_URL
        home_url = settings.FRONTEND_URL
        
        print("Connecting to database to retrieve state token...")
        conn = await asyncpg.connect(database_url)
        try:
            # Get user_id from state and delete the state token
            row = await conn.fetchrow(
                "SELECT user_id FROM gmail_oauth_states WHERE state_token = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes'",
                state
            )
            
            if not row:
                print(f"ERROR: Invalid or expired state token: {state[:10]}...")
                raise HTTPException(status_code=400, detail="Invalid or expired state token")
            
            user_id = row['user_id']
            print(f"Found user_id from state: {user_id}")
            
            # Delete the used state token
            await conn.execute(
                "DELETE FROM gmail_oauth_states WHERE state_token = $1",
                state
            )
            print("State token deleted")
        finally:
            await conn.close()
        
        print("Loading Gmail credentials...")
        credentials_json = get_secret("GMAIL_OAUTH_CREDENTIALS")
        credentials_data = json.loads(credentials_json)
        
        # Get redirect URI from settings
        settings = get_settings()
        redirect_uri = f'{settings.BACKEND_URL}/routes/gmail/auth/callback'
        
        print("Creating OAuth flow...")
        flow = Flow.from_client_config(
            credentials_data,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        
        # Exchange code for tokens
        print("Exchanging code for tokens...")
        flow.fetch_token(code=code)
        credentials = flow.credentials
        print(f"Got credentials - has refresh_token: {credentials.refresh_token is not None}")
        
        # Store the refresh token securely in database for this user
        token_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        # Save to database
        print(f"Saving tokens to database for user_id: {user_id}")
        conn = await asyncpg.connect(database_url)
        try:
            await conn.execute(
                """
                INSERT INTO gmail_tokens (user_id, token_data, updated_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id)
                DO UPDATE SET token_data = $2, updated_at = CURRENT_TIMESTAMP
                """,
                user_id,
                json.dumps(token_data)
            )
            print("Tokens saved successfully!")
        finally:
            await conn.close()
        
        # Redirect back to home page with success message
        print("Redirecting to home page with success")
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Gmail OAuth</title>
            <meta http-equiv="refresh" content="0;url={home_url}?gmail=success">
        </head>
        <body>
            <p>Gmail connected successfully! Redirecting...</p>
            <p>If not redirected, <a href="{home_url}">click here</a></p>
        </body>
        </html>
        """)
        
    except Exception as e:
        print(f"Gmail auth callback error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Get frontend URL from settings for error redirect
        settings = get_settings()
        home_url = settings.FRONTEND_URL
        
        # Redirect back to home with error message
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Gmail OAuth</title>
            <meta http-equiv="refresh" content="3;url={home_url}?gmail=error">
        </head>
        <body>
            <h2>Authentication failed: {str(e)}</h2>
            <p>Redirecting to home page in 3 seconds...</p>
            <p><a href="{home_url}">Click here to return now</a></p>
        </body>
        </html>
        """)

async def get_gmail_service(user: AuthorizedUser):
    """
    Helper function to get authenticated Gmail service for a specific user.
    """
    try:
        # Get database connection
        settings = get_settings()
        database_url = settings.DATABASE_URL
        
        conn = await asyncpg.connect(database_url)
        try:
            # Get stored tokens for this user
            row = await conn.fetchrow(
                "SELECT token_data FROM gmail_tokens WHERE user_id = $1",
                user.sub
            )
            
            if not row:
                raise HTTPException(
                    status_code=401,
                    detail="Gmail not authenticated. Please complete OAuth flow first."
                )
            
            token_data = json.loads(row['token_data'])
        finally:
            await conn.close()
        
        # Create credentials from stored tokens
        credentials = Credentials(
            token=token_data.get('token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri=token_data.get('token_uri'),
            client_id=token_data.get('client_id'),
            client_secret=token_data.get('client_secret'),
            scopes=token_data.get('scopes')
        )
        
        # Build and return service
        service = build('gmail', 'v1', credentials=credentials)
        return service
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Gmail service: {str(e)}"
        )

@router.get("/scan-receipts")
async def scan_receipt_emails(
    user: AuthorizedUser,
    start_date: Optional[str] = None,  # Format: YYYY/MM/DD
    end_date: Optional[str] = None      # Format: YYYY/MM/DD
) -> ReceiptEmailsResponse:
    """
    Scan Gmail inbox for emails that contain receipts.
    Looks for emails with 'Receipt', 'Payment', or 'Purchase' in subject,
    but excludes incoming payment notifications (donations received).
    
    Optional date filtering:
    - start_date: Only include emails after this date (format: YYYY/MM/DD)
    - end_date: Only include emails before this date (format: YYYY/MM/DD)
    """
    try:
        service = await get_gmail_service(user)
        
        # Search for emails with receipt-related keywords
        # Exclude incoming payment notifications
        query = (
            '(subject:Receipt OR subject:Purchase OR subject:"Order Confirmation" '
            'OR subject:Invoice OR subject:"Thank you for your purchase") '
            '-subject:"You received a payment" '
            '-subject:"payment was declined" '
            '-subject:declined '
            '-subject:donation '
            '-subject:"donor" '
            '-subject:"contribution received"'
        )
        
        # Add date filters if provided
        if start_date:
            query += f' after:{start_date}'
        if end_date:
            query += f' before:{end_date}'
        
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=50
        ).execute()
        
        messages = results.get('messages', [])
        
        receipt_emails = []
        
        for msg in messages:
            # Get full message details - use 'full' format to get parts/attachments
            message = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='full'
            ).execute()
            
            headers = {h['name']: h['value'] for h in message['payload']['headers']}
            
            # Check if message has attachments
            has_attachments = False
            attachment_count = 0
            
            if 'parts' in message['payload']:
                for part in message['payload']['parts']:
                    if part.get('filename'):
                        has_attachments = True
                        attachment_count += 1
            
            receipt_emails.append(ReceiptEmail(
                email_id=msg['id'],
                subject=headers.get('Subject', 'No Subject'),
                sender=headers.get('From', 'Unknown'),
                date=headers.get('Date', ''),
                has_attachments=has_attachments,
                attachment_count=attachment_count
            ))
        
        return ReceiptEmailsResponse(
            emails=receipt_emails,
            count=len(receipt_emails)
        )
        
    except HttpError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gmail API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scan emails: {str(e)}"
        )

@router.get("/email/{email_id}/attachments")
async def get_email_attachments(email_id: str, user: AuthorizedUser) -> AttachmentsResponse:
    """
    Get list of attachments for a specific email.
    """
    try:
        service = await get_gmail_service(user)
        
        # Get the message
        message = service.users().messages().get(
            userId='me',
            id=email_id
        ).execute()
        
        attachments = []
        
        # Parse attachments from message parts
        if 'parts' in message['payload']:
            for part in message['payload']['parts']:
                if part.get('filename'):
                    attachments.append(Attachment(
                        filename=part['filename'],
                        mime_type=part.get('mimeType', 'unknown'),
                        size=int(part['body'].get('size', 0))
                    ))
        
        return AttachmentsResponse(attachments=attachments)
        
    except HttpError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gmail API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get attachments: {str(e)}"
        )

@router.get("/email/{email_id}/download/{attachment_id}")
async def download_attachment(email_id: str, attachment_id: str, user: AuthorizedUser):
    """
    Download a specific attachment from an email.
    Returns the attachment data in base64 format.
    """
    try:
        service = await get_gmail_service(user)
        
        # Get the attachment
        attachment = service.users().messages().attachments().get(
            userId='me',
            messageId=email_id,
            id=attachment_id
        ).execute()
        
        # Decode attachment data
        file_data = base64.urlsafe_b64decode(attachment['data'])
        
        return {
            "data": base64.b64encode(file_data).decode('utf-8'),
            "size": len(file_data)
        }
        
    except HttpError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gmail API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download attachment: {str(e)}"
        )

@router.get("/email/{email_id}/convert-to-pdf")
async def convert_email_to_pdf(email_id: str, user: AuthorizedUser):
    """
    Convert the HTML body of an email to PDF.
    Returns the PDF data in base64 format.
    """
    try:
        try:
            from weasyprint import HTML
        except ImportError:
            raise HTTPException(
                status_code=501,
                detail="PDF conversion not available - weasyprint not installed in serverless environment"
            )
        import io
        
        service = await get_gmail_service(user)
        
        # Get the full message
        message = service.users().messages().get(
            userId='me',
            messageId=email_id,
            format='full'
        ).execute()
        
        # Extract HTML body
        html_content = None
        
        def get_body(payload):
            """Recursively extract HTML body from email payload"""
            if 'parts' in payload:
                for part in payload['parts']:
                    if part['mimeType'] == 'text/html':
                        data = part['body'].get('data')
                        if data:
                            return base64.urlsafe_b64decode(data).decode('utf-8')
                    # Recursively check nested parts
                    result = get_body(part)
                    if result:
                        return result
            elif payload.get('mimeType') == 'text/html':
                data = payload['body'].get('data')
                if data:
                    return base64.urlsafe_b64decode(data).decode('utf-8')
            elif payload.get('mimeType') == 'text/plain' and not html_content:
                # Fallback to plain text if no HTML found
                data = payload['body'].get('data')
                if data:
                    text = base64.urlsafe_b64decode(data).decode('utf-8')
                    # Wrap plain text in basic HTML
                    return f'<html><body><pre style="white-space: pre-wrap; font-family: sans-serif;">{text}</pre></body></html>'
            return None
        
        html_content = get_body(message['payload'])
        
        if not html_content:
            raise HTTPException(
                status_code=404,
                detail="No email body content found"
            )
        
        # Convert HTML to PDF using WeasyPrint
        pdf_buffer = io.BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        pdf_data = pdf_buffer.read()
        
        # Return as base64
        return {
            "data": base64.b64encode(pdf_data).decode('utf-8'),
            "size": len(pdf_data)
        }
        
    except HttpError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gmail API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to convert email to PDF: {str(e)}"
        )
