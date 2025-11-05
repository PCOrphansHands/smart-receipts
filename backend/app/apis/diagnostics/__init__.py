from fastapi import APIRouter
from pydantic import BaseModel
from app.config import get_settings

router = APIRouter(prefix="/diagnostics")


class AuthDiagnosticsResponse(BaseModel):
    """Response containing authentication diagnostics"""
    jwt_secret_configured: bool
    jwt_secret_length: int | None
    auth_method: str  # "JWT_SECRET" or "JWKS" or "NONE"
    auth_enabled: bool
    info: str


@router.get("/auth")
async def check_auth_config() -> AuthDiagnosticsResponse:
    """
    Check authentication configuration status.
    This endpoint does NOT require authentication.
    """
    settings = get_settings()

    jwt_secret = settings.SUPABASE_JWT_SECRET
    jwt_secret_configured = bool(jwt_secret)
    jwt_secret_length = len(jwt_secret) if jwt_secret else None

    auth_method = "NONE"
    auth_enabled = False
    info = ""

    if jwt_secret_configured:
        auth_method = "JWT_SECRET"
        auth_enabled = True
        info = "Supabase authentication configured using JWT Secret (HS256). Each user will have isolated access."
    else:
        info = "Authentication disabled. Set SUPABASE_JWT_SECRET environment variable to enable user isolation."

    return AuthDiagnosticsResponse(
        jwt_secret_configured=jwt_secret_configured,
        jwt_secret_length=jwt_secret_length,
        auth_method=auth_method,
        auth_enabled=auth_enabled,
        info=info
    )
