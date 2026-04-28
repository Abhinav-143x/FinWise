import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleDollarSign, TrendingUp, ShieldCheck, ArrowRight, History } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { PageHeader, StatCard, EmptyState, LoadingSpinner } from "@/components/ui";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";

const ENGINES = [
  {
    to: "/decide/afford",
    icon: CircleDollarSign,
    title: "Can I Afford This?",
    desc: "Check if a purchase fits your finances",
    accent: "bg-brand-50 text-brand-700 border-brand-100",
    iconBg: "bg-brand-100 text-brand-700",
  },
  {
    to: "/decide/goal-impact",
    icon: TrendingUp,
    title: "Goal Impact",
    desc: "Will this delay your savings goals?",
    accent: "bg-blue-50 text-blue-700 border-blue-100",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    to: "/decide/safe-spend",
    icon: ShieldCheck,
    title: "Safe to Spend",
    desc: "Your real discretionary budget",
    accent: "bg-purple-50 text-purple-700 border-purple-100",
    iconBg: "bg-purple-100 text-purple-700",
  },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profRes, decRes] = await Promise.all([
          api.get("/profile/"),
          api.get("/decisions/history/?page=1"),
        ]);
        setProfile(profRes.data);
        setRecentDecisions(decRes.data.results?.slice(0, 3) || []);
      } catch {
        // Non-fatal
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const currency = profile?.default_currency || "USD";
  const firstName = user?.email?.split("@")[0] || "there";

  return (
    <div>
      <PageHeader
        title={`Hey, ${firstName} 👋`}
        subtitle="What financial decision do you need help with today?"
      />

      {/* Stats row */}
      {!loading && profile?.is_onboarded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 animate-fade-up">
          <StatCard
            label="Monthly Income"
            value={formatCurrency(profile.monthly_income, currency)}
            accent
          />
          <StatCard
            label="Disposable"
            value={formatCurrency(profile.monthly_disposable, currency)}
          />
          <StatCard
            label="Savings"
            value={formatCurrency(profile.current_savings, currency)}
          />
        </div>
      )}

      {!loading && !profile?.is_onboarded && (
        <div className="card p-5 bg-amber-50 border-amber-200 mb-8 animate-fade-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-900 text-sm">Complete your profile</p>
              <p className="text-xs text-amber-700 mt-0.5">Add your income & expenses for better results</p>
            </div>
            <Link to="/profile" className="btn-primary text-sm py-2 px-4 bg-amber-700 hover:bg-amber-800">
              Set up →
            </Link>
          </div>
        </div>
      )}

      {/* Engine cards */}
      <h2 className="text-lg font-semibold text-ink-900 mb-4">Make a decision</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {ENGINES.map(({ to, icon: Icon, title, desc, iconBg }, i) => (
          <Link
            key={to}
            to={to}
            className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group animate-fade-up"
            style={{ animationDelay: `${i * 0.07}s`, opacity: 0 }}
          >
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-ink-900 mb-1">{title}</h3>
            <p className="text-sm text-ink-500 mb-3">{desc}</p>
            <span className="flex items-center gap-1 text-sm font-medium text-ink-400 group-hover:text-ink-800 transition-colors">
              Start <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>

      {/* Recent decisions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-900">Recent decisions</h2>
          {recentDecisions.length > 0 && (
            <Link to="/history" className="text-sm text-ink-500 hover:text-ink-900 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : recentDecisions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No decisions yet"
            description="Use one of the tools above to make your first financial decision."
          />
        ) : (
          <div className="space-y-2">
            {recentDecisions.map((d) => (
              <DecisionRow key={d.id} decision={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionRow({ decision }) {
  const verdictColor = {
    SAFE: "verdict-safe",
    CAUTION: "verdict-caution",
    RISKY: "verdict-risky",
  };

  const engineLabel = {
    affordability: "Can I Afford This?",
    goal_impact: "Goal Impact",
    safe_spend: "Safe to Spend",
  };

  return (
    <div className="card px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow">
      <div className="min-w-0">
        <p className="font-medium text-sm text-ink-800">
          {engineLabel[decision.engine_type] || decision.engine_type}
        </p>
        <p className="text-xs text-ink-400 mt-0.5">
          {new Date(decision.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${verdictColor[decision.verdict]}`}>
        {decision.verdict}
      </span>
    </div>
  );
}
