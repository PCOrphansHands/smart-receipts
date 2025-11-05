from fastapi import APIRouter
from pydantic import BaseModel
import requests
from app.config import get_settings

router = APIRouter(prefix="/diagnostics")


class AuthDiagnosticsResponse(BaseModel):
    """Response containing authentication diagnostics"""
    supabase_url_configured: bool
    supabase_url: str | None
    jwks_url: str | None
    jwks_accessible: bool
    jwks_error: str | None
    auth_enabled: bool


@router.get("/auth")
async def check_auth_config() -> AuthDiagnosticsResponse:
    """
    Check authentication configuration status.
    This endpoint does NOT require authentication.
    """
    settings = get_settings()

    supabase_url = settings.SUPABASE_URL
    supabase_url_configured = bool(supabase_url)

    jwks_url = None
    jwks_accessible = False
    jwks_error = None

    if supabase_url:
        jwks_url = f"{supabase_url}/auth/v1/jwks"

        # Try to access the JWKS endpoint
        try:
            response = requests.get(jwks_url, timeout=5)
            if response.status_code == 200:
                jwks_accessible = True
            else:
                jwks_error = f"HTTP {response.status_code}: {response.text[:200]}"
        except Exception as e:
            jwks_error = str(e)

    return AuthDiagnosticsResponse(
        supabase_url_configured=supabase_url_configured,
        supabase_url=supabase_url,
        jwks_url=jwks_url,
        jwks_accessible=jwks_accessible,
        jwks_error=jwks_error,
        auth_enabled=supabase_url_configured and jwks_accessible
    )
