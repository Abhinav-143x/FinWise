import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CircleDollarSign, TrendingUp, ShieldCheck,
  ArrowRight, History, Target, Zap
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader, EmptyState, LoadingSpinner, VerdictBadge } from "@/components/ui";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import clsx from "clsx";

const ENGINES = [
  {
    to: "/decide/afford",
    icon: CircleDollarSign,
    title: "Can I Afford This?",
    desc: "Check any purchase against your profile",
    iconBg: "bg-brand-100 text-brand-700",
  },
  {
    to: "/decide/goal-impact",
    icon: TrendingUp,
    title: "Goal Impact",
    desc: "Will this delay your savings goals?",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    to: "/decide/safe-spend",
    icon: ShieldCheck,
    title: "Safe to Spend",
    desc: "Your real budget — one click",
    iconBg: "bg-purple-100 text-purple-700",
  },
];

const ENGINE_LABELS = {
  affordability: "Can I Afford This?",
  goal_impact: "Goal Impact",
  safe_spend: "Safe to Spend",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { profile, loading: profileLoading, currency, needsSetup } = useProfile();
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/decisions/history/?page=1"),
      api.get("/goals/"),
    ]).then(([decRes, goalRes]) => {
      setRecentDecisions(decRes.data.results?.slice(0, 4) || []);
      setGoals(("results" in goalRes.data ? goalRes.data.results : goalRes.data).slice(0, 3));
    }).catch(() => {}).finally(() => setDataLoading(false));
  }, []);

  const loading = profileLoading || dataLoading;
  const firstName = user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-semibold text-ink-900 mb-1">
          Hey, {firstName} 👋
        </h1>
        <p className="text-ink-500">What do you need help deciding today?</p>
      </div>

      {/* Profile setup prompt */}
      {!loading && needsSetup && (
        <div className="card p-5 bg-amber-50 border-amber-200 animate-fade-up">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-900">Set up your profile first</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Add your income, expenses, and savings once. Every tool uses it automatically.
              </p>
            </div>
            <Link
              to="/profile"
              className="flex-shrink-0 btn-primary text-sm py-2 px-5 bg-amber-800 hover:bg-amber-900"
            >
              Set up →
            </Link>
          </div>
        </div>
      )}

      {/* Finance snapshot */}
      {!loading && profile?.is_onboarded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up">
          {[
            { label: "Income", val: profile.monthly_income, accent: true },
            { label: "Expenses", val: profile.fixed_expenses },
            { label: "Disposable", val: profile.monthly_disposable },
            { label: "Savings", val: profile.current_savings },
          ].map(({ label, val, accent }) => (
            <div
              key={label}
              className={clsx(
                "card p-4",
                accent && "border-l-4 border-l-brand-500"
              )}
            >
              <p className="text-xs text-ink-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-lg font-display font-semibold text-ink-900 truncate">
                {formatCurrency(val, currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Quick tools */}
      <div>
        <h2 className="text-base font-semibold text-ink-700 mb-3">Make a decision</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {ENGINES.map(({ to, icon: Icon, title, desc, iconBg }, i) => (
            <Link
              key={to}
              to={to}
              className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group animate-fade-up"
              style={{ animationDelay: `${i * 0.06}s`, opacity: 0 }}
            >
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3", iconBg)}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-ink-900 mb-1">{title}</p>
              <p className="text-sm text-ink-500 mb-3">{desc}</p>
              <span className="flex items-center gap-1 text-sm text-ink-400 group-hover:text-ink-800 transition-colors">
                Start <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Goals progress */}
      {!loading && goals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-ink-700">Goal progress</h2>
            <Link to="/goals" className="text-sm text-ink-400 hover:text-ink-800 flex items-center gap-1">
              All goals <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="card divide-y divide-ink-100">
            {goals.map((g) => (
              <div key={g.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-xl bg-ink-100 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-ink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-ink-800 truncate">{g.name}</p>
                    <span className="text-xs font-semibold text-ink-500 ml-2 flex-shrink-0">
                      {g.progress_percent}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${Math.min(g.progress_percent, 100)}%` }}
                    />
                  </div>
                </div>
                {g.months_to_complete && (
                  <p className="text-xs text-ink-400 flex-shrink-0">{g.months_to_complete} mo</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent decisions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-ink-700">Recent decisions</h2>
          {recentDecisions.length > 0 && (
            <Link to="/history" className="text-sm text-ink-400 hover:text-ink-800 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : recentDecisions.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No decisions yet"
            description="Use a tool above to make your first decision."
          />
        ) : (
          <div className="card divide-y divide-ink-100">
            {recentDecisions.map((d) => (
              <div key={d.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800">
                    {ENGINE_LABELS[d.engine_type] || d.engine_type}
                  </p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {new Date(d.created_at).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                    {d.input_data?.purchase_amount && (
                      <> · {formatCurrency(d.input_data.purchase_amount, d.currency)}</>
                    )}
                  </p>
                </div>
                <VerdictBadge verdict={d.verdict} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
