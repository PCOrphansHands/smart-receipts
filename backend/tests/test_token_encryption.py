"""Tests for token encryption/decryption round-trip and legacy handling."""
import os
import pytest


@pytest.fixture(autouse=True)
def _set_jwt_secret(monkeypatch):
    """Ensure SUPABASE_JWT_SECRET is set and reset cached Fernet instance."""
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret-key-for-unit-tests")
    # Reset the cached singleton so each test gets a fresh instance
    import app.libs.token_encryption as mod
    mod._fernet_instance = None
    # Also reset the lru_cache on get_settings
    from app.config import get_settings
    get_settings.cache_clear()


def test_encrypt_decrypt_round_trip():
    from app.libs.token_encryption import encrypt_token, decrypt_token

    plaintext = '{"refresh_token": "abc123", "token": "xyz789"}'
    encrypted = encrypt_token(plaintext)

    # Encrypted value should differ from plaintext
    assert encrypted != plaintext

    # Decryption should return original
    assert decrypt_token(encrypted) == plaintext


def test_encrypt_produces_different_ciphertexts():
    """Fernet includes a timestamp, so encrypting the same value twice gives different results."""
    from app.libs.token_encryption import encrypt_token

    a = encrypt_token("same-value")
    b = encrypt_token("same-value")
    assert a != b


def test_decrypt_legacy_unencrypted_token():
    """Legacy tokens stored before encryption should be returned as-is."""
    from app.libs.token_encryption import decrypt_token

    legacy = '{"token": "ya29.legacy", "refresh_token": "1//legacy"}'
    assert decrypt_token(legacy) == legacy


def test_decrypt_random_garbage_returns_input():
    from app.libs.token_encryption import decrypt_token

    garbage = "not-a-valid-fernet-token-at-all"
    assert decrypt_token(garbage) == garbage


def test_missing_secret_raises(monkeypatch):
    """Should raise RuntimeError when SUPABASE_JWT_SECRET is missing."""
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    import app.libs.token_encryption as mod
    mod._fernet_instance = None
    from app.config import get_settings
    get_settings.cache_clear()

    with pytest.raises(RuntimeError, match="SUPABASE_JWT_SECRET"):
        from app.libs.token_encryption import encrypt_token
        encrypt_token("anything")
