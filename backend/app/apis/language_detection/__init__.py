from fastapi import APIRouter, Request
from pydantic import BaseModel
import httpx

router = APIRouter()

class LanguageDetectionResponse(BaseModel):
    """Response containing detected language based on IP location"""
    language: str  # 'en', 'ro', 'uk'
    country: str | None = None
    detected_from_ip: bool = True

@router.get("/detect-language")
async def detect_language(request: Request) -> LanguageDetectionResponse:
    """
    Detect user's language based on their IP address location.
    Uses ipapi.co free tier for geolocation.
    
    Maps countries to languages:
    - Moldova, Romania → Romanian (ro)
    - Ukraine → Ukrainian (uk)
    - Others → English (en)
    """
    try:
        # Get client IP from request
        # Check X-Forwarded-For header first (for proxied requests)
        client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        if not client_ip:
            client_ip = request.headers.get("X-Real-IP", "")
        if not client_ip and request.client:
            client_ip = request.client.host
        
        print(f"Detecting language for IP: {client_ip}")
        
        # For local/private IPs, default to English
        if not client_ip or client_ip in ["127.0.0.1", "localhost", "::1"] or client_ip.startswith("192.168."):
            print("Local IP detected, defaulting to English")
            return LanguageDetectionResponse(
                language="en",
                country=None,
                detected_from_ip=False
            )
        
        # Call ipapi.co to get country
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://ipapi.co/{client_ip}/json/", timeout=5.0)
            
            if response.status_code == 200:
                data = response.json()
                country_code = data.get("country_code", "")
                country_name = data.get("country_name", "")
                
                print(f"IP {client_ip} is from {country_name} ({country_code})")
                
                # Map country to language
                language = "en"  # Default
                if country_code in ["MD", "RO"]:  # Moldova, Romania
                    language = "ro"
                elif country_code == "UA":  # Ukraine
                    language = "uk"
                
                return LanguageDetectionResponse(
                    language=language,
                    country=country_name,
                    detected_from_ip=True
                )
            else:
                print(f"ipapi.co returned status {response.status_code}")
                # Default to English if geolocation fails
                return LanguageDetectionResponse(
                    language="en",
                    country=None,
                    detected_from_ip=False
                )
                
    except Exception as e:
        print(f"Error detecting language from IP: {e}")
        import traceback
        traceback.print_exc()
        # Default to English on error
        return LanguageDetectionResponse(
            language="en",
            country=None,
            detected_from_ip=False
        )
