import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, User, Target, History,
  LogOut, Menu, X, TrendingUp, ChevronRight,
  Wallet, ShieldCheck, CircleDollarSign
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const NAV_MAIN = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/history", icon: History, label: "History" },
  { to: "/profile", icon: User, label: "Profile" },
];

const NAV_ENGINES = [
  { to: "/decide/afford", icon: CircleDollarSign, label: "Can I Afford This?", color: "text-brand-600" },
  { to: "/decide/goal-impact", icon: TrendingUp, label: "Goal Impact", color: "text-blue-600" },
  { to: "/decide/safe-spend", icon: ShieldCheck, label: "Safe to Spend", color: "text-purple-600" },
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

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-ink-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-ink-100",
          "flex flex-col transition-transform duration-300 ease-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-100">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-ink-900 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-xl text-ink-900 tracking-tight">
              FinWise
            </span>
          </NavLink>
          <button
            className="lg:hidden text-ink-400 hover:text-ink-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
          {/* Decision engines */}
          <div>
            <p className="px-3 mb-2 text-xs font-semibold text-ink-400 uppercase tracking-widest">
              Decide
            </p>
            <div className="space-y-0.5">
              {NAV_ENGINES.map(({ to, icon: Icon, label, color }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-ink-900 text-white"
                        : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={clsx("w-4 h-4 flex-shrink-0", isActive ? "text-white" : color)} />
                      <span>{label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Main nav */}
          <div>
            <p className="px-3 mb-2 text-xs font-semibold text-ink-400 uppercase tracking-widest">
              Manage
            </p>
            <div className="space-y-0.5">
              {NAV_MAIN.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-ink-100 text-ink-900"
                        : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-ink-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-ink-900 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-900 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-ink-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-ink-600 hover:bg-ink-50"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-lg text-ink-900">FinWise</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
