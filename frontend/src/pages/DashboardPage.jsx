import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CircleDollarSign, TrendingUp, ShieldCheck, ArrowRight,
  Target, Zap, Clock, Star, AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useProfile } from "@/hooks/useProfile";
import { EmptyState, LoadingSpinner, VerdictBadge } from "@/components/ui";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import clsx from "clsx";

const QUICK_ACTIONS = [
  { to: "/decide/afford",        icon: CircleDollarSign, label: "Can I Afford?",   desc: "Check any purchase",        iconBg: "bg-brand-50",   iconColor: "text-brand-600" },
  { to: "/decide/buy-now-wait",  icon: Clock,             label: "Buy Now or Wait", desc: "Get a timing answer",       iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
  { to: "/decide/goal-impact",   icon: TrendingUp,        label: "Goal Impact",     desc: "Will it delay goals?",      iconBg: "bg-indigo-50",  iconColor: "text-indigo-600" },
  { to: "/decide/safe-spend",    icon: ShieldCheck,       label: "Safe to Spend",   desc: "Your real budget",          iconBg: "bg-purple-50",  iconColor: "text-purple-600" },
  { to: "/decide/dream-planner", icon: Star,              label: "Dream Planner",   desc: "When can I buy it?",        iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
  { to: "/decide/emergency",     icon: AlertTriangle,     label: "Emergency",       desc: "Unexpected expense plan",   iconBg: "bg-red-50",     iconColor: "text-red-600" },
];

const ENGINE_LABELS = {
  affordability:      "Can I Afford?",
  goal_impact:        "Goal Impact",
  safe_spend:         "Safe to Spend",
  buy_now_wait:       "Buy Now or Wait",
  dream_planner:      "Dream Planner",
  emergency_recovery: "Emergency",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { profile, loading: profileLoading, currency, needsSetup } = useProfile();
  const [decisions, setDecisions] = useState([]);
  const [goals, setGoals]         = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/decisions/history/?page=1"),
      api.get("/goals/"),
    ]).then(([dRes, gRes]) => {
      setDecisions(dRes.data.results?.slice(0, 4) || []);
      setGoals(("results" in gRes.data ? gRes.data.results : gRes.data).slice(0, 3));
    }).catch(() => {}).finally(() => setDataLoading(false));
  }, []);

  const loading = profileLoading || dataLoading;
  const firstName = user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold text-ink-900">Hey {firstName} 👋</h1>
        <p className="text-sm text-ink-400 mt-0.5">Before you spend, ask FinWise.</p>
      </div>

      {/* Profile setup banner */}
      {!loading && needsSetup && (
        <div className="card p-4 bg-amber-50 border-amber-200 animate-fade-up">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-900 text-sm">Set up your profile</p>
              <p className="text-xs text-amber-700 mt-0.5">Add income + expenses once. All 6 tools use it.</p>
            </div>
            <Link to="/profile" className="flex-shrink-0 btn-primary text-xs py-2 px-4 bg-amber-800 hover:bg-amber-900">
              Set up →
            </Link>
          </div>
        </div>
      )}

      {/* Finance snapshot */}
      {!loading && profile?.is_onboarded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-fade-up">
          {[
            { label: "Income",     val: profile.monthly_income,     highlight: false },
            { label: "Expenses",   val: profile.fixed_expenses,     highlight: false },
            { label: "Disposable", val: profile.monthly_disposable, highlight: true  },
            { label: "Savings",    val: profile.current_savings,    highlight: false },
          ].map(({ label, val, highlight }) => (
            <div key={label} className={clsx("card p-3.5", highlight && "border-brand-200 bg-brand-50/30")}>
              <p className="text-xs text-ink-400 mb-1">{label}</p>
              <p className={clsx("text-base font-semibold font-display truncate",
                highlight ? "text-brand-700" : "text-ink-900")}>
                {formatCurrency(val, currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions — 2×3 grid */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3">
          Make a decision
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, label, desc, iconBg, iconColor }, i) => (
            <Link key={to} to={to}
              className="card p-4 flex items-start gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all group animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}>
              <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", iconBg)}>
                <Icon className={clsx("w-4 h-4", iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900 leading-tight">{label}</p>
                <p className="text-xs text-ink-400 mt-0.5 leading-tight">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Goal progress */}
      {!loading && goals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest">Goal progress</p>
            <Link to="/goals" className="text-xs text-ink-400 hover:text-ink-700 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card divide-y divide-ink-50 animate-fade-up">
            {goals.map((g) => {
              const pct = Math.min(g.progress_percent, 100);
              return (
                <div key={g.id} className="px-4 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium text-ink-800 truncate">{g.name}</p>
                      <span className="text-xs text-ink-500 ml-2 flex-shrink-0">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {g.months_to_complete && (
                    <p className="text-xs text-ink-400 flex-shrink-0">{g.months_to_complete}mo</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent decisions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest">Recent decisions</p>
          {decisions.length > 0 && (
            <Link to="/history" className="text-xs text-ink-400 hover:text-ink-700 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : decisions.length === 0 ? (
          <EmptyState icon={Zap} title="No decisions yet"
            description="Use any of the six tools above to get started." />
        ) : (
          <div className="card divide-y divide-ink-50 animate-fade-up">
            {decisions.map((d) => {
              const input = d.input_data || {};
              const amt = input.purchase_amount || input.expense_amount || input.target_price;
              const itemLabel = d.item_name || ENGINE_LABELS[d.engine_type];
              return (
                <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{itemLabel}</p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      {new Date(d.created_at).toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" })}
                      {amt && <span> · {formatCurrency(Number(amt), d.currency)}</span>}
                    </p>
                  </div>
                  <VerdictBadge verdict={d.verdict} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
