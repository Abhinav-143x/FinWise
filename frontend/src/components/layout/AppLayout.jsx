import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, User, Target, History,
  LogOut, Menu, X, TrendingUp,
  Wallet, ShieldCheck, CircleDollarSign, ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const NAV_ENGINES = [
  { to: "/decide/afford",      icon: CircleDollarSign, label: "Can I Afford?",  color: "text-brand-600",  activeBg: "bg-brand-50" },
  { to: "/decide/goal-impact", icon: TrendingUp,        label: "Goal Impact",    color: "text-blue-600",   activeBg: "bg-blue-50" },
  { to: "/decide/safe-spend",  icon: ShieldCheck,       label: "Safe to Spend",  color: "text-purple-600", activeBg: "bg-purple-50" },
];

const NAV_MAIN = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/goals",     icon: Target,           label: "Goals" },
  { to: "/history",  icon: History,           label: "History" },
  { to: "/profile",  icon: User,              label: "Profile" },
];

// Bottom nav items for mobile (simplified)
const BOTTOM_NAV = [
  { to: "/dashboard",          icon: LayoutDashboard, label: "Home" },
  { to: "/decide/afford",      icon: CircleDollarSign, label: "Afford" },
  { to: "/decide/safe-spend",  icon: ShieldCheck,     label: "Budget" },
  { to: "/goals",              icon: Target,           label: "Goals" },
  { to: "/history",            icon: History,          label: "History" },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out.");
    navigate("/");
  };

  const close = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-ink-950/50 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-30 w-60 bg-white border-r border-ink-100 flex flex-col",
        "transition-transform duration-300 ease-out",
        "lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <NavLink to="/dashboard" onClick={close} className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-ink-900 rounded-lg flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-semibold text-lg text-ink-900">FinWise</span>
          </NavLink>
          <button onClick={close} className="lg:hidden text-ink-400 hover:text-ink-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-5">
          {/* Decide tools */}
          <div>
            <p className="px-3 mb-1.5 text-xs font-semibold text-ink-400 uppercase tracking-widest">
              Decide
            </p>
            {NAV_ENGINES.map(({ to, icon: Icon, label, color, activeBg }) => (
              <NavLink
                key={to}
                to={to}
                onClick={close}
                className={({ isActive }) => clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5",
                  isActive ? `${activeBg} text-ink-900` : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                )}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={clsx("w-4 h-4 flex-shrink-0", isActive ? "text-ink-700" : color)} />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Manage */}
          <div>
            <p className="px-3 mb-1.5 text-xs font-semibold text-ink-400 uppercase tracking-widest">
              Manage
            </p>
            {NAV_MAIN.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={close}
                className={({ isActive }) => clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5",
                  isActive ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User footer */}
        <div className="p-2 border-t border-ink-100">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5">
            <div className="w-7 h-7 rounded-full bg-ink-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <p className="text-xs text-ink-600 truncate flex-1">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-400 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-ink-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-ink-600 hover:bg-ink-50"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-lg text-ink-900">FinWise</span>
          <div className="w-9" />
        </header>

        {/* Page content — extra bottom padding on mobile for tab bar */}
        <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8 max-w-4xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-ink-100 px-1 pb-safe">
        <div className="flex items-center justify-around">
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                "flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl transition-all min-w-0",
                isActive ? "text-ink-900" : "text-ink-400"
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx("w-5 h-5 flex-shrink-0", isActive && "text-ink-900")} />
                  <span className={clsx("text-[10px] font-medium truncate", isActive ? "text-ink-900" : "text-ink-400")}>
                    {label}
                  </span>
                  {isActive && <span className="w-1 h-1 rounded-full bg-ink-900" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
