from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from openai import OpenAI
import base64
import requests
from datetime import datetime
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError
import re
import io
from PIL import Image
from app.auth import AuthorizedUser
from app.libs.currency_converter import convert_amount
from app.config import get_secret

router = APIRouter(prefix="/receipt-extraction")

# Helper function to convert date format
def convert_date_format(date_str: str) -> str:
    """
    Convert date to YYYY_MM_DD format from various input formats.
    Handles both DD.MM.YYYY and MM/DD/YYYY formats.

    Args:
        date_str: Date in DD.MM.YYYY or MM/DD/YYYY format

    Returns:
        Date in YYYY_MM_DD format (e.g., "2024_12_25")
    """
    try:
        # Try splitting on dots (DD.MM.YYYY format)
        if '.' in date_str:
            parts = date_str.split('.')
            if len(parts) == 3:
                day, month, year = parts
                return f"{year}_{month}_{day}"

        # Try splitting on slashes (MM/DD/YYYY format - American)
        if '/' in date_str:
            parts = date_str.split('/')
            if len(parts) == 3:
                month, day, year = parts  # American format is MM/DD/YYYY
                return f"{year}_{month}_{day}"

        # Try splitting on dashes (YYYY-MM-DD or DD-MM-YYYY)
        if '-' in date_str:
            parts = date_str.split('-')
            if len(parts) == 3:
                # Check if it's YYYY-MM-DD (year is first)
                if len(parts[0]) == 4:
                    year, month, day = parts
                else:
                    day, month, year = parts
                return f"{year}_{month}_{day}"

        return date_str  # Return original if format doesn't match
    except Exception:
        return date_str  # Return original if conversion fails

# Response models
class ReceiptData(BaseModel):
    """Extracted receipt information"""
    vendor: str | None
    date: str | None  # Format: DD.MM.YYYY
    amount: str | None
    currency: str | None
    confidence: str  # high, medium, low
    raw_response: str | None = None
    # USD conversion fields (populated for non-USD receipts)
    usd_amount: str | None = None
    exchange_rate: float | None = None
    conversion_date: str | None = None

class ExtractReceiptRequest(BaseModel):
    """Request to extract receipt data from an image"""
    image_base64: str  # Base64 encoded image data
    
class ExtractReceiptResponse(BaseModel):
    """Response containing extracted receipt data"""
    success: bool
    data: ReceiptData | None
    error: str | None = None


class ProcessReceiptRequest(BaseModel):
    """Request to process a receipt from Gmail attachment"""
    email_id: str
    attachment_filename: str

class ProcessEmailBodyRequest(BaseModel):
    """Request to process an email body as a receipt"""
    email_id: str
    email_date: str | None = None  # Fallback date if not found in receipt (DD.MM.YYYY format)

class ProcessReceiptResponse(BaseModel):
    """Response from processing a Gmail receipt attachment"""
    success: bool
    receipt_data: ReceiptData | None
    error: str | None = None
    suggested_filename: str | None = None  # VENDOR_YYYY_MM_DD_Total format
    pdf_content: str | None = None  # Base64 encoded PDF content for upload

class UploadedReceiptResponse(BaseModel):
    success: bool
    receipt_data: ReceiptData | None = None
    error: str | None = None
    suggested_filename: str | None = None
    pdf_content: str | None = None  # Base64 encoded PDF for upload
    original_filename: str | None = None

@router.post("/process-gmail-receipt")
async def process_gmail_receipt(request: ProcessReceiptRequest, user: AuthorizedUser) -> ProcessReceiptResponse:
    """
    Download a receipt attachment from Gmail and extract its data.
    Returns extracted data and suggested filename in format: VENDOR_YYYY_MM_DD_Total

    Args:
        request: email_id and attachment_filename from Gmail

    Returns:
        Extracted receipt data and suggested filename for storage
    """
    try:
        # Import Gmail service helper
        from app.apis.gmail import get_gmail_service
        from googleapiclient.errors import HttpError
        
        service = await get_gmail_service(user)
        
        # Get the full message to find the attachment
        message = service.users().messages().get(
            userId='me',
            id=request.email_id
        ).execute()
        
        # Find the attachment by filename
        attachment_id = None
        attachment_mime_type = None
        
        if 'parts' in message['payload']:
            for part in message['payload']['parts']:
                if part.get('filename') == request.attachment_filename:
                    attachment_id = part['body'].get('attachmentId')
                    attachment_mime_type = part.get('mimeType', '')
                    break
        
        if not attachment_id:
            return ProcessReceiptResponse(
                success=False,
                receipt_data=None,
                error=f"Attachment '{request.attachment_filename}' not found in email",
                suggested_filename=None,
                pdf_content=None
            )
        
        # Download the attachment
        attachment = service.users().messages().attachments().get(
            userId='me',
            messageId=request.email_id,
            id=attachment_id
        ).execute()
        
        # Decode attachment data
        file_data = base64.urlsafe_b64decode(attachment['data'])
        
        # Store PDF content for upload
        pdf_content_base64 = None
        
        # Handle different file types
        image_base64 = None
        
        if attachment_mime_type.startswith('image/'):
            # Direct image - just encode to base64
            image_base64 = base64.b64encode(file_data).decode('utf-8')
            
            # Convert image to PDF for upload
            from PIL import Image
            import io
            try:
                img = Image.open(io.BytesIO(file_data))
                pdf_buffer = io.BytesIO()
                img.convert('RGB').save(pdf_buffer, format='PDF')
                pdf_content_base64 = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
            except Exception as e:
                print(f"Warning: Could not convert image to PDF: {e}")
            
        elif attachment_mime_type == 'application/pdf':
            # PDF - store original for upload
            pdf_content_base64 = base64.b64encode(file_data).decode('utf-8')

            # Convert first page to image for OpenAI Vision using PyMuPDF
            try:
                import fitz  # PyMuPDF
                pdf_doc = fitz.open(stream=file_data, filetype="pdf")
                first_page = pdf_doc[0]
                pix = first_page.get_pixmap(dpi=150)
                img_data = pix.tobytes("png")
                image_base64 = base64.b64encode(img_data).decode('utf-8')
                attachment_mime_type = 'image/png'  # Update mime type for OpenAI
                pdf_doc.close()
            except Exception as e:
                return ProcessReceiptResponse(
                    success=False,
                    receipt_data=None,
                    error=f"PDF conversion failed: {str(e)}",
                    suggested_filename=None,
                    pdf_content=None
                )
        else:
            return ProcessReceiptResponse(
                success=False,
                receipt_data=None,
                error=f"Unsupported file type: {attachment_mime_type}. Only images and PDFs are supported.",
                suggested_filename=None,
                pdf_content=None
            )
        
        # Extract receipt data using OpenAI Vision
        client = OpenAI(api_key=get_secret("OPENAI_API_KEY"))
        
        prompt = """
        Analyze this receipt image and extract the following information:
        1. Vendor/Merchant name (the business that received the payment)
        2. Payment date (in DD.MM.YYYY format)
        3. Total amount paid (the final total, not subtotal)
        4. Currency (e.g., USD, EUR, GBP)
        
        Respond in the following JSON format:
        {
            "vendor": "Business Name",
            "date": "DD.MM.YYYY",
            "amount": "123.45",
            "currency": "USD",
            "confidence": "high/medium/low"
        }
        
        If you cannot find any of these fields, set them to null.
        Set confidence to:
        - "high" if all fields are clearly visible
        - "medium" if some fields are unclear but inferable
        - "low" if multiple fields are missing or unclear
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{attachment_mime_type};base64,{image_base64}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
        )
        
        raw_response = response.choices[0].message.content
        print(f"OpenAI Vision response: {raw_response}")
        
        # Parse the JSON response
        import json
        try:
            # Extract JSON from response
            if "```json" in raw_response:
                json_str = raw_response.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_response:
                json_str = raw_response.split("```")[1].split("```")[0].strip()
            else:
                json_str = raw_response.strip()
            
            parsed_data = json.loads(json_str)
            
            receipt_data = ReceiptData(
                vendor=parsed_data.get("vendor"),
                date=parsed_data.get("date"),
                amount=parsed_data.get("amount"),
                currency=parsed_data.get("currency"),
                confidence=parsed_data.get("confidence", "low"),
                raw_response=raw_response
            )
            
            # Use email date as fallback if no date found in receipt
            if not receipt_data.date and request.email_date:
                receipt_data.date = request.email_date
                print(f"Using email date as fallback: {request.email_date}")
            
            # Convert to USD if currency is not USD
            if receipt_data.currency and receipt_data.currency.upper() != 'USD' and receipt_data.amount and receipt_data.date:
                print(f"Non-USD currency detected: {receipt_data.currency}. Converting to USD...")
                conversion_result = convert_amount(
                    receipt_data.amount,
                    receipt_data.currency.upper(),
                    'USD',
                    receipt_data.date
                )
                
                if conversion_result:
                    receipt_data.usd_amount = str(conversion_result['converted_amount'])
                    receipt_data.exchange_rate = conversion_result['exchange_rate']
                    receipt_data.conversion_date = conversion_result['date']
                    print(f"Converted: {receipt_data.amount} {receipt_data.currency} = {receipt_data.usd_amount} USD")
                else:
                    print(f"Warning: Could not convert {receipt_data.currency} to USD")
            
            # Generate suggested filename: VENDOR_YYYY_MM_DD_Total
            suggested_filename = None
            if receipt_data.vendor and receipt_data.date and receipt_data.amount:
                # Clean vendor name (remove special characters and spaces, convert to uppercase)
                clean_vendor = "".join(c for c in receipt_data.vendor if c.isalnum())
                clean_vendor = clean_vendor.upper()

                # Convert date from DD.MM.YYYY to YYYY_MM_DD
                formatted_date = convert_date_format(receipt_data.date)

                # Get file extension from original
                extension = request.attachment_filename.split('.')[-1] if '.' in request.attachment_filename else 'jpg'

                suggested_filename = f"{clean_vendor}_{formatted_date}_{receipt_data.amount}.{extension}"
            
            return ProcessReceiptResponse(
                success=True,
                receipt_data=receipt_data,
                error=None,
                suggested_filename=suggested_filename,
                pdf_content=pdf_content_base64
            )
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            return ProcessReceiptResponse(
                success=False,
                receipt_data=ReceiptData(
                    vendor=None,
                    date=None,
                    amount=None,
                    currency=None,
                    confidence="low",
                    raw_response=raw_response
                ),
                error=f"Failed to parse AI response: {str(e)}",
                suggested_filename=None,
                pdf_content=None
            )
            
    except HttpError as e:
        return ProcessReceiptResponse(
            success=False,
            receipt_data=None,
            error=f"Gmail API error: {str(e)}",
            suggested_filename=None,
            pdf_content=None
        )
    except Exception as e:
        print(f"Error processing receipt: {e}")
        import traceback
        traceback.print_exc()
        return ProcessReceiptResponse(
            success=False,
            receipt_data=None,
            error=str(e),
            suggested_filename=None,
            pdf_content=None
        )

@router.post("/process-email-body")
async def process_email_body(request: ProcessEmailBodyRequest, user: AuthorizedUser) -> ProcessReceiptResponse:
    """
    Convert an email body to PDF and extract receipt data from it.
    For emails that don't have attachments but contain receipt info in the body.
    
    Args:
        request: email_id to process
        
    Returns:
        Extracted receipt data and suggested filename for storage
    """
    try:
        # Import required libraries for HTML to PDF conversion
        from app.apis.gmail import get_gmail_service
        from googleapiclient.errors import HttpError
        import io
        from playwright.async_api import async_playwright

        service = await get_gmail_service(user)
        
        # Get the full message to extract HTML body and inline images
        message = service.users().messages().get(
            userId='me',
            id=request.email_id,
            format='full'
        ).execute()

        # Extract inline images (for CID references)
        inline_images = {}

        def extract_inline_images(payload):
            """Recursively extract inline images from email payload"""
            if 'parts' in payload:
                for part in payload['parts']:
                    # Check if this is an inline image
                    if part.get('mimeType', '').startswith('image/'):
                        # Get Content-ID header
                        headers = part.get('headers', [])
                        content_id = None
                        for header in headers:
                            if header['name'].lower() == 'content-id':
                                # Content-ID is like <image001@example.com>, strip < and >
                                content_id = header['value'].strip('<>')
                                break

                        # Get image data
                        body = part.get('body', {})
                        if body.get('attachmentId'):
                            # Need to download attachment
                            try:
                                attachment = service.users().messages().attachments().get(
                                    userId='me',
                                    messageId=request.email_id,
                                    id=body['attachmentId']
                                ).execute()
                                img_data = base64.urlsafe_b64decode(attachment['data'])
                                img_base64 = base64.b64encode(img_data).decode('utf-8')
                                mime_type = part.get('mimeType', 'image/jpeg')

                                if content_id:
                                    inline_images[content_id] = f"data:{mime_type};base64,{img_base64}"
                            except Exception as e:
                                print(f"Error downloading inline image: {e}")
                        elif body.get('data'):
                            img_data = base64.urlsafe_b64decode(body['data'])
                            img_base64 = base64.b64encode(img_data).decode('utf-8')
                            mime_type = part.get('mimeType', 'image/jpeg')

                            if content_id:
                                inline_images[content_id] = f"data:{mime_type};base64,{img_base64}"

                    # Recursively check nested parts
                    extract_inline_images(part)

        extract_inline_images(message['payload'])
        print(f"Found {len(inline_images)} inline images")

        # Extract HTML body
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
            elif payload.get('mimeType') == 'text/plain':
                # Fallback to plain text if no HTML found
                data = payload['body'].get('data')
                if data:
                    text = base64.urlsafe_b64decode(data).decode('utf-8')
                    return f'<html><body><pre style="white-space: pre-wrap; font-family: sans-serif;">{text}</pre></body></html>'
            return None

        html_content = get_body(message['payload'])

        # Replace CID references with base64 data URLs
        if html_content and inline_images:
            import re
            for cid, data_url in inline_images.items():
                # Replace cid: references
                html_content = html_content.replace(f'cid:{cid}', data_url)
                # Also try without cid: prefix (some emails use just the ID)
                html_content = re.sub(f'src=["\']?{re.escape(cid)}["\']?', f'src="{data_url}"', html_content)
            print(f"Replaced {len(inline_images)} CID references in HTML")

        if not html_content:
            return ProcessReceiptResponse(
                success=False,
                receipt_data=None,
                error="No email body content found",
                suggested_filename=None,
                pdf_content=None
            )

        # Convert HTML to PDF using Playwright (high quality, preserves formatting)
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch()
                page = await browser.new_page()

                # Set viewport to a standard email width
                await page.set_viewport_size({"width": 800, "height": 1200})

                # Set content with longer timeout for images to load
                await page.set_content(html_content, wait_until='networkidle', timeout=30000)

                # Wait a bit more for lazy-loaded images and dynamic content
                await page.wait_for_timeout(2000)

                # Try to load all images by evaluating them
                try:
                    await page.evaluate("""
                        () => {
                            return Promise.all(
                                Array.from(document.images)
                                    .filter(img => !img.complete)
                                    .map(img => new Promise(resolve => {
                                        img.onload = img.onerror = resolve;
                                    }))
                            );
                        }
                    """)
                except:
                    pass  # If image loading fails, continue anyway

                # Generate PDF with good settings for receipts
                pdf_data = await page.pdf(
                    format='A4',
                    print_background=True,
                    prefer_css_page_size=False,
                    display_header_footer=False,
                    margin={'top': '20px', 'right': '20px', 'bottom': '20px', 'left': '20px'}
                )

                await browser.close()
        except Exception as e:
            return ProcessReceiptResponse(
                success=False,
                receipt_data=None,
                error=f"Failed to convert email HTML to PDF: {str(e)}",
                suggested_filename=None,
                pdf_content=None
            )
        
        # Store PDF content for upload
        pdf_content_base64 = base64.b64encode(pdf_data).decode('utf-8')

        # Convert PDF to image (first page) using PyMuPDF
        try:
            import fitz  # PyMuPDF
            pdf_doc = fitz.open(stream=pdf_data, filetype="pdf")
            first_page = pdf_doc[0]
            pix = first_page.get_pixmap(dpi=150)
            img_data = pix.tobytes("png")
            image_base64 = base64.b64encode(img_data).decode('utf-8')
            pdf_doc.close()
        except Exception as e:
            return ProcessReceiptResponse(
                success=False,
                receipt_data=None,
                error=f"Failed to convert email PDF to image: {str(e)}",
                suggested_filename=None,
                pdf_content=None
            )
        
        # Extract receipt data using OpenAI Vision
        client = OpenAI(api_key=get_secret("OPENAI_API_KEY"))
        
        prompt = """
Analyze this receipt image and extract the following information:
1. Vendor/Merchant name (the business that received the payment)
2. Payment date (in DD.MM.YYYY format)
3. Total amount paid (the final total, not subtotal)
4. Currency (e.g., USD, EUR, GBP)

Respond in the following JSON format:
{
    "vendor": "Business Name",
    "date": "DD.MM.YYYY",
    "amount": "123.45",
    "currency": "USD",
    "confidence": "high/medium/low"
}

If you cannot find any of these fields, set them to null.
Set confidence to:
- "high" if all fields are clearly visible
- "medium" if some fields are unclear but inferable
- "low" if multiple fields are missing or unclear
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_base64}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
        )
        
        raw_response = response.choices[0].message.content
        print(f"OpenAI Vision response for email body: {raw_response}")
        
        # Parse the JSON response
        import json
        try:
            # Extract JSON from response
            if "```json" in raw_response:
                json_str = raw_response.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_response:
                json_str = raw_response.split("```")[1].split("```")[0].strip()
            else:
                json_str = raw_response.strip()
            
            parsed_data = json.loads(json_str)
            
            receipt_data = ReceiptData(
                vendor=parsed_data.get("vendor"),
                date=parsed_data.get("date"),
                amount=parsed_data.get("amount"),
                currency=parsed_data.get("currency"),
                confidence=parsed_data.get("confidence", "low"),
                raw_response=raw_response
            )
            
            # Use email date as fallback if no date found in receipt
            if not receipt_data.date and request.email_date:
                receipt_data.date = request.email_date
                print(f"Using email date as fallback: {request.email_date}")
            
            # Convert to USD if currency is not USD
            if receipt_data.currency and receipt_data.currency.upper() != 'USD' and receipt_data.amount and receipt_data.date:
                print(f"Non-USD currency detected: {receipt_data.currency}. Converting to USD...")
                conversion_result = convert_amount(
                    receipt_data.amount,
                    receipt_data.currency.upper(),
                    'USD',
                    receipt_data.date
                )
                
                if conversion_result:
                    receipt_data.usd_amount = str(conversion_result['converted_amount'])
                    receipt_data.exchange_rate = conversion_result['exchange_rate']
                    receipt_data.conversion_date = conversion_result['date']
                    print(f"Converted: {receipt_data.amount} {receipt_data.currency} = {receipt_data.usd_amount} USD")
                else:
                    print(f"Warning: Could not convert {receipt_data.currency} to USD")
            
            # Generate suggested filename: VENDOR_YYYY_MM_DD_Total
            suggested_filename = None
            if receipt_data.vendor and receipt_data.date and receipt_data.amount:
                # Clean vendor name (remove special characters and spaces, convert to uppercase)
                clean_vendor = "".join(c for c in receipt_data.vendor if c.isalnum())
                clean_vendor = clean_vendor.upper()

                # Convert date from DD.MM.YYYY to YYYY_MM_DD
                formatted_date = convert_date_format(receipt_data.date)

                suggested_filename = f"{clean_vendor}_{formatted_date}_{receipt_data.amount}.pdf"
            
            return ProcessReceiptResponse(
                success=True,
                receipt_data=receipt_data,
                error=None,
                suggested_filename=suggested_filename,
                pdf_content=pdf_content_base64
            )
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            return ProcessReceiptResponse(
                success=False,
                receipt_data=ReceiptData(
                    vendor=None,
                    date=None,
                    amount=None,
                    currency=None,
                    confidence="low",
                    raw_response=raw_response
                ),
                error=f"Failed to parse AI response: {str(e)}",
                suggested_filename=None,
                pdf_content=None
            )
            
    except HttpError as e:
        return ProcessReceiptResponse(
            success=False,
            receipt_data=None,
            error=f"Gmail API error: {str(e)}",
            suggested_filename=None,
            pdf_content=None
        )
    except Exception as e:
        print(f"Error processing email body: {e}")
        import traceback
        traceback.print_exc()
        return ProcessReceiptResponse(
            success=False,
            receipt_data=None,
            error=str(e),
            suggested_filename=None,
            pdf_content=None
        )

@router.post("/extract-receipt-data")
async def extract_receipt_data(request: ExtractReceiptRequest) -> ExtractReceiptResponse:
    """
    Extract vendor, date, and amount from a receipt image using OpenAI Vision.
    
    Args:
        request: Contains the base64 encoded image data of the receipt
        
    Returns:
        Structured receipt data including vendor, date, amount, and confidence level
    """
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=get_secret("OPENAI_API_KEY"))
        
        # Create the prompt for GPT-4 Vision
        prompt = """
        Analyze this receipt image and extract the following information:
        1. Vendor/Merchant name (the business that received the payment)
        2. Payment date (in DD.MM.YYYY format)
        3. Total amount paid (the final total, not subtotal)
        4. Currency (e.g., USD, EUR, GBP)
        
        Respond in the following JSON format:
        {
            "vendor": "Business Name",
            "date": "DD.MM.YYYY",
            "amount": "123.45",
            "currency": "USD",
            "confidence": "high/medium/low"
        }
        
        If you cannot find any of these fields, set them to null.
        Set confidence to:
        - "high" if all fields are clearly visible
        - "medium" if some fields are unclear but inferable
        - "low" if multiple fields are missing or unclear
        """
        
        # Call OpenAI Vision API with base64 image
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{request.image_base64}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
        )
        
        # Extract the response
        raw_response = response.choices[0].message.content
        print(f"OpenAI Vision response: {raw_response}")
        
        # Parse the JSON response
        import json
        try:
            # Try to extract JSON from the response
            # Sometimes the model wraps JSON in markdown code blocks
            if "```json" in raw_response:
                json_str = raw_response.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_response:
                json_str = raw_response.split("```")[1].split("```")[0].strip()
            else:
                json_str = raw_response.strip()
            
            parsed_data = json.loads(json_str)
            
            receipt_data = ReceiptData(
                vendor=parsed_data.get("vendor"),
                date=parsed_data.get("date"),
                amount=parsed_data.get("amount"),
                currency=parsed_data.get("currency"),
                confidence=parsed_data.get("confidence", "low"),
                raw_response=raw_response
            )
            
            return ExtractReceiptResponse(
                success=True,
                data=receipt_data,
                error=None
            )
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            print(f"Raw response: {raw_response}")
            
            # Return with low confidence and raw response
            return ExtractReceiptResponse(
                success=False,
                data=ReceiptData(
                    vendor=None,
                    date=None,
                    amount=None,
                    currency=None,
                    confidence="low",
                    raw_response=raw_response
                ),
                error=f"Failed to parse response: {str(e)}"
            )
            
    except Exception as e:
        print(f"Error extracting receipt data: {e}")
        return ExtractReceiptResponse(
            success=False,
            data=None,
            error=str(e)
        )

@router.post("/process-uploaded-receipt")
async def process_uploaded_receipt(file: UploadFile = File(...)) -> UploadedReceiptResponse:
    """
    Process an uploaded receipt file (PDF or image).
    Extracts vendor, date, and amount, and returns suggested filename.
    
    Args:
        file: Uploaded receipt file (PDF or image)
        
    Returns:
        Extracted receipt data, suggested filename, and base64 PDF content
    """
    try:
        print(f"Processing uploaded file: {file.filename}, type: {file.content_type}")
        
        # Read file content
        file_content = await file.read()
        
        # Check file type and convert to base64 image for processing
        if file.content_type == 'application/pdf':
            # For PDFs, convert first page to image
            try:
                import fitz  # PyMuPDF
                pdf_doc = fitz.open(stream=file_content, filetype="pdf")
                first_page = pdf_doc[0]
                pix = first_page.get_pixmap(dpi=150)
                img_data = pix.tobytes("png")
                image_base64 = base64.b64encode(img_data).decode('utf-8')
                pdf_content_base64 = base64.b64encode(file_content).decode('utf-8')
                pdf_doc.close()
            except Exception as e:
                print(f"Error converting PDF to image: {e}")
                return UploadedReceiptResponse(
                    success=False,
                    error=f"Failed to process PDF: {str(e)}",
                    original_filename=file.filename
                )
        elif file.content_type in ['image/jpeg', 'image/png', 'image/jpg']:
            # For images, use directly
            image_base64 = base64.b64encode(file_content).decode('utf-8')
            # Convert image to PDF for Dropbox upload
            try:
                img = Image.open(io.BytesIO(file_content))
                pdf_buffer = io.BytesIO()
                img_rgb = img.convert('RGB')
                img_rgb.save(pdf_buffer, format='PDF')
                pdf_content_base64 = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
            except Exception as e:
                print(f"Error converting image to PDF: {e}")
                pdf_content_base64 = None
        else:
            return UploadedReceiptResponse(
                success=False,
                error=f"Unsupported file type: {file.content_type}",
                original_filename=file.filename
            )
        
        # Extract receipt data using OpenAI Vision
        client = OpenAI(api_key=get_secret("OPENAI_API_KEY"))
        
        prompt = """
        Analyze this receipt image and extract the following information:
        1. Vendor/Merchant name (the business that received the payment)
        2. Payment date (in DD.MM.YYYY format)
        3. Total amount paid (the final total, not subtotal)
        4. Currency (e.g., USD, EUR, GBP)
        
        Respond in the following JSON format:
        {
            "vendor": "Business Name",
            "date": "DD.MM.YYYY",
            "amount": "123.45",
            "currency": "USD",
            "confidence": "high/medium/low"
        }
        
        If you cannot find any of these fields, set them to null.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
        )
        
        raw_response = response.choices[0].message.content
        print(f"OpenAI Vision response: {raw_response}")
        
        # Parse JSON response
        import json
        try:
            if "```json" in raw_response:
                json_str = raw_response.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_response:
                json_str = raw_response.split("```")[1].split("```")[0].strip()
            else:
                json_str = raw_response.strip()
            
            parsed_data = json.loads(json_str)
            
            receipt_data = ReceiptData(
                vendor=parsed_data.get("vendor"),
                date=parsed_data.get("date"),
                amount=parsed_data.get("amount"),
                currency=parsed_data.get("currency"),
                confidence=parsed_data.get("confidence", "medium"),
                raw_response=raw_response
            )
            
            # Convert to USD if currency is not USD
            if receipt_data.currency and receipt_data.currency.upper() != 'USD' and receipt_data.amount and receipt_data.date:
                print(f"Non-USD currency detected: {receipt_data.currency}. Converting to USD...")
                conversion_result = convert_amount(
                    receipt_data.amount,
                    receipt_data.currency.upper(),
                    'USD',
                    receipt_data.date
                )
                
                if conversion_result:
                    receipt_data.usd_amount = str(conversion_result['converted_amount'])
                    receipt_data.exchange_rate = conversion_result['exchange_rate']
                    receipt_data.conversion_date = conversion_result['date']
                    print(f"Converted: {receipt_data.amount} {receipt_data.currency} = {receipt_data.usd_amount} USD")
                else:
                    print(f"Warning: Could not convert {receipt_data.currency} to USD")
            
            # Generate suggested filename: VENDOR_YYYY_MM_DD_Total.pdf
            suggested_filename = None
            if receipt_data.vendor and receipt_data.date and receipt_data.amount:
                # Clean vendor name (remove special characters and spaces, convert to uppercase)
                # Match the Gmail naming convention exactly
                clean_vendor = "".join(c for c in receipt_data.vendor if c.isalnum())
                clean_vendor = clean_vendor.upper()

                # Convert date from DD.MM.YYYY to YYYY_MM_DD
                formatted_date = convert_date_format(receipt_data.date)

                suggested_filename = f"{clean_vendor}_{formatted_date}_{receipt_data.amount}.pdf"
                print(f"Suggested filename: {suggested_filename}")
            
            return UploadedReceiptResponse(
                success=True,
                receipt_data=receipt_data,
                suggested_filename=suggested_filename,
                pdf_content=pdf_content_base64,
                original_filename=file.filename
            )
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            return UploadedReceiptResponse(
                success=False,
                error=f"Failed to extract receipt data: {str(e)}",
                original_filename=file.filename
            )
            
    except Exception as e:
        print(f"Error processing uploaded file: {e}")
        import traceback
        traceback.print_exc()
        return UploadedReceiptResponse(
            success=False,
            error=str(e),
            original_filename=file.filename
        )
