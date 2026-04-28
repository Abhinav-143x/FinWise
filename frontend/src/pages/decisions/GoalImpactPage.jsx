import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp, RefreshCw, ArrowRight, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader, FormField, ResultCard, LoadingSpinner } from "@/components/ui";
import CurrencySelect, { formatCurrency } from "@/components/ui/CurrencySelect";
import ProfileSetupBanner from "@/components/ui/ProfileSetupBanner";
import { useProfile } from "@/hooks/useProfile";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useEffect } from "react";

const schema = z.object({
  purchase_amount: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .positive("Amount must be greater than 0"),
});

export default function GoalImpactPage() {
  const { profile, loading, needsSetup, currency: profileCurrency } = useProfile();
  const [purchaseCurrency, setPurchaseCurrency] = useState(null);
  const [goals, setGoals] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const activeCurrency = purchaseCurrency || profileCurrency;
  const isDifferentCurrency = purchaseCurrency && purchaseCurrency !== profileCurrency;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!loading && !needsSetup) {
      api.get("/goals/").then(({ data }) => {
        setGoals("results" in data ? data.results : data);
      }).catch(() => {});
    }
  }, [loading, needsSetup]);

  const onSubmit = async ({ purchase_amount }) => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/decisions/goal-impact/", {
        purchase_amount,
        purchase_currency: activeCurrency,
      });
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.error?.message
        || err.response?.data?.profile
        || err.message;
      toast.error(msg || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (needsSetup) return <ProfileSetupBanner />;

  return (
    <div>
      <PageHeader
        title="Goal Impact"
        subtitle="See how a purchase affects your savings goals — using your saved profile."
      />

      {goals.length === 0 && (
        <div className="card p-4 bg-blue-50 border-blue-200 mb-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-900 text-sm">No active goals</p>
            <p className="text-xs text-blue-700 mt-0.5">Add goals to see their impact</p>
          </div>
          <Link to="/goals" className="text-sm font-semibold text-blue-700 hover:underline">
            Add goals →
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
          <FormField label="Purchase amount" error={errors.purchase_amount?.message}>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 1200"
                autoFocus
                className="flex-1"
                {...register("purchase_amount")}
              />
              <CurrencySelect
                value={activeCurrency}
                onChange={(c) => setPurchaseCurrency(c === profileCurrency ? null : c)}
                className="w-36 flex-shrink-0"
              />
            </div>
          </FormField>

          {isDifferentCurrency && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
              Amount converted from {purchaseCurrency} → {profileCurrency}
            </div>
          )}

          {/* Goals preview */}
          {goals.length > 0 && (
            <div className="bg-ink-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">
                Will be checked against ({goals.length} goal{goals.length !== 1 ? "s" : ""})
              </p>
              <div className="space-y-2">
                {goals.map((g) => (
                  <div key={g.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-700 truncate flex-1">{g.name}</span>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <div className="w-16 h-1.5 bg-ink-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${Math.min(g.progress_percent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-400 w-8 text-right">{g.progress_percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 gap-2">
              {submitting ? (
                <><span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />Analysing…</>
              ) : (
                <><TrendingUp className="w-4 h-4" />Check impact</>
              )}
            </button>
            {result && (
              <button type="button" onClick={() => { setResult(null); reset(); }} className="btn-secondary px-4">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        <div className="space-y-4">
          {result ? (
            <>
              <ResultCard result={result} currency={result.currency} />
              {result.goal_impacts?.length > 0 && <GoalImpactBreakdown impacts={result.goal_impacts} />}
            </>
          ) : (
            <div className="card p-8 text-center border-dashed border-ink-200">
              <TrendingUp className="w-10 h-10 text-ink-200 mx-auto mb-3" />
              <p className="text-sm text-ink-400">Goal impact will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalImpactBreakdown({ impacts }) {
  const labelStyle = {
    minimal: "text-green-700 bg-green-50 border-green-200",
    moderate: "text-amber-700 bg-amber-50 border-amber-200",
    significant: "text-red-700 bg-red-50 border-red-200",
  };
  return (
    <div className="card p-5 animate-fade-up">
      <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-4">Per Goal</h3>
      <div className="space-y-3">
        {impacts.map((imp) => (
          <div key={imp.goal_id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-800 truncate">{imp.goal_name}</p>
              {imp.delay_months > 0 && (
                <p className="text-xs text-ink-400">~{imp.delay_months} month delay</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-ink-400">{imp.impact_pct}%</span>
              <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full border", labelStyle[imp.impact_label])}>
                {imp.impact_label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
