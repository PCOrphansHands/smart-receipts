import functools
from http import HTTPStatus
from typing import Annotated, Callable
import jwt
from fastapi import Depends, HTTPException, WebSocket, WebSocketException, status
from fastapi.requests import HTTPConnection
from jwt import PyJWKClient
from pydantic import BaseModel
from starlette.requests import Request


class AuthConfig(BaseModel):
    jwks_url: str | None = None
    jwt_secret: str | None = None
    audience: str
    header: str
    algorithm: str = "RS256"  # RS256 for JWKS, HS256 for JWT Secret


class User(BaseModel):
    # The subject, or user ID, from the authenticated token
    sub: str

    # Optional extra user data
    user_id: str | None = None
    name: str | None = None
    picture: str | None = None
    email: str | None = None


def get_auth_config(request: HTTPConnection) -> AuthConfig:
    auth_config: AuthConfig | None = request.app.state.auth_config

    if auth_config is None:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED, detail="No auth config"
        )
    return auth_config


AuthConfigDep = Annotated[AuthConfig, Depends(get_auth_config)]


def get_audit_log(request: HTTPConnection) -> Callable[[str], None] | None:
    return getattr(request.app.state.databutton_app_state, "audit_log", None)


AuditLogDep = Annotated[Callable[[str], None] | None, Depends(get_audit_log)]


def get_authorized_user(
    request: HTTPConnection,
) -> User:
    try:
        auth_config = get_auth_config(request)
    except HTTPException:
        # Auth not configured - return dummy user for development
        print("Auth not configured, using anonymous user")
        return User(sub="anonymous", user_id="anonymous")

    try:
        if isinstance(request, WebSocket):
            user = authorize_websocket(request, auth_config)
        elif isinstance(request, Request):
            user = authorize_request(request, auth_config)
        else:
            raise ValueError("Unexpected request type")

        if user is not None:
            return user
        print("Request authentication returned no user")
    except Exception as e:
        print(f"Request authentication failed: {e}")

    if isinstance(request, WebSocket):
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION, reason="Not authenticated"
        )
    else:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED, detail="Not authenticated"
        )


@functools.cache
def get_jwks_client(url: str):
    """Reuse client cached by its url, client caches keys by default."""
    return PyJWKClient(url, cache_keys=True)


def get_signing_key(url: str, token: str) -> tuple[str, str]:
    client = get_jwks_client(url)
    signing_key = client.get_signing_key_from_jwt(token)
    key = signing_key.key
    alg = signing_key.algorithm_name
    if alg != "RS256":
        raise ValueError(f"Unsupported signing algorithm: {alg}")
    return (key, alg)


def authorize_websocket(
    request: WebSocket,
    auth_config: AuthConfig,
) -> User | None:
    # Parse Sec-Websocket-Protocol
    header = "Sec-Websocket-Protocol"
    sep = ","
    prefix = "Authorization.Bearer."
    protocols_header = request.headers.get(header)
    protocols = (
        [h.strip() for h in protocols_header.split(sep)] if protocols_header else []
    )

    token: str | None = None
    for p in protocols:
        if p.startswith(prefix):
            token = p.removeprefix(prefix)
            break

    if not token:
        print(f"Missing bearer {prefix}.<token> in protocols")
        return None

    return authorize_token(token, auth_config)


def authorize_request(
    request: Request,
    auth_config: AuthConfig,
) -> User | None:
    auth_header = request.headers.get(auth_config.header)
    if not auth_header:
        print(f"Missing header '{auth_config.header}'")
        return None

    token = auth_header.startswith("Bearer ") and auth_header[7:]
    if not token:
        print(f"Missing bearer token in '{auth_config.header}'")
        return None

    return authorize_token(token, auth_config)


def authorize_token(
    token: str,
    auth_config: AuthConfig,
) -> User | None:
    payload = None

    # Try JWT Secret first (for Supabase HS256)
    if auth_config.jwt_secret:
        try:
            payload = jwt.decode(
                token,
                key=auth_config.jwt_secret,
                algorithms=["HS256"],
                audience=auth_config.audience,
                options={"verify_aud": False}  # Supabase tokens don't always have audience
            )
            print(f"Token validated using JWT Secret (HS256)")
        except jwt.PyJWTError as e:
            print(f"Failed to decode token with JWT Secret: {e}")

    # If JWT Secret didn't work, try JWKS (for RS256)
    if payload is None and auth_config.jwks_url:
        try:
            key, alg = get_signing_key(auth_config.jwks_url, token)
            payload = jwt.decode(
                token,
                key=key,
                algorithms=[alg],
                audience=auth_config.audience,
            )
            print(f"Token validated using JWKS (RS256)")
        except Exception as e:
            print(f"Failed to decode token with JWKS: {e}")

    if payload is None:
        return None

    try:
        user = User.model_validate(payload)
        print(f"User {user.sub} authenticated")
        return user
    except Exception as e:
        print(f"Failed to parse token payload {e}")
        return None
