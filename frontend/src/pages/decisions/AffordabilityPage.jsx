import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleDollarSign, RefreshCw, ArrowRight } from "lucide-react";
import { FormField, ResultCard, LoadingSpinner, PageHeader } from "@/components/ui";
import CurrencySelect, { formatCurrency, getCurrencySymbol } from "@/components/ui/CurrencySelect";
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

export default function AffordabilityPage() {
  const { profile, loading, needsSetup, currency: profileCurrency } = useProfile();
  const [purchaseCurrency, setPurchaseCurrency] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const activeCurrency = purchaseCurrency || profileCurrency;
  const isDifferent = purchaseCurrency && purchaseCurrency !== profileCurrency;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const amount = watch("purchase_amount");

  const onSubmit = async ({ purchase_amount }) => {
    setSubmitting(true);
    setResult(null);
    try {
      const { data } = await api.post("/decisions/affordability/", {
        purchase_amount,
        purchase_currency: activeCurrency,
      });
      setResult(data);
      // Scroll result into view on mobile
      setTimeout(() => {
        document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const msg = err.response?.data?.error?.message
        || err.response?.data?.profile
        || err.message || "Something went wrong.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;
  if (needsSetup) return <ProfileSetupBanner />;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Can I Afford This?"
        subtitle="Enter the price. We handle the rest."
      />

      {/* Profile context strip */}
      <ProfileStrip profile={profile} currency={profileCurrency} />

      {/* Form card */}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 mt-4 space-y-4">
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
          {isDifferent && amount > 0 && (
            <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Will be converted from {purchaseCurrency} → {profileCurrency} using live rates
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting
              ? <><Spinner />Checking…</>
              : <><CircleDollarSign className="w-4 h-4" />Check affordability</>
            }
          </button>
          {result && (
            <button
              type="button"
              onClick={() => { setResult(null); reset(); }}
              className="btn-secondary px-4"
              title="Clear result"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Result — appears below form */}
      <div id="result-anchor" className="mt-4">
        {submitting && (
          <div className="card p-8 flex items-center justify-center gap-3">
            <LoadingSpinner />
            <p className="text-sm text-ink-500">Analysing your finances…</p>
          </div>
        )}
        {result && !submitting && (
          <ResultCard result={result} currency={result.currency} />
        )}
      </div>
    </div>
  );
}

function ProfileStrip({ profile, currency }) {
  const stats = [
    { label: "Savings",    val: formatCurrency(profile.current_savings, currency) },
    { label: "Disposable", val: formatCurrency(profile.monthly_disposable, currency) },
    { label: "Income",     val: formatCurrency(profile.monthly_income, currency) },
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap animate-fade-in">
      <span className="text-xs text-ink-400 mr-1">Your profile:</span>
      {stats.map(({ label, val }) => (
        <span key={label} className="text-xs bg-white border border-ink-100 rounded-lg px-2.5 py-1 text-ink-700">
          <span className="text-ink-400">{label} </span>{val}
        </span>
      ))}
    </div>
  );
}

function PageLoading() {
  return (
    <div className="flex justify-center items-center py-20">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />;
}
