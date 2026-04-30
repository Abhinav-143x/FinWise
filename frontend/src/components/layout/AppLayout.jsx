import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, User, Target, History, LogOut,
  Menu, X, TrendingUp, Wallet, ShieldCheck,
  CircleDollarSign, Clock, Star, AlertTriangle, ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const DECIDE_NAV = [
  { to: "/decide/afford",        icon: CircleDollarSign, label: "Can I Afford?",   color: "text-brand-600",   activeBg: "bg-brand-50" },
  { to: "/decide/buy-now-wait",  icon: Clock,             label: "Buy Now or Wait", color: "text-blue-600",    activeBg: "bg-blue-50" },
  { to: "/decide/goal-impact",   icon: TrendingUp,        label: "Goal Impact",     color: "text-indigo-600",  activeBg: "bg-indigo-50" },
  { to: "/decide/safe-spend",    icon: ShieldCheck,       label: "Safe to Spend",   color: "text-purple-600",  activeBg: "bg-purple-50" },
  { to: "/decide/dream-planner", icon: Star,              label: "Dream Planner",   color: "text-amber-600",   activeBg: "bg-amber-50" },
  { to: "/decide/emergency",     icon: AlertTriangle,     label: "Emergency",       color: "text-red-600",     activeBg: "bg-red-50" },
];

const MAIN_NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/goals",     icon: Target,           label: "Goals" },
  { to: "/history",   icon: History,          label: "History" },
  { to: "/profile",   icon: User,             label: "Profile" },
];

const BOTTOM_NAV = [
  { to: "/dashboard",           icon: LayoutDashboard,  label: "Home" },
  { to: "/decide/afford",       icon: CircleDollarSign, label: "Afford" },
  { to: "/decide/buy-now-wait", icon: Clock,            label: "Timing" },
  { to: "/goals",               icon: Target,           label: "Goals" },
  { to: "/history",             icon: History,          label: "History" },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const close = () => setSidebarOpen(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out.");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-ink-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-ink-950/50 backdrop-blur-sm lg:hidden" onClick={close} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
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

        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
          {/* Decide */}
          <div>
            <p className="px-3 mb-1 text-xs font-semibold text-ink-400 uppercase tracking-widest">Decide</p>
            {DECIDE_NAV.map(({ to, icon: Icon, label, color, activeBg }) => (
              <NavLink key={to} to={to} onClick={close}
                className={({ isActive }) => clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all mb-0.5",
                  isActive ? `${activeBg} text-ink-900` : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                )}>
                {({ isActive }) => (
                  <>
                    <Icon className={clsx("w-4 h-4 flex-shrink-0", isActive ? "text-ink-700" : color)} />
                    <span className="flex-1 leading-tight">{label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 opacity-40" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Manage */}
          <div>
            <p className="px-3 mb-1 text-xs font-semibold text-ink-400 uppercase tracking-widest">Manage</p>
            {MAIN_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} onClick={close}
                className={({ isActive }) => clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all mb-0.5",
                  isActive ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User */}
        <div className="p-2 border-t border-ink-100">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-0.5">
            <div className="w-7 h-7 rounded-full bg-ink-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <p className="text-xs text-ink-600 truncate flex-1">{user?.email}</p>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-400 hover:text-red-600 hover:bg-red-50 transition-all">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-ink-100 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-ink-600 hover:bg-ink-50">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-lg text-ink-900">FinWise</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8 max-w-4xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom tab bar ────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-ink-100">
        <div className="flex items-center justify-around px-1">
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));
            return (
              <NavLink key={to} to={to}
                className={clsx("flex flex-col items-center gap-0.5 px-2 py-2.5 min-w-0 flex-1 transition-all",
                  active ? "text-ink-900" : "text-ink-400")}>
                <div className={clsx("w-6 h-6 flex items-center justify-center rounded-lg transition-all",
                  active && "bg-ink-100")}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-medium truncate">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
