import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";
import { FormField, ResultCard, LoadingSpinner, PageHeader } from "@/components/ui";
import CurrencySelect, { formatCurrency, getCurrencySymbol } from "@/components/ui/CurrencySelect";
import ProfileSetupBanner from "@/components/ui/ProfileSetupBanner";
import { useProfile } from "@/hooks/useProfile";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const EXPENSE_TYPES = [
  "Hospital bill", "Car repair", "Home repair", "Family emergency", "Device replacement", "Other",
];

const schema = z.object({
  expense_amount: z.coerce.number({ invalid_type_error: "Enter a number" }).positive("Amount must be > 0"),
  expense_label:  z.string().min(1, "Describe the expense").max(100),
});

const CUSHION_STYLE = {
  healthy:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  label: "Buffer healthy" },
  thin:     { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  label: "Buffer thin" },
  depleted: { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    label: "Buffer depleted" },
};

export default function EmergencyRecoveryPage() {
  const { profile, loading, needsSetup, currency: profileCurrency } = useProfile();
  const [expenseCurrency, setExpenseCurrency] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const activeCurrency = expenseCurrency || profileCurrency;
  const isDifferent = expenseCurrency && expenseCurrency !== profileCurrency;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { expense_amount: "", expense_label: "" },
  });

  const onSubmit = async ({ expense_amount, expense_label }) => {
    setSubmitting(true); setResult(null);
    try {
      const { data } = await api.post("/decisions/emergency-recovery/", {
        expense_amount, expense_label, expense_currency: activeCurrency,
      });
      setResult(data);
      setTimeout(() => document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.profile || err.message || "Something went wrong.");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (needsSetup) return <ProfileSetupBanner />;

  const cushionStyle = result ? (CUSHION_STYLE[result.cushion_status] || CUSHION_STYLE.thin) : null;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="Emergency Recovery" subtitle="Log an unexpected expense. Get a recovery plan." />

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        {/* Expense type */}
        <div>
          <label className="text-sm font-medium text-ink-700 block mb-2">What happened?</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {EXPENSE_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setValue("expense_label", t)}
                className="text-xs px-3 py-1.5 rounded-full border border-ink-200 text-ink-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50 transition-all">
                {t}
              </button>
            ))}
          </div>
          <input type="text" placeholder="or describe it…" {...register("expense_label")}
            className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all" />
          {errors.expense_label && <p className="text-xs text-red-500 mt-1">{errors.expense_label.message}</p>}
        </div>

        {/* Amount */}
        <div>
          <label className="text-sm font-medium text-ink-700 block mb-1.5">How much?</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 text-sm pointer-events-none">{getCurrencySymbol(activeCurrency)}</span>
              <input type="number" step="0.01" min="0.01" placeholder="0" autoFocus
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-xl font-semibold"
                {...register("expense_amount")} />
            </div>
            <CurrencySelect value={activeCurrency} onChange={(c) => setExpenseCurrency(c === profileCurrency ? null : c)} className="w-28 flex-shrink-0" />
          </div>
          {errors.expense_amount && <p className="text-xs text-red-500 mt-1">{errors.expense_amount.message}</p>}
          {isDifferent && <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1"><ArrowRight className="w-3 h-3" />Converted {expenseCurrency} → {profileCurrency}</p>}
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? <><Spin />Calculating recovery…</> : <><AlertTriangle className="w-4 h-4" />Get recovery plan</>}
          </button>
          {result && <button type="button" onClick={() => { setResult(null); reset(); }} className="btn-secondary px-4"><RefreshCw className="w-4 h-4" /></button>}
        </div>
      </form>

      <div id="result-anchor" className="mt-4 space-y-3">
        {submitting && <div className="card p-8 flex items-center justify-center gap-3"><LoadingSpinner /><p className="text-sm text-ink-500">Building your recovery plan…</p></div>}
        {result && !submitting && (
          <>
            {/* Impact summary */}
            <div className={clsx("card p-5 border animate-verdict", cushionStyle.bg, cushionStyle.border)}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-xs text-ink-400 mb-0.5">Savings after</p>
                  <p className="text-lg font-semibold text-ink-900">{formatCurrency(Number(result.savings_after), result.currency)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-ink-400 mb-0.5">Recovery</p>
                  <p className="text-lg font-semibold text-ink-900">
                    {result.recovery_months > 0 ? `${result.recovery_months} mo` : "None needed"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-ink-400 mb-0.5">Goal delay</p>
                  <p className="text-lg font-semibold text-ink-900">
                    {result.goal_delay_days > 0 ? `${result.goal_delay_days}d` : "None"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full border", cushionStyle.bg, cushionStyle.border, cushionStyle.text)}>
                  {cushionStyle.label}
                </span>
                <p className={clsx("text-sm font-medium", cushionStyle.text)}>{result.recommendation}</p>
              </div>
            </div>

            <ResultCard result={result} currency={result.currency} />

            {/* Recovery plan */}
            {result.recovery_plan?.length > 0 && (
              <div className="card p-4">
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3">Recovery plan</p>
                <ol className="space-y-2">
                  {result.recovery_plan.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-ink-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-ink-100 text-ink-500 flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Spin() { return <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />; }
