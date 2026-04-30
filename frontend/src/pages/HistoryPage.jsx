import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  History, Filter, ChevronDown, ChevronUp,
  Trash2, RotateCcw, Search, X
} from "lucide-react";
import { PageHeader, EmptyState, LoadingSpinner, VerdictBadge } from "@/components/ui";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const ENGINE_LABELS = {
  affordability:      "Can I Afford?",
  goal_impact:        "Goal Impact",
  safe_spend:         "Safe to Spend",
  buy_now_wait:       "Buy Now or Wait",
  dream_planner:      "Dream Planner",
  emergency_recovery: "Emergency Recovery",
};

const ENGINE_ROUTES = {
  affordability:      "/decide/afford",
  goal_impact:        "/decide/goal-impact",
  safe_spend:         "/decide/safe-spend",
  buy_now_wait:       "/decide/buy-now-wait",
  dream_planner:      "/decide/dream-planner",
  emergency_recovery: "/decide/emergency",
};

const FILTERS = [
  { value: "",                   label: "All" },
  { value: "affordability",      label: "Afford" },
  { value: "buy_now_wait",       label: "Timing" },
  { value: "goal_impact",        label: "Goals" },
  { value: "safe_spend",         label: "Budget" },
  { value: "dream_planner",      label: "Dreams" },
  { value: "emergency_recovery", label: "Emergency" },
];

export default function HistoryPage() {
  const navigate = useNavigate();
  const [decisions, setDecisions]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("");
  const [search, setSearch]         = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async (engineFilter, searchQ, pageNum) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum });
      if (engineFilter) params.set("engine", engineFilter);
      if (searchQ)       params.set("search", searchQ);
      const { data } = await api.get(`/decisions/history/?${params}`);
      const results = "results" in data ? data.results : data;
      setDecisions((prev) => pageNum === 1 ? results : [...prev, ...results]);
      setHasMore(!!data.next);
    } catch { toast.error("Failed to load history."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setPage(1); load(filter, search, 1); }, [filter, search, load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const clearSearch = () => { setSearchInput(""); setSearch(""); };

  const handleDelete = async (id) => {
    if (!confirm("Delete this decision?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/decisions/${id}/`);
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      toast.success("Deleted.");
    } catch { toast.error("Failed to delete."); }
    finally { setDeletingId(null); }
  };

  return (
    <div>
      <PageHeader title="Decision History" subtitle="Every decision saved. Latest first." />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text" placeholder="Search by item name…"
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
          />
          {searchInput && (
            <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button type="submit" className="btn-secondary px-4 py-2.5 text-sm">Search</button>
      </form>

      {/* Engine filter chips */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={clsx("px-3 py-1 rounded-full text-xs font-medium transition-all",
              filter === f.value ? "bg-ink-900 text-white" : "bg-white border border-ink-200 text-ink-600 hover:border-ink-400")}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && decisions.length === 0 ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : decisions.length === 0 ? (
        <EmptyState icon={History} title="No decisions found"
          description={search ? `No results for "${search}"` : "Your decision history will appear here."} />
      ) : (
        <div className="space-y-2">
          {decisions.map((d, i) => (
            <DecisionRow key={d.id} decision={d}
              isExpanded={expandedId === d.id}
              onToggle={() => setExpandedId((p) => p === d.id ? null : d.id)}
              onDelete={() => handleDelete(d.id)}
              onRerun={() => navigate(ENGINE_ROUTES[d.engine_type] || "/dashboard")}
              isDeleting={deletingId === d.id}
              index={i}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button onClick={() => { const n = page + 1; setPage(n); load(filter, search, n); }}
                disabled={loading} className="btn-secondary gap-2">
                {loading && <LoadingSpinner size="sm" />} Load more
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
  const input  = decision.input_data  || {};
  const amt = input.purchase_amount || input.expense_amount || input.target_price || input.converted_amount;
  const label = decision.item_name || ENGINE_LABELS[decision.engine_type] || decision.engine_type;

  return (
    <div className="card overflow-hidden animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-ink-50/60 transition-colors">
        <VerdictBadge verdict={decision.verdict} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink-800 truncate">{label}</p>
            <span className="text-xs text-ink-400 flex-shrink-0">{ENGINE_LABELS[decision.engine_type]}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-ink-400">
              {new Date(decision.created_at).toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" })}
            </p>
            {amt && <span className="text-xs text-ink-400">· {formatCurrency(Number(amt), decision.currency)}</span>}
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-400 flex-shrink-0" />}
      </button>

      {isExpanded && (
        <div className="border-t border-ink-100 px-4 pb-4 pt-3 space-y-3 animate-fade-in">
          {result.recommendation && (
            <p className="text-sm text-ink-700 font-medium leading-relaxed">{result.recommendation}</p>
          )}
          {/* Timing label for buy_now_wait */}
          {result.timing_label && (
            <div className="inline-flex items-center gap-1.5 bg-ink-50 border border-ink-100 rounded-lg px-3 py-1.5">
              <span className="text-sm font-semibold text-ink-800">{result.timing_label}</span>
            </div>
          )}
          {result.reasons?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Why</p>
              <ul className="space-y-1">
                {result.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-ink-300 flex-shrink-0" />{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.better_moves?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Next Move</p>
              <ul className="space-y-1">
                {result.better_moves.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                    <span className="text-brand-500 flex-shrink-0">→</span>{m}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Special fields */}
          {result.safe_amount && <FieldPill label="Safe amount" value={formatCurrency(Number(result.safe_amount), decision.currency)} />}
          {result.months_to_goal != null && <FieldPill label="Months to goal" value={`${result.months_to_goal} months`} />}
          {result.recovery_months > 0 && <FieldPill label="Recovery" value={`${result.recovery_months} months`} />}
          {result.goal_delay_days > 0 && <FieldPill label="Goal delay" value={`${result.goal_delay_days} days`} />}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-ink-100">
            <button onClick={onRerun} className="btn-ghost gap-1.5 text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Run again
            </button>
            <button onClick={onDelete} disabled={isDeleting}
              className="btn-danger gap-1.5 text-xs ml-auto">
              {isDeleting ? <span className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldPill({ label, value }) {
  return (
    <div className="inline-flex items-center gap-2 bg-ink-50 rounded-lg px-3 py-1.5 mr-2">
      <span className="text-xs text-ink-400">{label}</span>
      <span className="text-sm font-semibold text-ink-800">{value}</span>
    </div>
  );
}
