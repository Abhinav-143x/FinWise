/**
 * Auth store — manages user session state.
 * Persists tokens to localStorage.
 */
import { create } from "zustand";
import api from "@/lib/api";

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // ── Initialize from stored tokens ──────────────────────────────────────
  init: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { data } = await api.get("/auth/me/");
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  // ── Register ───────────────────────────────────────────────────────────
  register: async (email, password, passwordConfirm) => {
    const { data } = await api.post("/auth/register/", {
      email,
      password,
      password_confirm: passwordConfirm,
    });
    _storeTokens(data.tokens);
    set({ user: data.user, isAuthenticated: true });
    return data;
  },

  // ── Login ──────────────────────────────────────────────────────────────
  login: async (email, password) => {
    const { data } = await api.post("/auth/login/", { email, password });
    _storeTokens({ access: data.access, refresh: data.refresh });
    const me = await api.get("/auth/me/");
    set({ user: me.data, isAuthenticated: true });
    return me.data;
  },

  // ── Logout ─────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      await api.post("/auth/logout/", {
        refresh: localStorage.getItem("refresh_token"),
      });
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, isAuthenticated: false });
    }
  },

  setUser: (user) => set({ user }),
}));

function _storeTokens({ access, refresh }) {
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}
