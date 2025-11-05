from fastapi import APIRouter, Header
from pydantic import BaseModel
from app.config import get_settings
import jwt
from typing import Optional

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


class TokenDebugResponse(BaseModel):
    """Debug information about a JWT token"""
    has_token: bool
    token_header: dict | None = None
    token_payload_unverified: dict | None = None
    validation_error: str | None = None
    validation_success: bool = False
    user_id: str | None = None


@router.get("/debug-token")
async def debug_token(authorization: Optional[str] = Header(None)) -> TokenDebugResponse:
    """
    Debug endpoint to check JWT token validation.
    Send your Authorization header and this will show why validation fails.
    This endpoint does NOT require authentication.
    """
    if not authorization:
        return TokenDebugResponse(
            has_token=False,
            validation_error="No Authorization header provided"
        )

    # Extract token from "Bearer <token>"
    if not authorization.startswith("Bearer "):
        return TokenDebugResponse(
            has_token=False,
            validation_error="Authorization header must start with 'Bearer '"
        )

    token = authorization[7:]  # Remove "Bearer " prefix

    # Decode token header without validation
    try:
        header = jwt.get_unverified_header(token)
    except Exception as e:
        return TokenDebugResponse(
            has_token=True,
            validation_error=f"Failed to decode token header: {str(e)}"
        )

    # Decode token payload without validation
    try:
        payload_unverified = jwt.decode(token, options={"verify_signature": False})
    except Exception as e:
        return TokenDebugResponse(
            has_token=True,
            token_header=header,
            validation_error=f"Failed to decode token payload: {str(e)}"
        )

    # Try to validate with JWT Secret
    settings = get_settings()
    jwt_secret = settings.SUPABASE_JWT_SECRET

    if not jwt_secret:
        return TokenDebugResponse(
            has_token=True,
            token_header=header,
            token_payload_unverified=payload_unverified,
            validation_error="JWT_SECRET not configured on server"
        )

    # Try validation with audience check disabled
    try:
        payload_verified = jwt.decode(
            token,
            key=jwt_secret,
            algorithms=["HS256", "HS384", "HS512"],
            options={"verify_aud": False}
        )

        return TokenDebugResponse(
            has_token=True,
            token_header=header,
            token_payload_unverified=payload_unverified,
            validation_success=True,
            user_id=payload_verified.get("sub")
        )
    except Exception as e:
        return TokenDebugResponse(
            has_token=True,
            token_header=header,
            token_payload_unverified=payload_unverified,
            validation_error=f"Token validation failed: {str(e)}"
        )
