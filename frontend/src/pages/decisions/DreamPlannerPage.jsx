import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, RefreshCw, ArrowRight, Target } from "lucide-react";
import { FormField, ResultCard, LoadingSpinner, PageHeader } from "@/components/ui";
import CurrencySelect, { formatCurrency, getCurrencySymbol } from "@/components/ui/CurrencySelect";
import ProfileSetupBanner from "@/components/ui/ProfileSetupBanner";
import { useProfile } from "@/hooks/useProfile";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const QUICK_ITEMS = ["Laptop", "Bike", "Trip", "Phone", "Camera", "Car"];

const schema = z.object({
  item_name:          z.string().min(1, "What's the item?").max(100),
  target_price:       z.coerce.number({ invalid_type_error: "Enter a number" }).positive("Price must be > 0"),
  extra_monthly_save: z.coerce.number().min(0).optional(),
});

export default function DreamPlannerPage() {
  const { profile, loading, needsSetup, currency: profileCurrency } = useProfile();
  const [purchaseCurrency, setPurchaseCurrency] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const activeCurrency = purchaseCurrency || profileCurrency;
  const isDifferent = purchaseCurrency && purchaseCurrency !== profileCurrency;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { item_name: "", target_price: "", extra_monthly_save: 0 },
  });

  const onSubmit = async ({ item_name, target_price, extra_monthly_save }) => {
    setSubmitting(true); setResult(null);
    try {
      const { data } = await api.post("/decisions/dream-planner/", {
        item_name, target_price, purchase_currency: activeCurrency,
        extra_monthly_save: extra_monthly_save || 0,
      });
      setResult(data);
      setTimeout(() => document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.profile || err.message || "Something went wrong.");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (needsSetup) return <ProfileSetupBanner />;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="Dream Purchase Planner" subtitle="Tell us what you want. We'll tell you when you can safely buy it." />

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        {/* Quick pick */}
        <div>
          <label className="text-sm font-medium text-ink-700 block mb-2">What do you want to buy?</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {QUICK_ITEMS.map((item) => (
              <button key={item} type="button" onClick={() => setValue("item_name", item)}
                className="text-xs px-3 py-1.5 rounded-full border border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-all">
                {item}
              </button>
            ))}
          </div>
          <input type="text" placeholder="or type your own…" {...register("item_name")} className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all" />
          {errors.item_name && <p className="text-xs text-red-500 mt-1">{errors.item_name.message}</p>}
        </div>

        {/* Price */}
        <div>
          <label className="text-sm font-medium text-ink-700 block mb-1.5">Target price</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 text-sm pointer-events-none">{getCurrencySymbol(activeCurrency)}</span>
              <input type="number" step="0.01" min="0.01" placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-xl font-semibold"
                {...register("target_price")} />
            </div>
            <CurrencySelect value={activeCurrency} onChange={(c) => setPurchaseCurrency(c === profileCurrency ? null : c)} className="w-28 flex-shrink-0" />
          </div>
          {errors.target_price && <p className="text-xs text-red-500 mt-1">{errors.target_price.message}</p>}
          {isDifferent && <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1"><ArrowRight className="w-3 h-3" />Converted {purchaseCurrency} → {profileCurrency}</p>}
        </div>

        {/* Extra saving */}
        <FormField label="Can you save extra per month? (optional)" error={errors.extra_monthly_save?.message}
          hint="Additional amount you can set aside specifically for this">
          <input type="number" step="0.01" min="0" placeholder="0" {...register("extra_monthly_save")} />
        </FormField>

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? <><Spin />Planning…</> : <><Star className="w-4 h-4" />Plan my dream buy</>}
          </button>
          {result && <button type="button" onClick={() => { setResult(null); reset(); }} className="btn-secondary px-4"><RefreshCw className="w-4 h-4" /></button>}
        </div>
      </form>

      <div id="result-anchor" className="mt-4 space-y-3">
        {submitting && <div className="card p-8 flex items-center justify-center gap-3"><LoadingSpinner /><p className="text-sm text-ink-500">Building your plan…</p></div>}
        {result && !submitting && (
          <>
            {/* Timeline hero */}
            <DreamHero result={result} currency={result.currency} />
            <ResultCard result={result} currency={result.currency} />
            {result.milestones?.length > 0 && <MilestoneTimeline milestones={result.milestones} />}
          </>
        )}
      </div>
    </div>
  );
}

function DreamHero({ result, currency }) {
  const already = result.already_affordable;
  const months = result.months_to_goal;
  return (
    <div className={clsx("card p-5 border animate-verdict",
      already || months <= 2 ? "bg-green-50 border-green-200" :
      months <= 5 ? "bg-amber-50 border-amber-200" : "bg-ink-50 border-ink-200"
    )}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{already ? "🎉" : months <= 2 ? "⚡" : months <= 5 ? "📈" : "🗓"}</span>
        <div>
          <p className="text-xl font-display font-semibold text-ink-900">
            {already ? "Affordable now" : `${months} month${months !== 1 ? "s" : ""} away`}
          </p>
          {!already && result.amount_still_needed > 0 && (
            <p className="text-xs text-ink-500 mt-0.5">
              Need {formatCurrency(Number(result.amount_still_needed), currency)} more
            </p>
          )}
        </div>
      </div>
      <p className="text-sm text-ink-700">{result.recommendation}</p>
    </div>
  );
}

function MilestoneTimeline({ milestones }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-4">Progress timeline</p>
      <div className="space-y-3">
        {milestones.map((m) => (
          <div key={m.month} className="flex items-center gap-3">
            <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
              m.reached ? "bg-green-500 text-white" : "bg-ink-100 text-ink-500")}>
              {m.reached ? "✓" : m.month}
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-ink-600">Month {m.month}</span>
                <span className="text-xs font-semibold text-ink-800">{m.pct}%</span>
              </div>
              <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full transition-all", m.reached ? "bg-green-500" : "bg-brand-400")}
                  style={{ width: `${m.pct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spin() { return <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />; }
