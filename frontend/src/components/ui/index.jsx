/**
 * Shared UI primitives — V1.5
 */
import clsx from "clsx";
import { formatCurrency } from "./CurrencySelect";

// ── VerdictBadge ──────────────────────────────────────────────────────────────
export function VerdictBadge({ verdict, size = "md" }) {
  const map = {
    SAFE:    { label: "Safe",    cls: "verdict-safe" },
    CAUTION: { label: "Caution", cls: "verdict-caution" },
    RISKY:   { label: "Risky",   cls: "verdict-risky" },
  };
  const { label, cls } = map[verdict] || map.CAUTION;
  return (
    <span className={clsx(
      "inline-flex items-center font-semibold rounded-full tracking-wide uppercase",
      cls,
      size === "lg" ? "text-xs px-4 py-1.5 tracking-widest" : "text-xs px-2.5 py-0.5"
    )}>
      {label}
    </span>
  );
}

// ── VerdictIcon ───────────────────────────────────────────────────────────────
function VerdictIcon({ verdict }) {
  if (verdict === "SAFE")    return <span className="text-2xl">✓</span>;
  if (verdict === "CAUTION") return <span className="text-2xl">!</span>;
  return <span className="text-2xl">✕</span>;
}

// ── ResultCard ────────────────────────────────────────────────────────────────
// Single unified result layout for all three engines.
// Shows: verdict hero → one-line summary → reasons → next move → metrics
export function ResultCard({ result, currency, goalImpacts }) {
  if (!result) return null;
  const { verdict, recommendation, reasons = [], better_moves = [], metrics, safe_amount } = result;

  const verdictStyle = {
    SAFE:    { bg: "bg-green-50",  border: "border-green-200", icon: "bg-green-500",  text: "text-green-800",  sub: "text-green-600" },
    CAUTION: { bg: "bg-amber-50",  border: "border-amber-200", icon: "bg-amber-500",  text: "text-amber-800",  sub: "text-amber-600" },
    RISKY:   { bg: "bg-red-50",    border: "border-red-200",   icon: "bg-red-500",    text: "text-red-800",    sub: "text-red-600" },
  };
  const s = verdictStyle[verdict] || verdictStyle.CAUTION;

  return (
    <div className="space-y-3 animate-verdict">
      {/* Hero verdict block */}
      <div className={clsx("rounded-2xl border p-5", s.bg, s.border)}>
        <div className="flex items-start gap-4">
          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0", s.icon)}>
            <VerdictIcon verdict={verdict} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <VerdictBadge verdict={verdict} size="lg" />
            </div>
            <p className={clsx("text-sm font-medium leading-relaxed", s.text)}>
              {recommendation}
            </p>
            {/* Safe amount spotlight */}
            {safe_amount && Number(safe_amount) > 0 && (
              <p className={clsx("text-3xl font-display font-semibold mt-2", s.text)}>
                {formatCurrency(Number(safe_amount), currency)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics row — only the most useful ones */}
      {metrics && <MetricsRow metrics={metrics} currency={currency} verdict={verdict} />}

      {/* Reasons */}
      {reasons.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3">Why</p>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-ink-700 leading-relaxed">
                <span className="mt-2 w-1 h-1 rounded-full bg-ink-400 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Goal impacts inline */}
      {goalImpacts?.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3">Goal Impact</p>
          <div className="space-y-2.5">
            {goalImpacts.map((imp) => (
              <GoalImpactRow key={imp.goal_id} impact={imp} />
            ))}
          </div>
        </div>
      )}

      {/* Next move */}
      {better_moves.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3">Next Move</p>
          <ul className="space-y-2">
            {better_moves.map((m, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-ink-700 leading-relaxed">
                <span className="text-brand-500 font-bold flex-shrink-0 mt-0.5">→</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── MetricsRow — only renders the 3 most useful metrics ──────────────────────
function MetricsRow({ metrics, currency, verdict }) {
  // Pick the most informative subset based on what's present
  const priority = [
    "savings_used_pct",
    "safe_spend_amount",
    "months_to_save",
    "emergency_months_after",
    "monthly_disposable",
    "safe_spend_pct_of_income",
  ];

  const entries = priority
    .filter((k) => metrics[k] != null && metrics[k] !== 0)
    .slice(0, 3)
    .map((k) => [k, metrics[k]]);

  if (!entries.length) return null;

  const formatKey = (k) => ({
    savings_used_pct:        "Savings used",
    safe_spend_amount:       "Safe to spend",
    months_to_save:          "Months to save",
    emergency_months_after:  "Emergency cover",
    monthly_disposable:      "Disposable",
    safe_spend_pct_of_income:"% of income",
  }[k] || k.replace(/_/g, " "));

  const formatVal = (k, v) => {
    if (k.includes("pct") || k.includes("percent")) return `${v}%`;
    if (k.includes("months") || k === "months_to_save") return `${v} mo`;
    return formatCurrency(v, currency);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="bg-ink-50 rounded-xl px-3 py-2.5 text-center">
          <p className="text-xs text-ink-400 mb-0.5">{formatKey(k)}</p>
          <p className="text-sm font-semibold text-ink-900">{formatVal(k, v)}</p>
        </div>
      ))}
    </div>
  );
}

// ── GoalImpactRow ─────────────────────────────────────────────────────────────
function GoalImpactRow({ impact }) {
  const labelStyle = {
    minimal:     "text-green-700 bg-green-50 border-green-200",
    moderate:    "text-amber-700 bg-amber-50 border-amber-200",
    significant: "text-red-700   bg-red-50   border-red-200",
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-800 truncate">{impact.goal_name}</p>
        {impact.delay_months > 0 && (
          <p className="text-xs text-ink-400">Delays goal by ~{impact.delay_months} months</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-ink-400">{impact.impact_pct}% of remaining</span>
        <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full border", labelStyle[impact.impact_label])}>
          {impact.impact_label}
        </span>
      </div>
    </div>
  );
}

// ── FormField ─────────────────────────────────────────────────────────────────
export function FormField({ label, error, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && !error && <p className="text-xs text-ink-400 leading-relaxed">{hint}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900 mb-0.5">{title}</h1>
        {subtitle && <p className="text-sm text-ink-400">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-ink-100 flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-ink-400" />
        </div>
      )}
      <h3 className="font-semibold text-ink-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-500 max-w-xs mb-5 leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

// ── LoadingSpinner ────────────────────────────────────────────────────────────
export function LoadingSpinner({ size = "md" }) {
  const sz = size === "sm" ? "w-4 h-4 border" : size === "lg" ? "w-10 h-10 border-2" : "w-6 h-6 border-2";
  return <div className={clsx("rounded-full border-ink-200 border-t-ink-700 animate-spin", sz)} />;
}

// ── SkeletonBlock ─────────────────────────────────────────────────────────────
export function SkeletonBlock({ className }) {
  return (
    <div className={clsx("bg-ink-100 rounded-xl animate-pulse", className)} />
  );
}
