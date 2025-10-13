from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from pydantic import BaseModel
import dropbox
from dropbox.oauth import DropboxOAuth2Flow
import secrets
import time
import json
import requests
from datetime import datetime
import asyncpg
from app.auth import AuthorizedUser
from app.env import Mode, mode
from app.config import get_settings, get_secret

router = APIRouter()

# Helper functions for state management using database
async def _store_oauth_state(state: str, user_id: str = None):
    """Store OAuth state in database with current timestamp"""
    try:
        settings = get_settings()
        conn = await asyncpg.connect(settings.DATABASE_URL)
        try:
            await conn.execute(
                """
                INSERT INTO dropbox_oauth_states (state_token, user_id, created_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                """,
                state,
                user_id
            )
            print(f"Stored OAuth state: {state}")
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error storing OAuth state: {e}")

async def _validate_oauth_state(state: str) -> tuple[bool, str | None]:
    """Validate and remove OAuth state from database. Returns (valid, user_id)"""
    try:
        settings = get_settings()
        conn = await asyncpg.connect(settings.DATABASE_URL)
        try:
            # Get state and check if not expired (10 minutes)
            row = await conn.fetchrow(
                """
                SELECT user_id FROM dropbox_oauth_states
                WHERE state_token = $1
                AND created_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes'
                """,
                state
            )

            if not row:
                print(f"State {state} not found or expired")
                return (False, None)

            # Delete the used state token
            await conn.execute(
                "DELETE FROM dropbox_oauth_states WHERE state_token = $1",
                state
            )
            print(f"State validated and removed")
            return (True, row['user_id'])

        finally:
            await conn.close()
    except Exception as e:
        print(f"Error validating OAuth state: {e}")
        return (False, None)

async def _get_dropbox_token(user_id: str) -> str | None:
    """Get user's Dropbox refresh token from database"""
    try:
        settings = get_settings()
        conn = await asyncpg.connect(settings.DATABASE_URL)
        try:
            row = await conn.fetchrow(
                "SELECT refresh_token FROM dropbox_tokens WHERE user_id = $1",
                user_id
            )
            return row['refresh_token'] if row else None
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error getting Dropbox token: {e}")
        return None

class DropboxAuthUrlResponse(BaseModel):
    """Response containing the Dropbox authorization URL"""
    auth_url: str
    state: str

class DropboxCallbackRequest(BaseModel):
    """Request containing the OAuth callback code and state"""
    code: str
    state: str

class DropboxCallbackResponse(BaseModel):
    """Response from OAuth callback"""
    success: bool
    message: str
    error: str | None = None

class DropboxStatusResponse(BaseModel):
    """Response indicating Dropbox connection status"""
    connected: bool
    account_name: str | None = None
    error: str | None = None

class UploadToDropboxRequest(BaseModel):
    """Request to upload a file to Dropbox"""
    file_content: str  # Base64 encoded file content
    filename: str  # Name of file in Dropbox (e.g., "Vendor_DD.MM.YYYY_Total.pdf")
    folder_path: str = "/Smart_Receipts"  # Default folder path

class UploadToDropboxResponse(BaseModel):
    """Response from file upload"""
    success: bool
    dropbox_path: str | None = None
    error: str | None = None

class SetFolderRequest(BaseModel):
    folder_path: str

class FolderResponse(BaseModel):
    folder_path: str

class ParsedReceipt(BaseModel):
    """Parsed receipt information from filename"""
    filename: str
    vendor: str | None
    date: str | None  # DD.MM.YYYY format
    amount: str | None
    currency: str | None
    dropbox_path: str
    modified_time: str | None  # ISO 8601 format

class DropboxReceiptsResponse(BaseModel):
    """Response containing list of receipts from Dropbox"""
    success: bool
    receipts: list[ParsedReceipt]
    total_count: int
    folder_path: str
    error: str | None = None


@router.get("/dropbox/auth-url")
async def get_dropbox_auth_url(user: AuthorizedUser) -> DropboxAuthUrlResponse:
    """
    Generate a Dropbox OAuth authorization URL.
    User should be redirected to this URL to authorize the app.
    """
    try:
        settings = get_settings()
        app_key = settings.DROPBOX_APP_KEY

        # Get redirect URI from settings
        redirect_uri = f"{settings.BACKEND_URL}/routes/dropbox/callback"

        # Generate a random state for CSRF protection
        state = secrets.token_urlsafe(32)
        await _store_oauth_state(state, user.sub)
        
        # Build authorization URL
        auth_url = f"https://www.dropbox.com/oauth2/authorize?client_id={app_key}&redirect_uri={redirect_uri}&response_type=code&token_access_type=offline&state={state}"
        
        return DropboxAuthUrlResponse(auth_url=auth_url, state=state)
    except Exception as e:
        print(f"Error generating Dropbox auth URL: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dropbox/callback")
async def dropbox_callback(code: str, state: str):
    """
    Handle the OAuth callback from Dropbox.
    Redirects back to home page after success.
    """
    print(f"Received callback with state: {state}")

    # Get home URL from settings
    settings = get_settings()
    home_url = settings.FRONTEND_URL

    # Validate state using the existing helper function
    valid, user_id = await _validate_oauth_state(state)
    if not valid:
        print(f"Invalid or expired state: {state}")
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dropbox OAuth</title>
            <meta http-equiv="refresh" content="3;url={home_url}?dropbox=error">
        </head>
        <body>
            <h2>Authentication failed: Invalid session</h2>
            <p>Redirecting to home page in 3 seconds...</p>
            <p><a href="{home_url}">Click here to return now</a></p>
        </body>
        </html>
        """)

    # Exchange code for tokens
    try:
        settings = get_settings()
        app_key = settings.DROPBOX_APP_KEY
        app_secret = settings.DROPBOX_APP_SECRET
        
        # Get redirect URI from settings
        redirect_uri = f"{settings.BACKEND_URL}/routes/dropbox/callback"
        
        token_url = "https://api.dropboxapi.com/oauth2/token"
        token_data = {
            "code": code,
            "grant_type": "authorization_code",
            "client_id": app_key,
            "client_secret": app_secret,
            "redirect_uri": redirect_uri,
        }

        response = requests.post(token_url, data=token_data)
        print(f"Token exchange response status: {response.status_code}")
        print(f"Token exchange response body: {response.text}")

        if response.status_code != 200:
            error_msg = response.json().get("error_description", "Unknown error")
            return HTMLResponse(content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dropbox OAuth</title>
                <meta http-equiv="refresh" content="3;url={home_url}?dropbox=error">
            </head>
            <body>
                <h2>Authentication failed: {error_msg}</h2>
                <p>Redirecting to home page in 3 seconds...</p>
                <p><a href="{home_url}">Click here to return now</a></p>
            </body>
            </html>
            """)

        token_response = response.json()
        refresh_token = token_response.get("refresh_token")

        if not refresh_token:
            return HTMLResponse(content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dropbox OAuth</title>
                <meta http-equiv="refresh" content="3;url={home_url}?dropbox=error">
            </head>
            <body>
                <h2>Authentication failed: No refresh token</h2>
                <p>Redirecting to home page in 3 seconds...</p>
                <p><a href="{home_url}">Click here to return now</a></p>
            </body>
            </html>
            """)

        # Store refresh token in database for the user
        if user_id:
            conn = await asyncpg.connect(settings.DATABASE_URL)
            try:
                await conn.execute(
                    """
                    INSERT INTO dropbox_tokens (user_id, refresh_token, updated_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id)
                    DO UPDATE SET refresh_token = $2, updated_at = CURRENT_TIMESTAMP
                    """,
                    user_id,
                    refresh_token
                )
                print(f"Dropbox OAuth successful! Refresh token stored for user {user_id}")
            finally:
                await conn.close()
        else:
            print("Warning: No user_id found, refresh token not stored")

        # Redirect back to home page with success message
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dropbox OAuth</title>
            <meta http-equiv="refresh" content="0;url={home_url}?dropbox=success">
        </head>
        <body>
            <p>Dropbox connected successfully! Redirecting...</p>
            <p>If not redirected, <a href="{home_url}">click here</a></p>
        </body>
        </html>
        """)
        
    except Exception as e:
        print(f"Dropbox OAuth error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Redirect back to home with error message
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dropbox OAuth</title>
            <meta http-equiv="refresh" content="3;url={home_url}?dropbox=error">
        </head>
        <body>
            <h2>Authentication failed: {str(e)}</h2>
            <p>Redirecting to home page in 3 seconds...</p>
            <p><a href="{home_url}">Click here to return now</a></p>
        </body>
        </html>
        """)


@router.get("/dropbox/status")
async def get_dropbox_status(user: AuthorizedUser) -> DropboxStatusResponse:
    """
    Check if Dropbox is connected and get account information.
    """
    try:
        refresh_token = await _get_dropbox_token(user.sub)

        if not refresh_token:
            return DropboxStatusResponse(
                connected=False,
                account_name=None
            )

        # If we have a refresh token, we're connected
        return DropboxStatusResponse(
            connected=True,
            account_name="Connected"
        )

    except Exception as e:
        print(f"Error checking Dropbox status: {e}")
        return DropboxStatusResponse(
            connected=False,
            account_name=None,
            error=str(e)
        )


@router.post("/dropbox/upload")
async def upload_to_dropbox(request: UploadToDropboxRequest, user: AuthorizedUser) -> UploadToDropboxResponse:
    """
    Upload a file to Dropbox.
    Takes base64 encoded file content and uploads it to the specified folder.
    """
    try:
        refresh_token = await _get_dropbox_token(user.sub)

        if not refresh_token:
            raise HTTPException(
                status_code=401,
                detail="Dropbox not connected. Please connect your Dropbox account first."
            )
        
        settings = get_settings()
        app_key = settings.DROPBOX_APP_KEY
        app_secret = settings.DROPBOX_APP_SECRET
        
        # Decode base64 file content
        import base64
        file_data = base64.b64decode(request.file_content)
        
        # Construct full Dropbox path
        dropbox_path = f"{request.folder_path}/{request.filename}"
        
        # Upload to Dropbox
        with dropbox.Dropbox(
            app_key=app_key,
            app_secret=app_secret,
            oauth2_refresh_token=refresh_token
        ) as dbx:
            # Upload file (overwrites if exists)
            dbx.files_upload(
                file_data,
                dropbox_path,
                mode=dropbox.files.WriteMode.overwrite
            )
            
            print(f"Successfully uploaded {request.filename} to Dropbox at {dropbox_path}")
            
            return UploadToDropboxResponse(
                success=True,
                dropbox_path=dropbox_path
            )
            
    except Exception as e:
        print(f"Error uploading to Dropbox: {e}")
        import traceback
        traceback.print_exc()
        return UploadToDropboxResponse(
            success=False,
            error=str(e)
        )

@router.get("/dropbox/folder")
async def get_dropbox_folder(user: AuthorizedUser) -> FolderResponse:
    """
    Get the user's saved Dropbox folder preference.
    Returns default '/Smart Receipts' if not set.
    """
    settings = get_settings()
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    try:
        row = await conn.fetchrow(
            "SELECT folder_path FROM dropbox_folder_preferences WHERE user_id = $1",
            user.sub
        )
        
        if row:
            return FolderResponse(folder_path=row['folder_path'])
        else:
            # Return default folder
            return FolderResponse(folder_path="/Smart Receipts")
    finally:
        await conn.close()

@router.post("/dropbox/folder")
async def set_dropbox_folder(request: SetFolderRequest, user: AuthorizedUser) -> FolderResponse:
    """
    Save the user's Dropbox folder preference.
    """
    settings = get_settings()
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    try:
        # Ensure folder path starts with /
        folder_path = request.folder_path
        if not folder_path.startswith('/'):
            folder_path = '/' + folder_path
        
        # Upsert the folder preference
        await conn.execute(
            """
            INSERT INTO dropbox_folder_preferences (user_id, folder_path, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET folder_path = $2, updated_at = CURRENT_TIMESTAMP
            """,
            user.sub,
            folder_path
        )
        
        return FolderResponse(folder_path=folder_path)
    finally:
        await conn.close()

@router.get("/dropbox/receipts")
async def list_dropbox_receipts(user: AuthorizedUser) -> DropboxReceiptsResponse:
    """
    List all receipt files from the user's Dropbox folder.
    Parses filenames to extract vendor, date, amount information.
    Expected format: Vendor_DD.MM.YYYY_Amount.pdf or Vendor_DD.MM.YYYY_Amount_Currency.pdf
    """
    try:
        refresh_token = await _get_dropbox_token(user.sub)

        if not refresh_token:
            return DropboxReceiptsResponse(
                success=False,
                receipts=[],
                total_count=0,
                folder_path="",
                error="Dropbox not connected. Please connect your Dropbox account first."
            )

        # Get user's folder preference
        settings = get_settings()
        conn = await asyncpg.connect(settings.DATABASE_URL)
        
        try:
            row = await conn.fetchrow(
                "SELECT folder_path FROM dropbox_folder_preferences WHERE user_id = $1",
                user.sub
            )
            folder_path = row['folder_path'] if row else "/Smart Receipts"
        finally:
            await conn.close()
        
        settings = get_settings()
        app_key = settings.DROPBOX_APP_KEY
        app_secret = settings.DROPBOX_APP_SECRET
        
        # List files from Dropbox
        with dropbox.Dropbox(
            app_key=app_key,
            app_secret=app_secret,
            oauth2_refresh_token=refresh_token
        ) as dbx:
            try:
                result = dbx.files_list_folder(folder_path)
            except dropbox.exceptions.ApiError as e:
                if hasattr(e.error, 'is_path') and e.error.is_path():
                    # Folder doesn't exist
                    return DropboxReceiptsResponse(
                        success=True,
                        receipts=[],
                        total_count=0,
                        folder_path=folder_path,
                        error="Folder not found. Upload receipts to create it."
                    )
                raise
            
            receipts = []
            
            for entry in result.entries:
                # Only process files (not folders)
                if isinstance(entry, dropbox.files.FileMetadata):
                    parsed = _parse_receipt_filename(entry.name)
                    
                    receipts.append(ParsedReceipt(
                        filename=entry.name,
                        vendor=parsed.get("vendor"),
                        date=parsed.get("date"),
                        amount=parsed.get("amount"),
                        currency=parsed.get("currency", "USD"),
                        dropbox_path=entry.path_display,
                        modified_time=entry.client_modified.isoformat() if entry.client_modified else None
                    ))
            
            # Sort by modified time (newest first)
            receipts.sort(key=lambda r: r.modified_time or "", reverse=True)
            
            return DropboxReceiptsResponse(
                success=True,
                receipts=receipts,
                total_count=len(receipts),
                folder_path=folder_path
            )
            
    except Exception as e:
        print(f"Error listing Dropbox receipts: {e}")
        import traceback
        traceback.print_exc()
        return DropboxReceiptsResponse(
            success=False,
            receipts=[],
            total_count=0,
            folder_path="",
            error=str(e)
        )

def _parse_receipt_filename(filename: str) -> dict:
    """
    Parse receipt filename to extract vendor, date, amount, and currency.
    Expected formats:
    - Vendor_DD.MM.YYYY_Amount.pdf
    - Vendor_DD.MM.YYYY_Amount_Currency.pdf
    - Vendor_DD.MM.YYYY_Amount_Currency_USD.pdf (dual currency)
    """
    import re
    
    # Remove file extension
    name_without_ext = filename.rsplit('.', 1)[0] if '.' in filename else filename
    
    # Split by underscore
    parts = name_without_ext.split('_')
    
    result = {
        "vendor": None,
        "date": None,
        "amount": None,
        "currency": "USD"
    }
    
    if len(parts) < 3:
        # Not enough parts, return with filename as vendor
        result["vendor"] = name_without_ext
        return result
    
    # First part is vendor
    result["vendor"] = parts[0]
    
    # Second part should be date (DD.MM.YYYY)
    date_pattern = r'\d{2}\.\d{2}\.\d{4}'
    if re.match(date_pattern, parts[1]):
        result["date"] = parts[1]
    
    # Third part should be amount
    if len(parts) >= 3:
        # Remove any currency symbols and spaces
        amount_str = parts[2].replace('$', '').replace('€', '').replace('£', '').strip()
        try:
            # Try to parse as float
            float(amount_str)
            result["amount"] = amount_str
        except ValueError:
            pass
    
    # Fourth part might be currency (if not USD default)
    if len(parts) >= 4 and len(parts[3]) == 3:
        result["currency"] = parts[3].upper()
    
    return result
