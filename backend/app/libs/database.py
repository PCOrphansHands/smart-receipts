import asyncpg
from app.config import get_settings

async def get_db_connection():
    """Get database connection using settings"""
    settings = get_settings()
    conn = await asyncpg.connect(settings.DATABASE_URL)
    return conn
