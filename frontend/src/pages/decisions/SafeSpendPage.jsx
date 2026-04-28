import { useState } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { PageHeader, ResultCard, LoadingSpinner } from "@/components/ui";
import ProfileSetupBanner from "@/components/ui/ProfileSetupBanner";
import { useProfile } from "@/hooks/useProfile";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function SafeSpendPage() {
  const { profile, loading, needsSetup, currency } = useProfile();
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const run = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/decisions/safe-spend/", {});
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

  const verdictColors = {
    SAFE: { bg: "bg-green-50 border-green-200", text: "text-green-800", num: "text-green-700" },
    CAUTION: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", num: "text-amber-700" },
    RISKY: { bg: "bg-red-50 border-red-200", text: "text-red-800", num: "text-red-700" },
  };
  const vc = result ? (verdictColors[result.verdict] || verdictColors.CAUTION) : null;

  return (
    <div>
      <PageHeader
        title="Safe to Spend"
        subtitle="We calculate your real discretionary budget from your saved profile."
      />

      {/* Profile snapshot */}
      <div className="card p-5 mb-6 space-y-3">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
          Based on your profile
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Income", val: profile.monthly_income },
            { label: "Fixed Expenses", val: profile.fixed_expenses },
            { label: "EMIs", val: profile.monthly_emi },
            { label: "Savings", val: profile.current_savings },
          ].map(({ label, val }) => (
            <div key={label} className="bg-ink-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-ink-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-ink-800">{formatCurrency(val, currency)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-400">
          Goal contributions are summed automatically from your active goals.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* CTA */}
        <div className="card p-6 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-ink-900 mb-1">One click — instant answer</p>
            <p className="text-sm text-ink-500">
              No forms needed. Your profile has everything we need.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={run}
              disabled={submitting}
              className="btn-primary flex-1 gap-2"
            >
              {submitting ? (
                <><span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />Calculating…</>
              ) : (
                <><ShieldCheck className="w-4 h-4" />Calculate safe spend</>
              )}
            </button>
            {result && (
              <button onClick={() => setResult(null)} className="btn-secondary px-4" title="Reset">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Safe amount spotlight */}
              <div className={clsx("card p-6 text-center border", vc.bg)}>
                <p className={clsx("text-sm font-medium mb-1", vc.text)}>
                  Safe to spend this month
                </p>
                <p className={clsx("text-5xl font-display font-semibold", vc.num)}>
                  {formatCurrency(Number(result.safe_amount), result.currency)}
                </p>
                <p className="text-xs text-ink-400 mt-2">{result.currency}</p>
              </div>
              <ResultCard result={result} currency={result.currency} />
            </>
          ) : (
            <div className="card p-8 text-center border-dashed border-ink-200">
              <ShieldCheck className="w-10 h-10 text-ink-200 mx-auto mb-3" />
              <p className="text-sm text-ink-400">Your safe spend amount will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
