"""
CurrencyService — live FX rates with in-memory cache and last-known fallback.

Flow:
  1. Check in-memory cache (valid for CACHE_TTL seconds)
  2. If stale → fetch from exchangerate.host (free, no key needed)
  3. If fetch fails → use last cached rates (stale-while-revalidate)
  4. If no cache at all → use hardcoded emergency fallback rates

All rates stored as Decimal, base currency USD.
"""
import logging
import time
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
import urllib.request
import json

logger = logging.getLogger(__name__)

CACHE_TTL = 3600  # 1 hour

# Emergency fallback rates (vs USD) — updated manually periodically
FALLBACK_RATES_USD = {
    "USD": Decimal("1.0"),
    "EUR": Decimal("0.92"),
    "GBP": Decimal("0.79"),
    "INR": Decimal("83.5"),
    "AED": Decimal("3.67"),
    "CAD": Decimal("1.37"),
    "AUD": Decimal("1.53"),
    "JPY": Decimal("149.5"),
    "SGD": Decimal("1.34"),
    "BRL": Decimal("4.97"),
}

# Module-level cache
_cache: dict = {
    "rates": None,       # dict[str, Decimal] — rates vs USD
    "fetched_at": 0.0,   # unix timestamp
    "source": "none",    # "live" | "fallback"
}


def get_rates() -> dict[str, Decimal]:
    """
    Return current FX rates (base: USD).
    Always returns something — never raises.
    """
    now = time.time()
    if _cache["rates"] and (now - _cache["fetched_at"]) < CACHE_TTL:
        return _cache["rates"]

    # Try to fetch live rates
    try:
        rates = _fetch_live_rates()
        _cache["rates"] = rates
        _cache["fetched_at"] = now
        _cache["source"] = "live"
        logger.info("FX rates refreshed from live source.")
        return rates
    except Exception as exc:
        logger.warning(f"FX fetch failed ({exc}). Using {'cached' if _cache['rates'] else 'fallback'} rates.")
        if _cache["rates"]:
            # Stale-while-revalidate: return last known
            return _cache["rates"]
        # No cache at all — use hardcoded fallback
        _cache["rates"] = FALLBACK_RATES_USD.copy()
        _cache["fetched_at"] = now
        _cache["source"] = "fallback"
        return _cache["rates"]


def convert(amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
    """
    Convert amount from one currency to another.
    Returns Decimal rounded to 2 decimal places.
    """
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency == to_currency:
        return amount

    rates = get_rates()

    from_rate = rates.get(from_currency)
    to_rate = rates.get(to_currency)

    if not from_rate or not to_rate:
        logger.error(f"Unknown currency in conversion: {from_currency} → {to_currency}")
        return amount  # Safe fallback: return unconverted

    # Convert via USD base
    usd_amount = amount / from_rate
    result = usd_amount * to_rate
    return result.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_rate_info() -> dict:
    """Return cache metadata — useful for API responses."""
    return {
        "source": _cache.get("source", "none"),
        "fetched_at": _cache.get("fetched_at", 0),
        "age_seconds": int(time.time() - _cache.get("fetched_at", 0)),
        "currencies": list((_cache.get("rates") or FALLBACK_RATES_USD).keys()),
    }


def _fetch_live_rates() -> dict[str, Decimal]:
    """
    Fetch live rates from exchangerate-api (open endpoint, no key needed).
    Base: USD. Timeout: 5s.
    """
    url = "https://open.er-api.com/v6/latest/USD"
    req = urllib.request.Request(url, headers={"User-Agent": "FinWise/1.5"})
    with urllib.request.urlopen(req, timeout=5) as response:
        data = json.loads(response.read().decode())

    if data.get("result") != "success":
        raise ValueError(f"API returned non-success: {data.get('result')}")

    raw_rates = data.get("rates", {})
    supported = set(FALLBACK_RATES_USD.keys())
    return {
        code: Decimal(str(rate))
        for code, rate in raw_rates.items()
        if code in supported
    }
