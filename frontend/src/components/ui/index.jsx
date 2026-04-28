/**
 * Shared UI primitives — used across all pages.
 */
import clsx from "clsx";

// ── VerdictBadge ──────────────────────────────────────────────────────────────
export function VerdictBadge({ verdict, size = "md" }) {
  const map = {
    SAFE: { label: "Safe", cls: "verdict-safe" },
    CAUTION: { label: "Caution", cls: "verdict-caution" },
    RISKY: { label: "Risky", cls: "verdict-risky" },
  };
  const { label, cls } = map[verdict] || map.CAUTION;

  return (
    <span
      className={clsx(
        "inline-flex items-center font-semibold rounded-full tracking-wide",
        cls,
        size === "lg" ? "text-sm px-4 py-1.5" : "text-xs px-3 py-1"
      )}
    >
      {label}
    </span>
  );
}

// ── ResultCard ────────────────────────────────────────────────────────────────
export function ResultCard({ result, currency }) {
  if (!result) return null;
  const { verdict, recommendation, reasons = [], better_moves = [], metrics } = result;

  const verdictColors = {
    SAFE: "border-green-200 bg-green-50",
    CAUTION: "border-amber-200 bg-amber-50",
    RISKY: "border-red-200 bg-red-50",
  };

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Verdict header */}
      <div className={clsx("rounded-2xl border p-6", verdictColors[verdict] || verdictColors.CAUTION)}>
        <div className="flex items-start gap-4">
          <VerdictBadge verdict={verdict} size="lg" />
          <p className="text-ink-800 font-medium leading-relaxed">{recommendation}</p>
        </div>
      </div>

      {/* Why */}
      {reasons.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mb-3">Why</h3>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-ink-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ink-400 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Better move */}
      {better_moves.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mb-3">Better Move</h3>
          <ul className="space-y-2">
            {better_moves.map((m, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-ink-700">
                <span className="mt-1 text-brand-500">→</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics strip */}
      {metrics && Object.keys(metrics).length > 0 && (
        <MetricsStrip metrics={metrics} currency={currency} />
      )}
    </div>
  );
}

// ── MetricsStrip ──────────────────────────────────────────────────────────────
function MetricsStrip({ metrics, currency }) {
  const entries = Object.entries(metrics).filter(([, v]) => v !== null && v !== undefined);
  if (!entries.length) return null;

  const formatKey = (k) =>
    k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const formatVal = (k, v) => {
    if (typeof v === "number") {
      if (k.includes("pct") || k.includes("percent")) return `${v}%`;
      if (k.includes("months")) return `${v} mo`;
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 0,
      }).format(v);
    }
    return String(v);
  };

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mb-3">Numbers</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {entries.map(([k, v]) => (
          <div key={k} className="bg-ink-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-ink-400 mb-0.5">{formatKey(k)}</p>
            <p className="text-sm font-semibold text-ink-800">{formatVal(k, v)}</p>
          </div>
        ))}
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
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold text-ink-900 mb-1">{title}</h1>
        {subtitle && <p className="text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-ink-400" />
        </div>
      )}
      <h3 className="font-semibold text-ink-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-500 max-w-xs mb-5">{description}</p>}
      {action}
    </div>
  );
}

// ── LoadingSpinner ────────────────────────────────────────────────────────────
export function LoadingSpinner({ size = "md" }) {
  const sz = size === "sm" ? "w-4 h-4 border" : "w-7 h-7 border-2";
  return (
    <div className={clsx("rounded-full border-ink-300 border-t-ink-800 animate-spin", sz)} />
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent }) {
  return (
    <div className={clsx("card p-5", accent && "border-l-4 border-l-brand-500")}>
      <p className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-display font-semibold text-ink-900">{value}</p>
      {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
    </div>
  );
}
