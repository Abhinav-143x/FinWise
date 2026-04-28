import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Target, Plus, Trash2, X, TrendingUp } from "lucide-react";
import { PageHeader, FormField, EmptyState, LoadingSpinner } from "@/components/ui";
import CurrencySelect from "@/components/ui/CurrencySelect";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const schema = z.object({
  name: z.string().min(1, "Goal name is required"),
  target_amount: z.coerce.number().positive("Enter a target amount"),
  current_amount: z.coerce.number().min(0),
  monthly_contribution: z.coerce.number().min(0),
});

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", target_amount: "", current_amount: 0, monthly_contribution: 0 },
  });

  const loadGoals = async () => {
    try {
      const [gRes, pRes] = await Promise.all([api.get("/goals/"), api.get("/profile/")]);
      setGoals("results" in gRes.data ? gRes.data.results : gRes.data);
      setCurrency(pRes.data.default_currency || "USD");
    } catch {
      toast.error("Failed to load goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGoals(); }, []);

  const onSubmit = async (values) => {
    try {
      await api.post("/goals/", { ...values, currency });
      toast.success("Goal added!");
      reset();
      setShowForm(false);
      loadGoals();
    } catch (err) {
      toast.error(err.message || "Failed to create goal.");
    }
  };

  const deleteGoal = async (id, name) => {
    if (!confirm(`Delete goal "${name}"?`)) return;
    try {
      await api.delete(`/goals/${id}/`);
      toast.success("Goal deleted.");
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch {
      toast.error("Failed to delete goal.");
    }
  };

  const totalMonthlyContributions = goals.reduce(
    (sum, g) => sum + Number(g.monthly_contribution || 0), 0
  );

  return (
    <div>
      <PageHeader
        title="Savings Goals"
        subtitle="Goals are used in the Goal Impact engine."
        action={
          <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-2 text-sm py-2.5 px-5">
            <Plus className="w-4 h-4" />
            Add goal
          </button>
        }
      />

      {/* Add goal form */}
      {showForm && (
        <div className="card p-6 mb-6 animate-scale-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-ink-900">New Goal</h2>
            <button onClick={() => setShowForm(false)} className="text-ink-400 hover:text-ink-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <FormField label="Goal name" error={errors.name?.message}>
                <input placeholder="e.g. Emergency fund" autoFocus {...register("name")} />
              </FormField>
              <FormField label="Target amount" error={errors.target_amount?.message}>
                <input type="number" step="0.01" placeholder="10000" {...register("target_amount")} />
              </FormField>
              <FormField label="Amount already saved" error={errors.current_amount?.message}>
                <input type="number" step="0.01" placeholder="0" {...register("current_amount")} />
              </FormField>
              <FormField label="Monthly contribution" error={errors.monthly_contribution?.message}>
                <input type="number" step="0.01" placeholder="500" {...register("monthly_contribution")} />
              </FormField>
            </div>
            <div className="flex items-center gap-3">
              <div className="field flex-1">
                <label className="text-sm font-medium text-ink-700">Currency</label>
                <CurrencySelect value={currency} onChange={setCurrency} />
              </div>
              <div className="pt-6">
                <button type="submit" disabled={isSubmitting} className="btn-primary gap-2">
                  {isSubmitting ? (
                    <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : <Plus className="w-4 h-4" />}
                  Save goal
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Summary strip */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="card p-4">
            <p className="text-xs text-ink-400 uppercase tracking-wider mb-1">Active Goals</p>
            <p className="text-2xl font-display font-semibold text-ink-900">{goals.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-ink-400 uppercase tracking-wider mb-1">Monthly Saving</p>
            <p className="text-2xl font-display font-semibold text-ink-900">
              {formatCurrency(totalMonthlyContributions, currency)}
            </p>
          </div>
        </div>
      )}

      {/* Goals list */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Add a savings goal to track your progress and measure purchase impact."
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
              <Plus className="w-4 h-4" /> Add your first goal
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
              onDelete={() => deleteGoal(goal.id, goal.name)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, currency, onDelete, index }) {
  const pct = Math.min(goal.progress_percent, 100);
  const barColor = pct >= 75 ? "bg-brand-500" : pct >= 40 ? "bg-blue-500" : "bg-amber-500";

  return (
    <div
      className="card p-5 animate-fade-up"
      style={{ animationDelay: `${index * 0.06}s`, opacity: 0 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink-900 truncate">{goal.name}</h3>
          <p className="text-xs text-ink-400 mt-0.5">{goal.currency}</p>
        </div>
        <button
          onClick={onDelete}
          className="text-ink-300 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-ink-500 mb-1.5">
          <span>{formatCurrency(goal.current_amount, currency)}</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-ink-400 mt-1">
          <span>Saved</span>
          <span>Target: {formatCurrency(goal.target_amount, currency)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-ink-100">
        <div className="text-center">
          <p className="text-xs text-ink-400">Monthly</p>
          <p className="text-sm font-semibold text-ink-800">
            {formatCurrency(goal.monthly_contribution, currency)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-ink-400">Remaining</p>
          <p className="text-sm font-semibold text-ink-800">
            {formatCurrency(goal.remaining_amount, currency)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-ink-400">ETA</p>
          <p className="text-sm font-semibold text-ink-800">
            {goal.months_to_complete ? `${goal.months_to_complete} mo` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
