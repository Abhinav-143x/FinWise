import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, FormField, LoadingSpinner } from "@/components/ui";
import CurrencySelect from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

const schema = z.object({
  monthly_income: z.coerce.number().min(0, "Must be 0 or more"),
  fixed_expenses: z.coerce.number().min(0, "Must be 0 or more"),
  current_savings: z.coerce.number().min(0, "Must be 0 or more"),
  monthly_emi: z.coerce.number().min(0, "Must be 0 or more"),
  country: z.string(),
});

const COUNTRIES = [
  ["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"],
  ["DE", "Germany"], ["AE", "UAE"], ["CA", "Canada"],
  ["AU", "Australia"], ["JP", "Japan"], ["SG", "Singapore"],
  ["BR", "Brazil"], ["OTHER", "Other"],
];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [profile, setProfile] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    api.get("/profile/").then(({ data }) => {
      setProfile(data);
      setCurrency(data.default_currency || "USD");
      reset({
        monthly_income: data.monthly_income,
        fixed_expenses: data.fixed_expenses,
        current_savings: data.current_savings,
        monthly_emi: data.monthly_emi,
        country: data.country,
      });
      setLoading(false);
    });
  }, [reset]);

  const onSubmit = async (values) => {
    try {
      const { data } = await api.patch("/profile/", {
        ...values,
        default_currency: currency,
      });
      setProfile(data);
      reset(values);
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err.message || "Failed to save.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Your Profile"
        subtitle="Your financial baseline. Used by all decision engines."
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Income & expenses */}
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-ink-900">Monthly Finances</h2>

            <FormField label="Monthly income (after tax)" error={errors.monthly_income?.message}>
              <input type="number" step="0.01" placeholder="5000" {...register("monthly_income")} />
            </FormField>

            <FormField
              label="Fixed monthly expenses"
              hint="Rent, utilities, subscriptions, insurance"
              error={errors.fixed_expenses?.message}
            >
              <input type="number" step="0.01" placeholder="2000" {...register("fixed_expenses")} />
            </FormField>

            <FormField
              label="Monthly EMIs / loan repayments"
              hint="Car loan, student loan, etc."
              error={errors.monthly_emi?.message}
            >
              <input type="number" step="0.01" placeholder="0" {...register("monthly_emi")} />
            </FormField>

            <FormField label="Current savings / cash" error={errors.current_savings?.message}>
              <input type="number" step="0.01" placeholder="10000" {...register("current_savings")} />
            </FormField>
          </div>

          {/* Locale */}
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-ink-900">Currency & Location</h2>

            <div className="field">
              <label>Default currency</label>
              <CurrencySelect value={currency} onChange={setCurrency} />
            </div>

            <FormField label="Country">
              <select {...register("country")}>
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </FormField>

            {/* Computed stats */}
            {profile?.is_onboarded && (
              <div className="bg-ink-50 rounded-xl p-4 space-y-3 mt-2">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                  Computed
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Monthly disposable</span>
                  <span className="font-semibold text-ink-800">
                    {Number(profile.monthly_disposable).toLocaleString()} {currency}
                  </span>
                </div>
                {profile.emergency_fund_months && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Emergency fund coverage</span>
                    <span className="font-semibold text-ink-800">
                      {profile.emergency_fund_months} months
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="btn-primary gap-2"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}
