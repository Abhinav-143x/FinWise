import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp, RefreshCw, ArrowRight, Target, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { FormField, ResultCard, LoadingSpinner, PageHeader } from "@/components/ui";
import CurrencySelect, { getCurrencySymbol } from "@/components/ui/CurrencySelect";
import ProfileSetupBanner from "@/components/ui/ProfileSetupBanner";
import { useProfile } from "@/hooks/useProfile";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

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
  const isDifferent = purchaseCurrency && purchaseCurrency !== profileCurrency;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!loading && !needsSetup) {
      api.get("/goals/").then(({ data }) => {
        setGoals("results" in data ? data.results : data);
      }).catch(() => {});
    }
  }, [loading, needsSetup]);

  const onSubmit = async ({ purchase_amount }) => {
    setSubmitting(true);
    setResult(null);
    try {
      const { data } = await api.post("/decisions/goal-impact/", {
        purchase_amount,
        purchase_currency: activeCurrency,
      });
      setResult(data);
      setTimeout(() => {
        document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const msg = err.response?.data?.error?.message
        || err.response?.data?.profile
        || err.message;
      toast.error(msg || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;
  if (needsSetup) return <ProfileSetupBanner />;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Goal Impact"
        subtitle="How does this purchase affect what you're saving for?"
      />

      {/* No goals nudge */}
      {goals.length === 0 && (
        <div className="card p-4 bg-blue-50 border-blue-200 mb-4 flex items-center justify-between animate-fade-in">
          <div>
            <p className="text-sm font-semibold text-blue-900">No goals set up</p>
            <p className="text-xs text-blue-600 mt-0.5">Add goals to see their impact — still works without them</p>
          </div>
          <Link to="/goals" className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900">
            <Plus className="w-3.5 h-3.5" /> Add
          </Link>
        </div>
      )}

      {/* Goals preview — compact */}
      {goals.length > 0 && (
        <div className="mb-4 animate-fade-in">
          <p className="text-xs text-ink-400 mb-2">
            Will check against {goals.length} goal{goals.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center gap-1.5 bg-white border border-ink-100 rounded-lg px-2.5 py-1">
                <div className="w-12 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-400 rounded-full"
                    style={{ width: `${Math.min(g.progress_percent, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-ink-700 font-medium">{g.name}</span>
                <span className="text-xs text-ink-400">{g.progress_percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-ink-700 block mb-1.5">
            What does it cost?
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 font-medium text-sm pointer-events-none">
                {getCurrencySymbol(activeCurrency)}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0"
                autoFocus
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-900
                           focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all
                           text-xl font-semibold"
                {...register("purchase_amount")}
              />
            </div>
            <CurrencySelect
              value={activeCurrency}
              onChange={(c) => setPurchaseCurrency(c === profileCurrency ? null : c)}
              className="w-28 flex-shrink-0"
            />
          </div>
          {errors.purchase_amount && (
            <p className="text-xs text-red-500 mt-1">{errors.purchase_amount.message}</p>
          )}
          {isDifferent && (
            <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Converted {purchaseCurrency} → {profileCurrency}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting
              ? <><Spinner />Checking…</>
              : <><TrendingUp className="w-4 h-4" />Check goal impact</>
            }
          </button>
          {result && (
            <button
              type="button"
              onClick={() => { setResult(null); reset(); }}
              className="btn-secondary px-4"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Result */}
      <div id="result-anchor" className="mt-4">
        {submitting && (
          <div className="card p-8 flex items-center justify-center gap-3">
            <LoadingSpinner />
            <p className="text-sm text-ink-500">Checking your goals…</p>
          </div>
        )}
        {result && !submitting && (
          <ResultCard
            result={result}
            currency={result.currency}
            goalImpacts={result.goal_impacts}
          />
        )}
      </div>
    </div>
  );
}

function PageLoading() {
  return <div className="flex justify-center items-center py-20"><LoadingSpinner size="lg" /></div>;
}

function Spinner() {
  return <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />;
}
