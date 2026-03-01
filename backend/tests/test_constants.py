"""Tests for application constants."""
from app.libs.constants import (
    MAX_UPLOAD_SIZE,
    VALID_CURRENCY_CODES,
    is_valid_currency,
    DB_CONNECT_TIMEOUT,
    OAUTH_STATE_EXPIRY_MINUTES,
    GMAIL_MAX_RESULTS,
)


def test_max_upload_size_is_20mb():
    assert MAX_UPLOAD_SIZE == 20 * 1024 * 1024


def test_currency_codes_is_frozenset():
    assert isinstance(VALID_CURRENCY_CODES, frozenset)


def test_common_currencies_present():
    for code in ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"]:
        assert code in VALID_CURRENCY_CODES, f"{code} missing from VALID_CURRENCY_CODES"


def test_constants_are_positive():
    assert DB_CONNECT_TIMEOUT > 0
    assert OAUTH_STATE_EXPIRY_MINUTES > 0
    assert GMAIL_MAX_RESULTS > 0
