/**
 * useProfile — shared hook for profile data + currency rates.
 *
 * Features:
 * - Fetches profile once, caches in module-level state
 * - Fetches FX rates once, caches in module-level state
 * - isReady = true once both are loaded
 * - needsSetup = true if profile not onboarded → caller can redirect
 */
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

// Module-level cache so multiple components don't re-fetch on mount
let _profileCache = null;
let _ratesCache = null;
let _profileListeners = [];
let _fetching = false;

function notifyListeners() {
  _profileListeners.forEach((fn) => fn());
}

export async function refreshProfile() {
  try {
    const { data } = await api.get("/profile/");
    _profileCache = data;
    notifyListeners();
    return data;
  } catch {
    return null;
  }
}

export async function refreshRates() {
  try {
    const { data } = await api.get("/currency/rates/");
    _ratesCache = data;
    return data;
  } catch {
    return null;
  }
}

export function useProfile() {
  const [profile, setProfile] = useState(_profileCache);
  const [rates, setRates] = useState(_ratesCache);
  const [loading, setLoading] = useState(!_profileCache);

  // Subscribe to profile changes
  useEffect(() => {
    const update = () => setProfile({ ..._profileCache });
    _profileListeners.push(update);
    return () => {
      _profileListeners = _profileListeners.filter((fn) => fn !== update);
    };
  }, []);

  useEffect(() => {
    if (_profileCache && _ratesCache) {
      setProfile(_profileCache);
      setRates(_ratesCache);
      setLoading(false);
      return;
    }
    if (_fetching) return;
    _fetching = true;

    Promise.all([
      _profileCache ? Promise.resolve({ data: _profileCache }) : api.get("/profile/"),
      _ratesCache ? Promise.resolve({ data: _ratesCache }) : api.get("/currency/rates/").catch(() => ({ data: null })),
    ]).then(([profRes, rateRes]) => {
      _profileCache = profRes.data;
      if (rateRes.data) _ratesCache = rateRes.data;
      setProfile(profRes.data);
      setRates(rateRes.data);
      setLoading(false);
      _fetching = false;
      notifyListeners();
    }).catch(() => {
      setLoading(false);
      _fetching = false;
    });
  }, []);

  const currency = profile?.default_currency || "USD";

  // Convert amount from any currency to profile currency
  const convertToProfile = useCallback((amount, fromCurrency) => {
    if (!rates || !fromCurrency || fromCurrency === currency) return amount;
    const fromRate = parseFloat(rates.rates?.[fromCurrency] || 1);
    const toRate = parseFloat(rates.rates?.[currency] || 1);
    return (amount / fromRate) * toRate;
  }, [rates, currency]);

  return {
    profile,
    rates,
    loading,
    currency,
    needsSetup: !loading && (!profile || !profile.is_onboarded),
    isReady: !loading && !!profile?.is_onboarded,
    convertToProfile,
    refresh: () => refreshProfile().then(setProfile),
  };
}

/** Invalidate cache — call after profile save */
export function invalidateProfileCache() {
  _profileCache = null;
}
