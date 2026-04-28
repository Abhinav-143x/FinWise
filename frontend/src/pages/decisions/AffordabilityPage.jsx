import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleDollarSign, RefreshCw, ArrowRight } from "lucide-react";
import { PageHeader, FormField, ResultCard, LoadingSpinner } from "@/components/ui";
import CurrencySelect, { formatCurrency } from "@/components/ui/CurrencySelect";
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
  const [purchaseCurrency, setPurchaseCurrency] = useState(null); // null = same as profile
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const activeCurrency = purchaseCurrency || profileCurrency;
  const isDifferentCurrency = purchaseCurrency && purchaseCurrency !== profileCurrency;

  const onSubmit = async ({ purchase_amount }) => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/decisions/affordability/", {
        purchase_amount,
        purchase_currency: activeCurrency,
      });
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.error?.message
        || err.response?.data?.profile
        || err.message
        || "Something went wrong.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (needsSetup) return <ProfileSetupBanner />;

  return (
    <div>
      <PageHeader
        title="Can I Afford This?"
        subtitle="Enter the purchase price. We use your saved profile automatically."
      />

      {/* Profile summary strip */}
      <ProfileSummaryStrip profile={profile} currency={profileCurrency} />

      <div className="grid md:grid-cols-2 gap-6 items-start mt-6">
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
          <FormField label="Purchase amount" error={errors.purchase_amount?.message}>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 800"
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
              Amount will be converted from {purchaseCurrency} to {profileCurrency} using live rates
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 gap-2">
              {submitting ? (
                <><span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />Analysing…</>
              ) : (
                <><CircleDollarSign className="w-4 h-4" />Check affordability</>
              )}
            </button>
            {result && (
              <button type="button" onClick={() => { setResult(null); reset(); }} className="btn-secondary px-4" title="Reset">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Result */}
        <div>
          {result ? (
            <ResultCard result={result} currency={result.currency} />
          ) : (
            <div className="card p-8 text-center border-dashed border-ink-200">
              <CircleDollarSign className="w-10 h-10 text-ink-200 mx-auto mb-3" />
              <p className="text-sm text-ink-400">Your result will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileSummaryStrip({ profile, currency }) {
  const items = [
    { label: "Income", value: formatCurrency(profile.monthly_income, currency) },
    { label: "Expenses", value: formatCurrency(profile.fixed_expenses, currency) },
    { label: "Savings", value: formatCurrency(profile.current_savings, currency) },
    { label: "Disposable", value: formatCurrency(profile.monthly_disposable, currency) },
  ];
  return (
    <div className="bg-ink-50 border border-ink-100 rounded-2xl px-4 py-3 flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider mr-1">Profile</span>
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-sm bg-white border border-ink-100 rounded-lg px-3 py-1">
          <span className="text-ink-400">{label}</span>
          <span className="font-semibold text-ink-800">{value}</span>
        </div>
      ))}
    </div>
  );
}
