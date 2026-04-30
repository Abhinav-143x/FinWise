import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, RefreshCw, ArrowRight } from "lucide-react";
import { FormField, ResultCard, LoadingSpinner, PageHeader } from "@/components/ui";
import CurrencySelect, { getCurrencySymbol } from "@/components/ui/CurrencySelect";
import ProfileSetupBanner from "@/components/ui/ProfileSetupBanner";
import { useProfile } from "@/hooks/useProfile";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const schema = z.object({
  purchase_amount: z.coerce.number({ invalid_type_error: "Enter a number" }).positive("Amount must be > 0"),
  item_name: z.string().max(100).optional(),
});

const TIMING_STYLE = {
  buy_now:      { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-800",  icon: "✓" },
  wait_salary:  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-800",   icon: "⏰" },
  wait_weeks:   { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-800",  icon: "📅" },
  wait_months:  { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-800",    icon: "📆" },
};

export default function BuyNowWaitPage() {
  const { profile, loading, needsSetup, currency: profileCurrency } = useProfile();
  const [purchaseCurrency, setPurchaseCurrency] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const activeCurrency = purchaseCurrency || profileCurrency;
  const isDifferent = purchaseCurrency && purchaseCurrency !== profileCurrency;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ purchase_amount, item_name }) => {
    setSubmitting(true); setResult(null);
    try {
      const { data } = await api.post("/decisions/buy-now-wait/", {
        purchase_amount, purchase_currency: activeCurrency, item_name: item_name || "",
      });
      setResult(data);
      setTimeout(() => document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.profile || err.message || "Something went wrong.");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (needsSetup) return <ProfileSetupBanner />;

  const timingStyle = result ? (TIMING_STYLE[result.timing] || TIMING_STYLE.wait_salary) : null;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="Buy Now or Wait?" subtitle="Get a specific timing recommendation, not just a verdict." />

      {profile.salary_day && (
        <div className="flex items-center gap-2 text-xs text-ink-400 mb-4 animate-fade-in">
          <Clock className="w-3.5 h-3.5" />
          Salary day {profile.salary_day} is factored in
        </div>
      )}
      {!profile.salary_day && (
        <div className="text-xs text-ink-400 mb-4 flex items-center gap-1.5 animate-fade-in">
          <Clock className="w-3.5 h-3.5" />
          Add your salary day in Profile for better timing
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <FormField label="What are you buying? (optional)" error={errors.item_name?.message}>
          <input type="text" placeholder="e.g. MacBook, trip to Goa…" {...register("item_name")} />
        </FormField>

        <div>
          <label className="text-sm font-medium text-ink-700 block mb-1.5">How much does it cost?</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 text-sm pointer-events-none">
                {getCurrencySymbol(activeCurrency)}
              </span>
              <input
                type="number" step="0.01" min="0.01" placeholder="0" autoFocus
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-900
                           focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-xl font-semibold"
                {...register("purchase_amount")}
              />
            </div>
            <CurrencySelect value={activeCurrency} onChange={(c) => setPurchaseCurrency(c === profileCurrency ? null : c)} className="w-28 flex-shrink-0" />
          </div>
          {errors.purchase_amount && <p className="text-xs text-red-500 mt-1">{errors.purchase_amount.message}</p>}
          {isDifferent && <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1"><ArrowRight className="w-3 h-3" />Converted {purchaseCurrency} → {profileCurrency}</p>}
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? <><Spin />Checking timing…</> : <><Clock className="w-4 h-4" />Should I buy now?</>}
          </button>
          {result && <button type="button" onClick={() => { setResult(null); reset(); }} className="btn-secondary px-4"><RefreshCw className="w-4 h-4" /></button>}
        </div>
      </form>

      <div id="result-anchor" className="mt-4 space-y-3">
        {submitting && <div className="card p-8 flex items-center justify-center gap-3"><LoadingSpinner /><p className="text-sm text-ink-500">Analysing timing…</p></div>}
        {result && !submitting && (
          <>
            {/* Timing hero */}
            <div className={clsx("card p-5 border animate-verdict", timingStyle.bg, timingStyle.border)}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{timingStyle.icon}</span>
                <span className={clsx("text-xl font-display font-semibold", timingStyle.text)}>
                  {result.timing_label}
                </span>
              </div>
              <p className={clsx("text-sm font-medium", timingStyle.text)}>{result.recommendation}</p>
            </div>
            <ResultCard result={result} currency={result.currency} />
          </>
        )}
      </div>
    </div>
  );
}

function Spin() { return <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />; }
