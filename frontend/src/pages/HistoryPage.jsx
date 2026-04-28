import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { History, Filter, ChevronDown, ChevronUp, Trash2, RotateCcw } from "lucide-react";
import { PageHeader, EmptyState, LoadingSpinner, VerdictBadge } from "@/components/ui";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const ENGINE_LABELS = {
  affordability: "Can I Afford This?",
  goal_impact: "Goal Impact",
  safe_spend: "Safe to Spend",
};

const ENGINE_ROUTES = {
  affordability: "/decide/afford",
  goal_impact: "/decide/goal-impact",
  safe_spend: "/decide/safe-spend",
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "affordability", label: "Affordability" },
  { value: "goal_impact", label: "Goal Impact" },
  { value: "safe_spend", label: "Safe Spend" },
];

export default function HistoryPage() {
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async (engineFilter, pageNum) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum });
      if (engineFilter) params.set("engine", engineFilter);
      const { data } = await api.get(`/decisions/history/?${params}`);
      const results = "results" in data ? data.results : data;
      setDecisions((prev) => pageNum === 1 ? results : [...prev, ...results]);
      setHasMore(!!data.next);
    } catch {
      toast.error("Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    load(filter, 1);
  }, [filter, load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this decision?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/decisions/${id}/`);
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      toast.success("Decision deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRerun = (decision) => {
    const route = ENGINE_ROUTES[decision.engine_type];
    if (route) navigate(route);
  };

  return (
    <div>
      <PageHeader
        title="Decision History"
        subtitle="Every decision saved, latest first."
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-ink-400 flex-shrink-0" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              filter === f.value
                ? "bg-ink-900 text-white"
                : "bg-white border border-ink-200 text-ink-600 hover:border-ink-400"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && decisions.length === 0 ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : decisions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No decisions yet"
          description="Your history will appear here after you run any decision tool."
        />
      ) : (
        <div className="space-y-2">
          {decisions.map((d, i) => (
            <DecisionRow
              key={d.id}
              decision={d}
              isExpanded={expandedId === d.id}
              onToggle={() => setExpandedId((prev) => prev === d.id ? null : d.id)}
              onDelete={() => handleDelete(d.id)}
              onRerun={() => handleRerun(d)}
              isDeleting={deletingId === d.id}
              index={i}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => { const next = page + 1; setPage(next); load(filter, next); }}
                disabled={loading}
                className="btn-secondary gap-2"
              >
                {loading && <LoadingSpinner size="sm" />}
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DecisionRow({ decision, isExpanded, onToggle, onDelete, onRerun, isDeleting, index }) {
  const result = decision.result_data || {};
  const purchaseAmount = decision.input_data?.purchase_amount;
  const currency = decision.currency;

  return (
    <div
      className="card overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 0.03}s`, opacity: 0 }}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-ink-50/50 transition-colors"
      >
        <VerdictBadge verdict={decision.verdict} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-800">
            {ENGINE_LABELS[decision.engine_type] || decision.engine_type}
            {purchaseAmount && (
              <span className="text-ink-400 font-normal ml-2">
                · {formatCurrency(purchaseAmount, currency)}
              </span>
            )}
          </p>
          <p className="text-xs text-ink-400 mt-0.5">
            {new Date(decision.created_at).toLocaleString(undefined, {
              month: "short", day: "numeric", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
            {" · "}{currency}
          </p>
        </div>
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-ink-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-ink-400 flex-shrink-0" />
        }
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-ink-100 px-5 pb-5 pt-4 space-y-4 animate-fade-in">
          {result.recommendation && (
            <p className="text-sm font-medium text-ink-700 leading-relaxed">
              {result.recommendation}
            </p>
          )}

          {result.reasons?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Why</p>
              <ul className="space-y-1.5">
                {result.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-ink-300 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.better_moves?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Better Move</p>
              <ul className="space-y-1.5">
                {result.better_moves.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                    <span className="text-brand-500 flex-shrink-0">→</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.safe_amount && (
            <div className="bg-ink-50 rounded-xl px-4 py-3 inline-block">
              <p className="text-xs text-ink-400">Safe amount</p>
              <p className="text-lg font-semibold text-ink-900">
                {formatCurrency(Number(result.safe_amount), currency)}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-ink-100">
            <button
              onClick={onRerun}
              className="btn-ghost gap-1.5 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Run again
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="btn-ghost gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
            >
              {isDeleting
                ? <span className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />
              }
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
