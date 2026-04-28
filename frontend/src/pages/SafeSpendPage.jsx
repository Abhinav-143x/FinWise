import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { PageHeader, FormField, ResultCard } from "@/components/ui";
import CurrencySelect from "@/components/ui/CurrencySelect";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const schema = z.object({
  monthly_income: z.coerce.number().min(0),
  fixed_expenses: z.coerce.number().min(0),
  monthly_emi: z.coerce.number().min(0),
  current_savings: z.coerce.number().min(0),
  total_goal_contributions: z.coerce.number().min(0),
});

export default function SafeSpendPage() {
  const [result, setResult] = useState(null);
  const [currency, setCurrency] = useState("USD");
  const [profile, setProfile] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      monthly_income: "",
      fixed_expenses: "",
      monthly_emi: 0,
      current_savings: "",
      total_goal_contributions: 0,
    },
  });

  useEffect(() => {
    Promise.all([api.get("/profile/"), api.get("/goals/")]).then(([p, g]) => {
      setProfile(p.data);
      setCurrency(p.data.default_currency || "USD");
      const goals = "results" in g.data ? g.data.results : g.data;
      const totalContributions = goals.reduce(
        (sum, g) => sum + Number(g.monthly_contribution || 0), 0
      );
      if (p.data.is_onboarded) {
        reset({
          monthly_income: p.data.monthly_income,
          fixed_expenses: p.data.fixed_expenses,
          monthly_emi: p.data.monthly_emi,
          current_savings: p.data.current_savings,
          total_goal_contributions: totalContributions,
        });
      }
    }).catch(() => {});
  }, [reset]);

  const onSubmit = async (values) => {
    try {
      const { data } = await api.post("/decisions/safe-spend/", { ...values, currency });
      setResult(data);
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Safe to Spend"
        subtitle="Your real discretionary budget after all obligations."
      />

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-ink-100">
            <span className="text-sm font-medium text-ink-700">Currency</span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>

          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
            Your monthly picture {profile?.is_onboarded ? "(pre-filled from profile)" : ""}
          </p>

          <div className="space-y-4">
            <FormField label="Monthly income" error={errors.monthly_income?.message}>
              <input type="number" step="0.01" placeholder="5000" {...register("monthly_income")} />
            </FormField>
            <FormField label="Fixed expenses" error={errors.fixed_expenses?.message}>
              <input type="number" step="0.01" placeholder="2000" {...register("fixed_expenses")} />
            </FormField>
            <FormField label="Monthly EMIs" error={errors.monthly_emi?.message}>
              <input type="number" step="0.01" placeholder="0" {...register("monthly_emi")} />
            </FormField>
            <FormField label="Current savings" error={errors.current_savings?.message}>
              <input type="number" step="0.01" placeholder="10000" {...register("current_savings")} />
            </FormField>
            <FormField
              label="Total goal contributions"
              hint="Sum of all monthly savings goal contributions"
              error={errors.total_goal_contributions?.message}
            >
              <input type="number" step="0.01" placeholder="0" {...register("total_goal_contributions")} />
            </FormField>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 gap-2">
              {isSubmitting ? (
                <><span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />Calculating…</>
              ) : (
                <><ShieldCheck className="w-4 h-4" />Calculate safe spend</>
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
              {/* Safe amount spotlight */}
              <div className={clsx(
                "card p-6 text-center",
                result.verdict === "SAFE" ? "bg-green-50 border-green-200" :
                result.verdict === "CAUTION" ? "bg-amber-50 border-amber-200" :
                "bg-red-50 border-red-200"
              )}>
                <p className="text-sm font-medium text-ink-500 mb-1">Safe to spend this month</p>
                <p className={clsx(
                  "text-5xl font-display font-semibold",
                  result.verdict === "SAFE" ? "text-green-800" :
                  result.verdict === "CAUTION" ? "text-amber-800" : "text-red-800"
                )}>
                  {formatCurrency(Number(result.safe_amount), currency)}
                </p>
              </div>
              <ResultCard result={result} currency={currency} />
            </>
          ) : (
            <div className="card p-8 text-center border-dashed">
              <ShieldCheck className="w-10 h-10 text-ink-200 mx-auto mb-3" />
              <p className="text-ink-400 text-sm">Your safe spend amount will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
