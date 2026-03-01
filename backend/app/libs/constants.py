"""Application-wide constants for Smart Receipts backend."""

# --- Database ---
DB_CONNECT_TIMEOUT = 2  # seconds
DB_QUERY_TIMEOUT = 2.0  # seconds
DB_CONNECT_TIMEOUT_LONG = 3  # seconds (for OAuth flows)
DB_QUERY_TIMEOUT_LONG = 3.0  # seconds

# --- OAuth ---
OAUTH_STATE_EXPIRY_MINUTES = 10  # minutes before state token expires

# --- Gmail ---
GMAIL_MAX_RESULTS = 50  # max emails to fetch per scan

# --- File Upload ---
MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20 MB

# --- External API ---
EXTERNAL_API_TIMEOUT = 10  # seconds for currency/exchange rate API calls

# --- Retry ---
RETRY_MAX_ATTEMPTS = 3
RETRY_WAIT_SECONDS = 1  # initial wait before first retry (exponential backoff)
RETRY_MAX_WAIT_SECONDS = 10

# --- Currency Validation (ISO 4217 common codes) ---
VALID_CURRENCY_CODES = frozenset({
    "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
    "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
    "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY",
    "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP",
    "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD",
    "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR", "ILS",
    "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR",
    "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD",
    "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU",
    "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK",
    "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG",
    "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK",
    "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP", "STN", "SYP", "SZL",
    "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH",
    "UGX", "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD",
    "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWL",
})


def is_valid_currency(code: str) -> bool:
    """Check if a currency code is a valid ISO 4217 code."""
    return code.upper() in VALID_CURRENCY_CODES
