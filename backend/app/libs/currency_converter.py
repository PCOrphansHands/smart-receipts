"""Currency conversion utility using fawazahmed0/exchange-api.

Provides functions to fetch historical exchange rates and convert currencies.
"""

import requests
from datetime import datetime


def get_exchange_rate(from_currency: str, to_currency: str, date_str: str) -> float | None:
    """
    Get historical exchange rate for a specific date.
    
    Args:
        from_currency: Source currency code (e.g., 'MDL', 'UAH')
        to_currency: Target currency code (e.g., 'USD')
        date_str: Date in DD.MM.YYYY format
        
    Returns:
        Exchange rate as float, or None if unavailable
        
    Example:
        >>> get_exchange_rate('MDL', 'USD', '30.12.2024')
        0.0526  # 1 MDL = 0.0526 USD
    """
    try:
        # Convert DD.MM.YYYY to YYYY-MM-DD format
        day, month, year = date_str.split('.')
        api_date = f"{year}-{month}-{day}"
        
        # Convert currency codes to lowercase (API expects lowercase)
        from_curr = from_currency.lower()
        to_curr = to_currency.lower()
        
        # Fetch exchange rates from API
        url = f"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{api_date}/v1/currencies/{from_curr}.json"
        print(f"Fetching exchange rate from: {url}")
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract the exchange rate for target currency
        # Response format: {"date": "2024-12-30", "mdl": {"usd": 0.0526, ...}}
        if from_curr in data and to_curr in data[from_curr]:
            rate = data[from_curr][to_curr]
            print(f"Exchange rate: 1 {from_currency} = {rate} {to_currency} on {date_str}")
            return rate
        else:
            print(f"Currency {to_currency} not found in response")
            return None
            
    except Exception as e:
        print(f"Error fetching exchange rate: {e}")
        return None


def convert_amount(amount: str, from_currency: str, to_currency: str, date_str: str) -> dict | None:
    """
    Convert an amount from one currency to another using historical rates.
    
    Args:
        amount: Amount as string (e.g., '150' or '150.50')
        from_currency: Source currency code (e.g., 'MDL')
        to_currency: Target currency code (e.g., 'USD')
        date_str: Date in DD.MM.YYYY format
        
    Returns:
        Dictionary with conversion details:
        {
            'original_amount': float,
            'converted_amount': float,
            'exchange_rate': float,
            'from_currency': str,
            'to_currency': str,
            'date': str
        }
        Or None if conversion fails
        
    Example:
        >>> convert_amount('150', 'MDL', 'USD', '30.12.2024')
        {
            'original_amount': 150.0,
            'converted_amount': 7.89,
            'exchange_rate': 0.0526,
            'from_currency': 'MDL',
            'to_currency': 'USD',
            'date': '30.12.2024'
        }
    """
    try:
        # Parse amount
        original_amount = float(amount)
        
        # Get exchange rate
        rate = get_exchange_rate(from_currency, to_currency, date_str)
        
        if rate is None:
            return None
            
        # Calculate converted amount
        converted_amount = original_amount * rate
        
        # Round to 2 decimal places for currency
        converted_amount = round(converted_amount, 2)
        
        return {
            'original_amount': original_amount,
            'converted_amount': converted_amount,
            'exchange_rate': rate,
            'from_currency': from_currency,
            'to_currency': to_currency,
            'date': date_str
        }
        
    except Exception as e:
        print(f"Error converting amount: {e}")
        return None
