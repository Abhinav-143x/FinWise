import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, FormField, LoadingSpinner } from "@/components/ui";
import CurrencySelect from "@/components/ui/CurrencySelect";
import { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Save, CheckCircle } from "lucide-react";
import { invalidateProfileCache } from "@/hooks/useProfile";

const schema = z.object({
  monthly_income: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0.01, "Income must be greater than 0"),
  fixed_expenses: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Cannot be negative"),
  current_savings: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Cannot be negative"),
  monthly_emi: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Cannot be negative"),
  country: z.string().min(1),
}).refine(
  (d) => d.fixed_expenses + d.monthly_emi < d.monthly_income,
  {
    message: "Total expenses + EMIs must be less than income",
    path: ["fixed_expenses"],
  }
);

const COUNTRIES = [
  ["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"],
  ["DE", "Germany"], ["AE", "UAE"], ["CA", "Canada"],
  ["AU", "Australia"], ["JP", "Japan"], ["SG", "Singapore"],
  ["BR", "Brazil"], ["OTHER", "Other"],
];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [initialCurrency, setInitialCurrency] = useState("USD");
  const [profile, setProfile] = useState(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(schema) });

  const watchedValues = watch(["monthly_income", "fixed_expenses", "monthly_emi"]);
  const liveDisposable = (() => {
    const [inc, exp, emi] = watchedValues.map(Number);
    if (inc > 0) return inc - (exp || 0) - (emi || 0);
    return null;
  })();

  useEffect(() => {
    api.get("/profile/").then(({ data }) => {
      setProfile(data);
      setCurrency(data.default_currency || "USD");
      setInitialCurrency(data.default_currency || "USD");
      reset({
        monthly_income: data.monthly_income || "",
        fixed_expenses: data.fixed_expenses || "",
        current_savings: data.current_savings || "",
        monthly_emi: data.monthly_emi || 0,
        country: data.country || "OTHER",
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [reset]);

  const currencyChanged = currency !== initialCurrency;
  const hasChanges = isDirty || currencyChanged;

  const onSubmit = async (values) => {
    try {
      const { data } = await api.patch("/profile/", {
        ...values,
        default_currency: currency,
      });
      setProfile(data);
      setInitialCurrency(currency);
      reset(values); // clears isDirty
      invalidateProfileCache(); // force useProfile to refetch
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Profile saved.");
    } catch (err) {
      const serverError = err.response?.data?.error?.details?.fixed_expenses
        || err.response?.data?.error?.message
        || err.message;
      toast.error(serverError || "Failed to save.");
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  return (
    <div>
      <PageHeader
        title="Your Profile"
        subtitle="Set once — all decision tools use this automatically."
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Income & expenses */}
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-ink-900">Monthly Finances</h2>

            <FormField
              label="Monthly income (after tax)"
              hint="Your take-home pay each month"
              error={errors.monthly_income?.message}
            >
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="5000"
                {...register("monthly_income")}
              />
            </FormField>

            <FormField
              label="Fixed monthly expenses"
              hint="Rent, utilities, subscriptions, insurance"
              error={errors.fixed_expenses?.message}
            >
              <input type="number" step="0.01" min="0" placeholder="2000" {...register("fixed_expenses")} />
            </FormField>

            <FormField
              label="Monthly EMIs / loan repayments"
              hint="Car, student loans, any monthly debt payments"
              error={errors.monthly_emi?.message}
            >
              <input type="number" step="0.01" min="0" placeholder="0" {...register("monthly_emi")} />
            </FormField>

            <FormField
              label="Current savings / cash"
              hint="Total liquid savings you have right now"
              error={errors.current_savings?.message}
            >
              <input type="number" step="0.01" min="0" placeholder="10000" {...register("current_savings")} />
            </FormField>

            {/* Live disposable preview */}
            {liveDisposable !== null && (
              <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${liveDisposable > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <span className="text-sm text-ink-600">Monthly disposable</span>
                <span className={`font-semibold ${liveDisposable > 0 ? "text-green-700" : "text-red-700"}`}>
                  {liveDisposable > 0 ? formatCurrency(liveDisposable, currency) : "Expenses exceed income"}
                </span>
              </div>
            )}
          </div>

          {/* Locale */}
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-ink-900">Currency & Location</h2>

            <div className="field">
              <label>Default currency</label>
              <CurrencySelect value={currency} onChange={setCurrency} />
              {currencyChanged && (
                <p className="text-xs text-blue-600">Currency changed — save to apply</p>
              )}
            </div>

            <FormField label="Country" error={errors.country?.message}>
              <select {...register("country")}>
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </FormField>

            {/* Saved stats */}
            {profile?.is_onboarded && (
              <div className="bg-ink-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Saved snapshot</p>
                {[
                  ["Monthly disposable", profile.monthly_disposable],
                  ["Emergency fund coverage", profile.emergency_fund_months ? `${profile.emergency_fund_months} months` : null],
                ].filter(([, v]) => v != null).map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-ink-500">{label}</span>
                    <span className="font-semibold text-ink-800">
                      {typeof val === "number" ? formatCurrency(val, currency) : val}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 animate-fade-in">
              <CheckCircle className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !hasChanges}
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
