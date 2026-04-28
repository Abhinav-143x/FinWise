import { useState, useEffect, useCallback } from "react";
import { History, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader, EmptyState, LoadingSpinner, VerdictBadge } from "@/components/ui";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const ENGINE_LABELS = {
  affordability: "Can I Afford This?",
  goal_impact: "Goal Impact",
  safe_spend: "Safe to Spend",
  emi_vs_cash: "EMI vs Cash",
  rent_vs_buy: "Rent vs Buy",
};

const FILTER_OPTIONS = [
  { value: "", label: "All engines" },
  { value: "affordability", label: "Can I Afford This?" },
  { value: "goal_impact", label: "Goal Impact" },
  { value: "safe_spend", label: "Safe to Spend" },
];

export default function HistoryPage() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async (engineFilter, pageNum) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum });
      if (engineFilter) params.set("engine", engineFilter);
      const { data } = await api.get(`/decisions/history/?${params}`);
      const results = "results" in data ? data.results : data;
      setDecisions(pageNum === 1 ? results : (prev) => [...prev, ...results]);
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

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(filter, next);
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div>
      <PageHeader
        title="Decision History"
        subtitle="Every decision you've made, saved for reference."
      />

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-ink-400" />
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                filter === opt.value
                  ? "bg-ink-900 text-white"
                  : "bg-white border border-ink-200 text-ink-600 hover:border-ink-400"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading && decisions.length === 0 ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : decisions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No decisions yet"
          description="Use any of the decision tools and your history will appear here."
        />
      ) : (
        <div className="space-y-2">
          {decisions.map((d, i) => (
            <DecisionRow
              key={d.id}
              decision={d}
              isExpanded={expandedId === d.id}
              onToggle={() => toggleExpand(d.id)}
              index={i}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="btn-secondary gap-2"
              >
                {loading ? <LoadingSpinner size="sm" /> : null}
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DecisionRow({ decision, isExpanded, onToggle, index }) {
  const result = decision.result_data || {};

  return (
    <div
      className="card overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 0.04}s`, opacity: 0 }}
    >
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ink-50 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <VerdictBadge verdict={decision.verdict} />
          <div className="min-w-0">
            <p className="font-medium text-sm text-ink-800">
              {ENGINE_LABELS[decision.engine_type] || decision.engine_type}
            </p>
            <p className="text-xs text-ink-400 mt-0.5">
              {new Date(decision.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" · "}
              {decision.currency}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-ink-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-ink-100 pt-4 space-y-4 animate-fade-in">
          {result.recommendation && (
            <p className="text-sm text-ink-700 font-medium">{result.recommendation}</p>
          )}
          {result.reasons?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Why</p>
              <ul className="space-y-1">
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
              <ul className="space-y-1">
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
            <div className="bg-ink-50 rounded-xl px-4 py-3">
              <p className="text-xs text-ink-400">Safe amount</p>
              <p className="text-lg font-semibold text-ink-900">
                {Number(result.safe_amount).toLocaleString()} {decision.currency}
              </p>
            </div>
          )}
          {/* Input summary */}
          {decision.input_data && Object.keys(decision.input_data).length > 0 && (
            <details className="group">
              <summary className="text-xs font-semibold text-ink-400 uppercase tracking-wider cursor-pointer hover:text-ink-700 list-none flex items-center gap-1">
                <span>Inputs</span>
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(decision.input_data).map(([k, v]) => (
                  <div key={k} className="bg-ink-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-ink-400 capitalize">{k.replace(/_/g, " ")}</p>
                    <p className="text-sm font-medium text-ink-800">{v}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
