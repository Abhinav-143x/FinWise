import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleDollarSign, RefreshCw } from "lucide-react";
import { PageHeader, FormField, ResultCard } from "@/components/ui";
import CurrencySelect from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  purchase_amount: z.coerce.number().positive("Enter a purchase amount"),
  monthly_income: z.coerce.number().min(0),
  fixed_expenses: z.coerce.number().min(0),
  current_savings: z.coerce.number().min(0),
  monthly_emi: z.coerce.number().min(0),
});

export default function AffordabilityPage() {
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
      current_savings: "",
      monthly_emi: 0,
      purchase_amount: "",
    },
  });

  // Pre-fill from profile
  useEffect(() => {
    api.get("/profile/").then(({ data }) => {
      setProfile(data);
      setCurrency(data.default_currency || "USD");
      if (data.is_onboarded) {
        reset({
          monthly_income: data.monthly_income,
          fixed_expenses: data.fixed_expenses,
          current_savings: data.current_savings,
          monthly_emi: data.monthly_emi,
          purchase_amount: "",
        });
      }
    }).catch(() => {});
  }, [reset]);

  const onSubmit = async (values) => {
    try {
      const { data } = await api.post("/decisions/affordability/", {
        ...values,
        currency,
      });
      setResult(data);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Can I Afford This?"
        subtitle="Enter the purchase details and we'll give you an honest answer."
      />

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
          {/* Currency */}
          <div className="flex items-center justify-between pb-3 border-b border-ink-100">
            <span className="text-sm font-medium text-ink-700">Currency</span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>

          <FormField label="Purchase amount" error={errors.purchase_amount?.message}>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 800"
              autoFocus
              {...register("purchase_amount")}
            />
          </FormField>

          <div className="border-t border-ink-100 pt-4">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-4">
              Your finances {profile?.is_onboarded ? "(pre-filled from profile)" : ""}
            </p>

            <div className="space-y-4">
              <FormField label="Monthly income (after tax)" error={errors.monthly_income?.message}>
                <input type="number" step="0.01" placeholder="5000" {...register("monthly_income")} />
              </FormField>

              <FormField label="Fixed monthly expenses" error={errors.fixed_expenses?.message}>
                <input type="number" step="0.01" placeholder="2000" {...register("fixed_expenses")} />
              </FormField>

              <FormField label="Current savings" error={errors.current_savings?.message}>
                <input type="number" step="0.01" placeholder="10000" {...register("current_savings")} />
              </FormField>

              <FormField label="Monthly EMIs (optional)" error={errors.monthly_emi?.message}>
                <input type="number" step="0.01" placeholder="0" {...register("monthly_emi")} />
              </FormField>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 gap-2">
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <CircleDollarSign className="w-4 h-4" />
                  Check affordability
                </>
              )}
            </button>

            {result && (
              <button
                type="button"
                onClick={() => setResult(null)}
                className="btn-secondary px-4"
                title="Reset"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Result */}
        <div>
          {result ? (
            <ResultCard result={result} currency={currency} />
          ) : (
            <div className="card p-8 text-center border-dashed">
              <CircleDollarSign className="w-10 h-10 text-ink-200 mx-auto mb-3" />
              <p className="text-ink-400 text-sm">
                Your result will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
