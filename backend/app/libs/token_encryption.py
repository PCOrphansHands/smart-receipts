"""
Token encryption for OAuth credentials stored in the database.
Uses Fernet symmetric encryption with a key derived from SUPABASE_JWT_SECRET.
"""
import base64
import json
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


_fernet_instance = None


def _get_fernet() -> Fernet:
    """Get or create a Fernet instance using a key derived from SUPABASE_JWT_SECRET."""
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    from app.config import get_settings
    settings = get_settings()

    secret = settings.SUPABASE_JWT_SECRET
    if not secret:
        raise RuntimeError(
            "SUPABASE_JWT_SECRET is required for token encryption. "
            "Set this environment variable before storing OAuth tokens."
        )

    # Derive a 32-byte key from the JWT secret using HKDF
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"smart-receipts-token-encryption",
        info=b"oauth-token-encryption-key",
    )
    derived_key = hkdf.derive(secret.encode("utf-8"))
    fernet_key = base64.urlsafe_b64encode(derived_key)

    _fernet_instance = Fernet(fernet_key)
    return _fernet_instance


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token string. Returns a base64-encoded encrypted string."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str) -> str:
    """
    Decrypt a token string. Returns the original plaintext.
    If decryption fails (e.g. legacy unencrypted data), returns the input as-is
    so existing tokens continue to work during migration.
    """
    f = _get_fernet()
    try:
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        # Legacy unencrypted token — return as-is
        return ciphertext
