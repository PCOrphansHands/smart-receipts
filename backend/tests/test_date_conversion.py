"""Tests for backend date format conversion in receipt extraction."""
from app.libs.date_utils import convert_date_format


def test_mm_dd_yyyy_with_slashes():
    assert convert_date_format("10/25/2024") == "2024.10.25"


def test_mm_dd_yyyy_with_dots():
    assert convert_date_format("10.25.2024") == "2024.10.25"


def test_mm_dd_yyyy_with_dashes():
    assert convert_date_format("10-25-2024") == "2024.10.25"


def test_single_digit_padding():
    assert convert_date_format("1/5/2024") == "2024.01.05"


def test_no_separator_returns_original():
    assert convert_date_format("20241025") == "20241025"


def test_empty_string():
    assert convert_date_format("") == ""
