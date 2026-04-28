import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp, RefreshCw, Target } from "lucide-react";
import { PageHeader, FormField, ResultCard, EmptyState } from "@/components/ui";
import CurrencySelect from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import clsx from "clsx";

const schema = z.object({
  purchase_amount: z.coerce.number().positive("Enter a purchase amount"),
  monthly_income: z.coerce.number().min(0),
  current_savings: z.coerce.number().min(0),
});

export default function GoalImpactPage() {
  const [result, setResult] = useState(null);
  const [currency, setCurrency] = useState("USD");
  const [goals, setGoals] = useState([]);
  const [profile, setProfile] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { purchase_amount: "", monthly_income: "", current_savings: "" },
  });

  useEffect(() => {
    Promise.all([api.get("/profile/"), api.get("/goals/")]).then(([p, g]) => {
      setProfile(p.data);
      setGoals(g.data.results || g.data);
      setCurrency(p.data.default_currency || "USD");
      if (p.data.is_onboarded) {
        reset({
          monthly_income: p.data.monthly_income,
          current_savings: p.data.current_savings,
          purchase_amount: "",
        });
      }
    }).catch(() => {});
  }, [reset]);

  const onSubmit = async (values) => {
    try {
      const { data } = await api.post("/decisions/goal-impact/", { ...values, currency });
      setResult(data);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Goal Impact"
        subtitle="See how a purchase affects your savings goals."
      />

      {goals.length === 0 && (
        <div className="card p-5 bg-blue-50 border-blue-200 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900 text-sm">No active goals</p>
              <p className="text-xs text-blue-700 mt-0.5">Add savings goals to see their impact</p>
            </div>
            <Link to="/goals" className="text-sm font-medium text-blue-700 hover:underline">
              Add goals →
            </Link>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-ink-100">
            <span className="text-sm font-medium text-ink-700">Currency</span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>

          <FormField label="Purchase amount" error={errors.purchase_amount?.message}>
            <input type="number" step="0.01" placeholder="e.g. 1200" autoFocus {...register("purchase_amount")} />
          </FormField>

          <div className="border-t border-ink-100 pt-4">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-4">
              Your finances {profile?.is_onboarded ? "(pre-filled)" : ""}
            </p>
            <div className="space-y-4">
              <FormField label="Monthly income" error={errors.monthly_income?.message}>
                <input type="number" step="0.01" placeholder="5000" {...register("monthly_income")} />
              </FormField>
              <FormField label="Current savings" error={errors.current_savings?.message}>
                <input type="number" step="0.01" placeholder="10000" {...register("current_savings")} />
              </FormField>
            </div>
          </div>

          {/* Goals preview */}
          {goals.length > 0 && (
            <div className="bg-ink-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">
                Active goals ({goals.length})
              </p>
              <div className="space-y-2">
                {goals.slice(0, 3).map((g) => (
                  <div key={g.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-700 truncate">{g.name}</span>
                    <span className="text-ink-400 ml-2 flex-shrink-0">{g.progress_percent}%</span>
                  </div>
                ))}
                {goals.length > 3 && (
                  <p className="text-xs text-ink-400">+{goals.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 gap-2">
              {isSubmitting ? (
                <><span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />Analysing…</>
              ) : (
                <><TrendingUp className="w-4 h-4" />Check impact</>
              )}
            </button>
            {result && (
              <button type="button" onClick={() => setResult(null)} className="btn-secondary px-4">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <>
              <ResultCard result={result} currency={currency} />
              {result.goal_impacts?.length > 0 && (
                <GoalImpactBreakdown impacts={result.goal_impacts} />
              )}
            </>
          ) : (
            <div className="card p-8 text-center border-dashed">
              <TrendingUp className="w-10 h-10 text-ink-200 mx-auto mb-3" />
              <p className="text-ink-400 text-sm">Goal impact will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalImpactBreakdown({ impacts }) {
  const labelColor = {
    minimal: "text-green-700 bg-green-50 border-green-200",
    moderate: "text-amber-700 bg-amber-50 border-amber-200",
    significant: "text-red-700 bg-red-50 border-red-200",
  };

  return (
    <div className="card p-5 animate-fade-up">
      <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mb-4">
        Per Goal Breakdown
      </h3>
      <div className="space-y-3">
        {impacts.map((imp) => (
          <div key={imp.goal_id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-800 truncate">{imp.goal_name}</p>
              {imp.delay_months > 0 && (
                <p className="text-xs text-ink-400">Delays by ~{imp.delay_months} months</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-ink-400">{imp.impact_pct}%</span>
              <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full border", labelColor[imp.impact_label])}>
                {imp.impact_label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
