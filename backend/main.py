import logging
import os
import pathlib
import json
from fastapi import FastAPI, APIRouter, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Load dotenv only in development (Vercel injects env vars directly)
if os.getenv("ENVIRONMENT") != "production":
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # dotenv not available, which is fine in production

from databutton_app.mw.auth_mw import AuthConfig, get_authorized_user
from app.config import get_settings

# Rate limiter — keyed by client IP
limiter = Limiter(key_func=get_remote_address)


def get_router_config() -> dict:
    try:
        config_path = pathlib.Path(__file__).parent / "routers.json"
        cfg = json.loads(config_path.read_text())
    except Exception as e:
        logger.warning("Could not load routers.json: %s", e)
        return False
    return cfg


def is_auth_disabled(router_config: dict, name: str) -> bool:
    if not router_config or not isinstance(router_config, dict):
        return False  # Enable auth by default if no config
    return router_config.get("routers", {}).get(name, {}).get("disableAuth", False)


def import_api_routers() -> APIRouter:
    """Create top level router including all user defined endpoints."""
    routes = APIRouter(prefix="/routes")

    router_config = get_router_config()

    src_path = pathlib.Path(__file__).parent

    # Import API routers from "src/app/apis/*/__init__.py"
    apis_path = src_path / "app" / "apis"

    api_names = [
        p.relative_to(apis_path).parent.as_posix()
        for p in apis_path.glob("*/__init__.py")
    ]

    api_module_prefix = "app.apis."

    for name in api_names:
        logger.info("Importing API: %s", name)
        try:
            api_module = __import__(api_module_prefix + name, fromlist=[name])
            api_router = getattr(api_module, "router", None)
            if isinstance(api_router, APIRouter):
                logger.info("Registered router: %s (prefix: %s)", name, api_router.prefix)
                routes.include_router(
                    api_router,
                    dependencies=(
                        []
                        if is_auth_disabled(router_config, name)
                        else [Depends(get_authorized_user)]
                    ),
                )
            else:
                logger.warning("Module %s has no 'router' attribute or it's not an APIRouter", name)
        except Exception as e:
            logger.exception("Error importing %s", name)
            continue

    return routes


def get_supabase_auth_config() -> dict | None:
    """Get Supabase authentication configuration from environment variables."""
    settings = get_settings()

    # Check if Supabase JWT Secret is configured
    if not settings.SUPABASE_JWT_SECRET:
        logger.warning("SUPABASE_JWT_SECRET not configured - authentication will be disabled")
        return None

    # Supabase uses JWT Secret (HS256) for token validation
    # The JWT Secret can be found in: Supabase Dashboard → Settings → API → JWT Secret
    return {
        "jwt_secret": settings.SUPABASE_JWT_SECRET,
        "audience": "authenticated",
        "header": "Authorization",
        "algorithm": "HS256"
    }


def create_app() -> FastAPI:
    """Create the app. This is called by uvicorn with the factory option to construct the app object."""
    app = FastAPI(title="Smart Receipts API", version="1.0.0")

    # Configure rate limiting
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please try again later."},
        )

    # Configure CORS
    settings = get_settings()
    allowed_origins = [
        "https://smart-receipts.vercel.app",
        "https://receipts.orphanshands.org",
        "http://localhost:5173",
        "http://localhost:3000"
    ]
    if settings.FRONTEND_URL:
        allowed_origins.append(settings.FRONTEND_URL)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # Add root health check endpoint
    @app.get("/")
    async def root():
        return {"status": "ok", "service": "Smart Receipts API"}

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    app.include_router(import_api_routers())

    for route in app.routes:
        if hasattr(route, "methods"):
            for method in route.methods:
                logger.info("%s %s", method, route.path)

    # Configure Supabase authentication
    supabase_config = get_supabase_auth_config()

    if supabase_config is None:
        if settings.is_production():
            raise RuntimeError(
                "SUPABASE_JWT_SECRET is required in production. "
                "Set this environment variable before starting the server."
            )
        logger.warning("No Supabase auth config found - authentication will be disabled in development")
        app.state.auth_config = None
    else:
        logger.info("Supabase auth configured with JWT Secret (HS256) - User authentication enabled")
        app.state.auth_config = AuthConfig(**supabase_config)

    return app


app = create_app()
