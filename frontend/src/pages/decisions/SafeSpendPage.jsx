import { useState } from "react";
import { ShieldCheck, RefreshCw, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ResultCard, LoadingSpinner, PageHeader } from "@/components/ui";
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
    setResult(null);
    try {
      const { data } = await api.post("/decisions/safe-spend/", {});
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

  if (loading) return <div className="flex justify-center items-center py-20"><LoadingSpinner size="lg" /></div>;
  if (needsSetup) return <ProfileSetupBanner />;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Safe to Spend"
        subtitle="Your real discretionary budget this month."
      />

      {/* Profile snapshot — what we use to calculate */}
      <div className="card p-5 mb-4 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest">
            Based on your profile
          </p>
          <Link to="/profile" className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-700">
            <Edit2 className="w-3 h-3" /> Edit
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Monthly income",    val: profile.monthly_income },
            { label: "Fixed expenses",    val: profile.fixed_expenses },
            { label: "EMIs",              val: profile.monthly_emi },
            { label: "Current savings",   val: profile.current_savings },
          ].map(({ label, val }) => (
            <div key={label} className="bg-ink-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-ink-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-ink-800">{formatCurrency(val, currency)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-400 mt-2.5">
          Goal contributions deducted automatically from your active goals.
        </p>
      </div>

      {/* CTA */}
      <div className="flex gap-2">
        <button
          onClick={run}
          disabled={submitting}
          className="btn-primary flex-1 py-3.5"
        >
          {submitting
            ? <><span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />Calculating…</>
            : <><ShieldCheck className="w-4 h-4" />Calculate my safe spend</>
          }
        </button>
        {result && (
          <button onClick={() => setResult(null)} className="btn-secondary px-4">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Result */}
      <div id="result-anchor" className="mt-4">
        {submitting && (
          <div className="card p-8 flex items-center justify-center gap-3">
            <LoadingSpinner />
            <p className="text-sm text-ink-500">Running the numbers…</p>
          </div>
        )}
        {result && !submitting && (
          <ResultCard result={result} currency={result.currency} />
        )}
      </div>
    </div>
  );
}
