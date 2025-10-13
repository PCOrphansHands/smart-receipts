import os
import pathlib
import json
from fastapi import FastAPI, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware

# Load dotenv only in development (Vercel injects env vars directly)
if os.getenv("ENVIRONMENT") != "production":
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # dotenv not available, which is fine in production

from databutton_app.mw.auth_mw import AuthConfig, get_authorized_user
from app.config import get_settings


def get_router_config() -> dict:
    try:
        config_path = pathlib.Path(__file__).parent / "routers.json"
        cfg = json.loads(config_path.read_text())
    except Exception as e:
        print(f"Warning: Could not load routers.json: {e}")
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
        print(f"Importing API: {name}")
        try:
            api_module = __import__(api_module_prefix + name, fromlist=[name])
            api_router = getattr(api_module, "router", None)
            if isinstance(api_router, APIRouter):
                routes.include_router(
                    api_router,
                    dependencies=(
                        []
                        if is_auth_disabled(router_config, name)
                        else [Depends(get_authorized_user)]
                    ),
                )
        except Exception as e:
            print(e)
            continue

    print(routes.routes)

    return routes


def get_supabase_auth_config() -> dict | None:
    """Get Supabase authentication configuration from environment variables."""
    supabase_url = os.environ.get("SUPABASE_URL")

    if not supabase_url:
        # Try to extract from DATABASE_URL if SUPABASE_URL is not set
        # DATABASE_URL format: postgresql://postgres:password@db.PROJECT_REF.supabase.co:5432/postgres
        database_url = os.environ.get("DATABASE_URL")
        if database_url and ".supabase.co" in database_url:
            # Extract project ref from database URL
            import re
            match = re.search(r'@db\.([^\.]+)\.supabase\.co', database_url)
            if match:
                project_ref = match.group(1)
                supabase_url = f"https://{project_ref}.supabase.co"

    if not supabase_url:
        print("No Supabase URL found in environment variables")
        return None

    # Supabase JWT configuration
    # JWKS endpoint for Supabase
    jwks_url = f"{supabase_url}/auth/v1/jwks"
    # Audience for Supabase JWT tokens (typically "authenticated")
    audience = "authenticated"

    return {
        "jwks_url": jwks_url,
        "audience": audience,
        "header": "authorization",
    }


def create_app() -> FastAPI:
    """Create the app. This is called by uvicorn with the factory option to construct the app object."""
    app = FastAPI(title="Smart Receipts API", version="1.0.0")

    # Configure CORS - allow all origins temporarily for debugging
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins temporarily
        allow_credentials=False,  # Must be False when allow_origins is ["*"]
        allow_methods=["*"],
        allow_headers=["*"],
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
                print(f"{method} {route.path}")

    # Configure Supabase authentication
    supabase_config = get_supabase_auth_config()

    if supabase_config is None:
        print("Warning: No Supabase auth config found - authentication will be disabled")
        app.state.auth_config = None
    else:
        print(f"Supabase auth configured with JWKS URL: {supabase_config['jwks_url']}")
        app.state.auth_config = AuthConfig(**supabase_config)

    return app


app = create_app()
