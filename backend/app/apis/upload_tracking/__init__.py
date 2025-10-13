"""
Upload tracking API endpoints
Tracks which receipts have been uploaded to Dropbox
"""
import os
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncpg
from app.auth import AuthorizedUser

router = APIRouter(prefix="/upload-tracking")

# Database connection
async def get_db_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    return await asyncpg.connect(database_url)


class ReceiptUploadStatus(BaseModel):
    receipt_key: str
    uploaded_to_dropbox: bool
    upload_timestamp: Optional[str] = None
    dropbox_paths: Optional[list[str]] = None
    receipt_metadata: Optional[dict] = None
    source_type: Optional[str] = None


class MarkUploadedRequest(BaseModel):
    receipt_key: str
    dropbox_paths: list[str]
    receipt_metadata: Optional[dict] = None
    source_type: str = "gmail_attachment"  # gmail_attachment, gmail_body, upload


class GetUploadStatusRequest(BaseModel):
    receipt_keys: list[str]


@router.post("/mark-uploaded")
async def mark_uploaded(request: MarkUploadedRequest, user: AuthorizedUser) -> dict:
    """Mark a receipt as uploaded to Dropbox"""
    try:
        conn = await get_db_connection()
        try:
            # Insert or update the upload status
            # Convert metadata dict to JSON string for JSONB column
            metadata_json = json.dumps(request.receipt_metadata) if request.receipt_metadata else None

            await conn.execute(
                """
                INSERT INTO uploaded_receipts (
                    user_id, receipt_key, uploaded_to_dropbox, upload_timestamp,
                    dropbox_paths, receipt_metadata, source_type, updated_at
                )
                VALUES ($1, $2, TRUE, $3, $4, $5::jsonb, $6, $7)
                ON CONFLICT (user_id, receipt_key)
                DO UPDATE SET
                    uploaded_to_dropbox = TRUE,
                    upload_timestamp = $3,
                    dropbox_paths = $4,
                    receipt_metadata = $5::jsonb,
                    source_type = $6,
                    updated_at = $7
                """,
                user.sub,
                request.receipt_key,
                datetime.utcnow(),
                request.dropbox_paths,
                metadata_json,
                request.source_type,
                datetime.utcnow(),
            )

            return {
                "success": True,
                "message": "Receipt marked as uploaded",
                "receipt_key": request.receipt_key
            }
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error marking receipt as uploaded: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/get-status")
async def get_upload_status(request: GetUploadStatusRequest, user: AuthorizedUser) -> dict:
    """Get upload status for multiple receipts"""
    try:
        conn = await get_db_connection()
        try:
            # Fetch upload status for all requested receipt keys
            rows = await conn.fetch(
                """
                SELECT receipt_key, uploaded_to_dropbox, upload_timestamp,
                       dropbox_paths, receipt_metadata, source_type
                FROM uploaded_receipts
                WHERE user_id = $1 AND receipt_key = ANY($2)
                """,
                user.sub,
                request.receipt_keys,
            )

            # Convert to dict for easy lookup
            status_map = {}
            for row in rows:
                status_map[row['receipt_key']] = {
                    "receipt_key": row['receipt_key'],
                    "uploaded_to_dropbox": row['uploaded_to_dropbox'],
                    "upload_timestamp": row['upload_timestamp'].isoformat() if row['upload_timestamp'] else None,
                    "dropbox_paths": row['dropbox_paths'],
                    "receipt_metadata": row['receipt_metadata'],
                    "source_type": row['source_type'],
                }

            return {
                "success": True,
                "statuses": status_map
            }
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error getting upload status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_uploaded_receipts(user: AuthorizedUser, include_uploaded: bool = True, include_not_uploaded: bool = True) -> dict:
    """List all tracked receipts with optional filtering"""
    try:
        conn = await get_db_connection()
        try:
            # Build query based on filters
            if include_uploaded and include_not_uploaded:
                where_clause = "WHERE user_id = $1"
                params = [user.sub]
            elif include_uploaded:
                where_clause = "WHERE user_id = $1 AND uploaded_to_dropbox = TRUE"
                params = [user.sub]
            elif include_not_uploaded:
                where_clause = "WHERE user_id = $1 AND uploaded_to_dropbox = FALSE"
                params = [user.sub]
            else:
                return {"success": True, "receipts": []}

            rows = await conn.fetch(
                f"""
                SELECT receipt_key, uploaded_to_dropbox, upload_timestamp,
                       dropbox_paths, receipt_metadata, source_type, created_at
                FROM uploaded_receipts
                {where_clause}
                ORDER BY created_at DESC
                """,
                *params
            )

            receipts = []
            for row in rows:
                receipts.append({
                    "receipt_key": row['receipt_key'],
                    "uploaded_to_dropbox": row['uploaded_to_dropbox'],
                    "upload_timestamp": row['upload_timestamp'].isoformat() if row['upload_timestamp'] else None,
                    "dropbox_paths": row['dropbox_paths'],
                    "receipt_metadata": row['receipt_metadata'],
                    "source_type": row['source_type'],
                    "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                })

            return {
                "success": True,
                "receipts": receipts,
                "count": len(receipts)
            }
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error listing uploaded receipts: {e}")
        raise HTTPException(status_code=500, detail=str(e))
