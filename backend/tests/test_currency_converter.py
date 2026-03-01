"""Tests for currency conversion and validation."""
import os
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture(autouse=True)
def _set_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret")
    from app.config import get_settings
    get_settings.cache_clear()


# --- is_valid_currency ---

def test_valid_currencies():
    from app.libs.constants import is_valid_currency

    assert is_valid_currency("USD") is True
    assert is_valid_currency("EUR") is True
    assert is_valid_currency("MDL") is True
    assert is_valid_currency("UAH") is True
    assert is_valid_currency("JPY") is True


def test_valid_currency_case_insensitive():
    from app.libs.constants import is_valid_currency

    assert is_valid_currency("usd") is True
    assert is_valid_currency("Eur") is True


def test_invalid_currencies():
    from app.libs.constants import is_valid_currency

    assert is_valid_currency("XXX") is False
    assert is_valid_currency("FAKE") is False
    assert is_valid_currency("") is False
    assert is_valid_currency("AB") is False


# --- convert_amount with validation ---

@patch("app.libs.currency_converter.get_exchange_rate")
def test_convert_amount_valid(mock_rate):
    from app.libs.currency_converter import convert_amount

    mock_rate.return_value = 0.0526
    result = convert_amount("150", "MDL", "USD", "30.12.2024")

    assert result is not None
    assert result["original_amount"] == 150.0
    assert result["converted_amount"] == 7.89
    assert result["exchange_rate"] == 0.0526
    assert result["from_currency"] == "MDL"
    assert result["to_currency"] == "USD"


@patch("app.libs.currency_converter.get_exchange_rate")
def test_convert_amount_invalid_source_currency(mock_rate):
    from app.libs.currency_converter import convert_amount

    result = convert_amount("100", "FAKE", "USD", "01.01.2024")
    assert result is None
    mock_rate.assert_not_called()


@patch("app.libs.currency_converter.get_exchange_rate")
def test_convert_amount_invalid_target_currency(mock_rate):
    from app.libs.currency_converter import convert_amount

    result = convert_amount("100", "USD", "ZZZ", "01.01.2024")
    assert result is None
    mock_rate.assert_not_called()


@patch("app.libs.currency_converter.get_exchange_rate")
def test_convert_amount_rate_unavailable(mock_rate):
    from app.libs.currency_converter import convert_amount

    mock_rate.return_value = None
    result = convert_amount("100", "USD", "EUR", "01.01.2024")
    assert result is None


@patch("app.libs.currency_converter.get_exchange_rate")
def test_convert_amount_invalid_number(mock_rate):
    from app.libs.currency_converter import convert_amount

    result = convert_amount("not-a-number", "USD", "EUR", "01.01.2024")
    assert result is None


@patch("app.libs.currency_converter.get_exchange_rate")
def test_convert_amount_rounding(mock_rate):
    from app.libs.currency_converter import convert_amount

    mock_rate.return_value = 0.33333
    result = convert_amount("100", "EUR", "USD", "01.01.2024")
    assert result is not None
    assert result["converted_amount"] == 33.33


# --- get_exchange_rate date parsing ---

@patch("app.libs.currency_converter.requests.get")
def test_exchange_rate_date_formats(mock_get):
    from app.libs.currency_converter import get_exchange_rate

    mock_response = MagicMock()
    mock_response.json.return_value = {"eur": {"usd": 1.10}}
    mock_response.raise_for_status = MagicMock()
    mock_get.return_value = mock_response

    # DD.MM.YYYY
    get_exchange_rate("EUR", "USD", "25.12.2024")
    assert "2024-12-25" in mock_get.call_args[0][0]

    # MM/DD/YYYY
    get_exchange_rate("EUR", "USD", "12/25/2024")
    assert "2024-12-25" in mock_get.call_args[0][0]

    # YYYY-MM-DD
    get_exchange_rate("EUR", "USD", "2024-12-25")
    assert "2024-12-25" in mock_get.call_args[0][0]


def test_exchange_rate_bad_date_format():
    from app.libs.currency_converter import get_exchange_rate

    result = get_exchange_rate("EUR", "USD", "no-date-here")
    assert result is None
