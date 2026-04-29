import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Target, Plus, Trash2, X, Pencil, Check } from "lucide-react";
import { PageHeader, FormField, EmptyState, LoadingSpinner } from "@/components/ui";
import CurrencySelect, { formatCurrency } from "@/components/ui/CurrencySelect";
import { useProfile } from "@/hooks/useProfile";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const schema = z.object({
  name: z.string().min(1, "Name required").max(100),
  target_amount: z.coerce.number({ invalid_type_error: "Enter a number" }).positive("Must be > 0"),
  current_amount: z.coerce.number().min(0, "Cannot be negative"),
  monthly_contribution: z.coerce.number().min(0, "Cannot be negative"),
});

export default function GoalsPage() {
  const { currency } = useProfile();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [goalCurrency, setGoalCurrency] = useState(currency || "USD");

  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", target_amount: "", current_amount: 0, monthly_contribution: 0 },
  });

  // Sync currency from profile once loaded
  useEffect(() => {
    if (currency) setGoalCurrency(currency);
  }, [currency]);

  const load = async () => {
    try {
      const { data } = await api.get("/goals/");
      setGoals("results" in data ? data.results : data);
    } catch { toast.error("Failed to load goals."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    reset({ name: "", target_amount: "", current_amount: 0, monthly_contribution: 0 });
    setShowForm(true);
  };

  const openEdit = (goal) => {
    setEditingId(goal.id);
    setValue("name", goal.name);
    setValue("target_amount", goal.target_amount);
    setValue("current_amount", goal.current_amount);
    setValue("monthly_contribution", goal.monthly_contribution);
    setGoalCurrency(goal.currency);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); reset(); };

  const onSubmit = async (values) => {
    try {
      if (editingId) {
        const { data } = await api.patch(`/goals/${editingId}/`, { ...values, currency: goalCurrency });
        setGoals((prev) => prev.map((g) => g.id === editingId ? data : g));
        toast.success("Goal updated.");
      } else {
        const { data } = await api.post("/goals/", { ...values, currency: goalCurrency });
        setGoals((prev) => [data, ...prev]);
        toast.success("Goal added!");
      }
      closeForm();
    } catch (err) {
      toast.error(err.message || "Failed to save goal.");
    }
  };

  const deleteGoal = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/goals/${id}/`);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast.success("Goal deleted.");
    } catch { toast.error("Failed to delete."); }
  };

  const totalMonthly = goals.reduce((s, g) => s + Number(g.monthly_contribution || 0), 0);
  const totalTarget  = goals.reduce((s, g) => s + Number(g.target_amount || 0), 0);
  const totalSaved   = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);

  return (
    <div>
      <PageHeader
        title="Savings Goals"
        subtitle="Track what you're saving toward. Used in Goal Impact calculations."
        action={
          <button onClick={openAdd} className="btn-primary gap-2 py-2.5 px-4">
            <Plus className="w-4 h-4" /> New goal
          </button>
        }
      />

      {/* Add / Edit form */}
      {showForm && (
        <div className="card p-5 mb-5 animate-slide-down">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink-900">
              {editingId ? "Edit goal" : "New goal"}
            </h2>
            <button onClick={closeForm} className="text-ink-400 hover:text-ink-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <FormField label="Goal name" error={errors.name?.message}>
                <input placeholder="e.g. Emergency fund" autoFocus {...register("name")} />
              </FormField>
              <FormField label="Target amount" error={errors.target_amount?.message}>
                <input type="number" step="0.01" min="0.01" placeholder="10000" {...register("target_amount")} />
              </FormField>
              <FormField label="Already saved" error={errors.current_amount?.message}>
                <input type="number" step="0.01" min="0" placeholder="0" {...register("current_amount")} />
              </FormField>
              <FormField label="Monthly contribution" error={errors.monthly_contribution?.message}>
                <input type="number" step="0.01" min="0" placeholder="500" {...register("monthly_contribution")} />
              </FormField>
            </div>
            <div className="flex items-end gap-3">
              <div className="field flex-1">
                <label>Currency</label>
                <CurrencySelect value={goalCurrency} onChange={setGoalCurrency} />
              </div>
              <div className="flex gap-2 pb-0.5">
                <button type="button" onClick={closeForm} className="btn-secondary py-3">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary py-3 gap-2">
                  {isSubmitting
                    ? <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Check className="w-4 h-4" />
                  }
                  {editingId ? "Save changes" : "Add goal"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Summary row */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-in">
          {[
            { label: "Goals",          val: goals.length,                          isNum: true },
            { label: "Total saved",    val: formatCurrency(totalSaved, currency),   isNum: false },
            { label: "Monthly saving", val: formatCurrency(totalMonthly, currency), isNum: false },
          ].map(({ label, val, isNum }) => (
            <div key={label} className="card p-4 text-center">
              <p className="text-xs text-ink-400 uppercase tracking-wider mb-1">{label}</p>
              <p className={clsx("font-display font-semibold text-ink-900", isNum ? "text-3xl" : "text-xl")}>
                {val}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Goals grid */}
      {loading ? (
        <div className="flex justify-center py-14"><LoadingSpinner size="lg" /></div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Add a savings goal and we'll factor it into your Goal Impact decisions."
          action={
            <button onClick={openAdd} className="btn-primary gap-2">
              <Plus className="w-4 h-4" /> Add first goal
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((goal, i) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              onEdit={() => openEdit(goal)}
              onDelete={() => deleteGoal(goal.id, goal.name)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, currency, onEdit, onDelete, index }) {
  const pct = Math.min(Math.max(goal.progress_percent, 0), 100);
  const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-brand-500" : pct >= 25 ? "bg-blue-500" : "bg-amber-400";

  // ETA display
  const eta = goal.months_to_complete
    ? goal.months_to_complete < 1 ? "< 1 month"
    : goal.months_to_complete === 1 ? "1 month"
    : goal.months_to_complete < 12 ? `${goal.months_to_complete} months`
    : `${(goal.months_to_complete / 12).toFixed(1)} years`
    : "—";

  return (
    <div
      className="card p-5 animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink-900 truncate">{goal.name}</h3>
          <p className="text-xs text-ink-400 mt-0.5">{goal.currency}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="btn-ghost p-1.5" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="btn-danger p-1.5" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar — big and clear */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-2xl font-display font-semibold text-ink-900">{pct}%</span>
          <span className="text-xs text-ink-400">
            {formatCurrency(goal.current_amount, currency)} of {formatCurrency(goal.target_amount, currency)}
          </span>
        </div>
        <div className="h-3 bg-ink-100 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all duration-700", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-ink-400 mt-1.5">
          {formatCurrency(goal.remaining_amount, currency)} remaining
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-ink-100">
        <div>
          <p className="text-xs text-ink-400 mb-0.5">Monthly</p>
          <p className="text-sm font-semibold text-ink-800">
            {formatCurrency(goal.monthly_contribution, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-400 mb-0.5">ETA</p>
          <p className="text-sm font-semibold text-ink-800">{eta}</p>
        </div>
      </div>
    </div>
  );
}
