"""
Configuration management for Smart Receipts backend.
Replaces Databutton secrets with standard environment variables.
"""
import os
from typing import Optional
from functools import lru_cache


class Settings:
    """Application settings loaded from environment variables."""

    # API Keys
    OPENAI_API_KEY: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    DROPBOX_APP_KEY: str
    DROPBOX_APP_SECRET: str
    STACK_SECRET_SERVER_KEY: str

    # Database
    DATABASE_URL: Optional[str] = None

    # Application URLs
    FRONTEND_URL: str
    BACKEND_URL: str

    # Environment
    ENVIRONMENT: str = "development"

    def __init__(self):
        """Load settings from environment variables."""
        # API Keys (required)
        self.OPENAI_API_KEY = self._get_required("OPENAI_API_KEY")
        self.GOOGLE_CLIENT_ID = self._get_required("GOOGLE_CLIENT_ID")
        self.GOOGLE_CLIENT_SECRET = self._get_required("GOOGLE_CLIENT_SECRET")
        self.DROPBOX_APP_KEY = self._get_required("DROPBOX_APP_KEY")
        self.DROPBOX_APP_SECRET = self._get_required("DROPBOX_APP_SECRET")
        self.STACK_SECRET_SERVER_KEY = self._get_required("STACK_SECRET_SERVER_KEY")

        # Database (optional - not all features need DB)
        self.DATABASE_URL = os.getenv("DATABASE_URL")

        # Application URLs
        self.FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
        self.BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

        # Environment
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    @staticmethod
    def _get_required(key: str) -> str:
        """Get required environment variable or raise error."""
        value = os.getenv(key)
        if value is None:
            raise ValueError(f"Missing required environment variable: {key}")
        return value

    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == "production"

    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT == "development"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience function to get a secret (mimics databutton.secrets.get)
def get_secret(key: str) -> Optional[str]:
    """
    Get a secret/environment variable by key.
    This function provides backwards compatibility with databutton.secrets.get()

    Args:
        key: The environment variable name

    Returns:
        The environment variable value or None if not found
    """
    return os.getenv(key)
