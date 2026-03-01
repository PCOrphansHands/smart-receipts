"""Date format conversion utilities."""


def convert_date_format(date_str: str) -> str:
    """
    Convert date to YYYY.MM.DD format from MM/DD/YYYY format.
    Handles slashes, dots, and dashes as separators.

    Args:
        date_str: Date in MM/DD/YYYY format (or with dots/dashes as separators)

    Returns:
        Date in YYYY.MM.DD format (e.g., "2024.10.25")
    """
    try:
        normalized = date_str.replace('.', '/').replace('-', '/')

        if '/' in normalized:
            parts = normalized.split('/')
            if len(parts) == 3:
                month, day, year = parts
                return f"{year}.{month.zfill(2)}.{day.zfill(2)}"

        return date_str
    except Exception:
        return date_str
