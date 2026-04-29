import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleDollarSign, TrendingUp, ShieldCheck, ArrowRight, Target, Zap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useProfile } from "@/hooks/useProfile";
import { EmptyState, LoadingSpinner, VerdictBadge } from "@/components/ui";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import clsx from "clsx";

const ENGINES = [
  { to: "/decide/afford",      icon: CircleDollarSign, label: "Can I Afford?",  desc: "Check any purchase",       iconBg: "bg-brand-50",  iconColor: "text-brand-600" },
  { to: "/decide/goal-impact", icon: TrendingUp,        label: "Goal Impact",   desc: "Will it delay your goals?", iconBg: "bg-blue-50",   iconColor: "text-blue-600" },
  { to: "/decide/safe-spend",  icon: ShieldCheck,       label: "Safe to Spend", desc: "Your real budget",          iconBg: "bg-purple-50", iconColor: "text-purple-600" },
];

const ENGINE_LABELS = {
  affordability: "Can I Afford This?",
  goal_impact:   "Goal Impact",
  safe_spend:    "Safe to Spend",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { profile, loading: profileLoading, currency, needsSetup } = useProfile();
  const [decisions, setDecisions] = useState([]);
  const [goals, setGoals] = useState([]);
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
        <p className="text-sm text-ink-400 mt-0.5">What do you need help deciding?</p>
      </div>

      {/* Profile setup banner */}
      {!loading && needsSetup && (
        <div className="card p-4 bg-amber-50 border-amber-200 animate-fade-up">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-900 text-sm">Set up your profile</p>
              <p className="text-xs text-amber-700 mt-0.5">Add income + expenses once. All tools use it.</p>
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
            { label: "Disposable", val: profile.monthly_disposable, highlight: true },
            { label: "Savings",    val: profile.current_savings,    highlight: false },
          ].map(({ label, val, highlight }) => (
            <div key={label} className={clsx("card p-3.5", highlight && "border-brand-200 bg-brand-50/30")}>
              <p className="text-xs text-ink-400 mb-1">{label}</p>
              <p className={clsx("text-base font-semibold font-display truncate", highlight ? "text-brand-700" : "text-ink-900")}>
                {formatCurrency(val, currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3">Make a decision</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ENGINES.map(({ to, icon: Icon, label, desc, iconBg, iconColor }, i) => (
            <Link
              key={to}
              to={to}
              className="card p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all group animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
                <Icon className={clsx("w-4.5 h-4.5", iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900">{label}</p>
                <p className="text-xs text-ink-400 truncate">{desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-600 transition-colors flex-shrink-0" />
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
                  <div className="w-7 h-7 rounded-xl bg-ink-50 flex items-center justify-center flex-shrink-0">
                    <Target className="w-3.5 h-3.5 text-ink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-ink-800 truncate">{g.name}</p>
                      <span className="text-xs text-ink-500 ml-2 flex-shrink-0">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {g.months_to_complete && (
                    <p className="text-xs text-ink-400 flex-shrink-0 w-10 text-right">
                      {g.months_to_complete}mo
                    </p>
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
          <EmptyState
            icon={Zap}
            title="No decisions yet"
            description="Use any tool above to make your first decision."
          />
        ) : (
          <div className="card divide-y divide-ink-50 animate-fade-up delay-100">
            {decisions.map((d) => (
              <DecisionRow key={d.id} decision={d} currency={currency} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionRow({ decision, currency }) {
  const input = decision.input_data || {};
  const amount = input.purchase_amount || input.converted_amount;

  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink-800">
            {ENGINE_LABELS[decision.engine_type] || decision.engine_type}
          </p>
          {amount && (
            <span className="text-xs text-ink-400">
              · {formatCurrency(Number(amount), decision.currency)}
            </span>
          )}
        </div>
        <p className="text-xs text-ink-400 mt-0.5">
          {new Date(decision.created_at).toLocaleDateString(undefined, {
            month: "short", day: "numeric", year: "numeric",
          })}
        </p>
      </div>
      <VerdictBadge verdict={decision.verdict} />
    </div>
  );
}
