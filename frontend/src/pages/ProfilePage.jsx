import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, FormField, LoadingSpinner } from "@/components/ui";
import CurrencySelect, { formatCurrency } from "@/components/ui/CurrencySelect";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Save, CheckCircle, Info } from "lucide-react";
import { invalidateProfileCache } from "@/hooks/useProfile";
import clsx from "clsx";

const schema = z.object({
  monthly_income:   z.coerce.number({ invalid_type_error: "Enter a number" }).min(0.01, "Income must be > 0"),
  fixed_expenses:   z.coerce.number({ invalid_type_error: "Enter a number" }).min(0, "Cannot be negative"),
  current_savings:  z.coerce.number({ invalid_type_error: "Enter a number" }).min(0, "Cannot be negative"),
  monthly_emi:      z.coerce.number({ invalid_type_error: "Enter a number" }).min(0, "Cannot be negative"),
  country:          z.string().min(1),
  salary_day:       z.coerce.number().int().min(1).max(31).optional().or(z.literal("")),
}).refine((d) => {
  const income = Number(d.monthly_income);
  const out    = Number(d.fixed_expenses) + Number(d.monthly_emi);
  return income <= 0 || out < income;
}, { message: "Expenses + EMIs must be less than income", path: ["fixed_expenses"] });

const COUNTRIES = [
  ["IN","India"],["US","United States"],["GB","United Kingdom"],
  ["DE","Germany"],["AE","UAE"],["CA","Canada"],
  ["AU","Australia"],["JP","Japan"],["SG","Singapore"],
  ["BR","Brazil"],["OTHER","Other"],
];

export default function ProfilePage() {
  const [loading, setLoading]         = useState(true);
  const [currency, setCurrency]       = useState("USD");
  const [initCurrency, setInitCurrency] = useState("USD");
  const [profile, setProfile]         = useState(null);
  const [saved, setSaved]             = useState(false);

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(schema) });

  const [inc, exp, emi] = watch(["monthly_income","fixed_expenses","monthly_emi"]).map(Number);
  const liveDisposable = inc > 0 ? inc - (exp||0) - (emi||0) : null;
  const currencyChanged = currency !== initCurrency;

  useEffect(() => {
    api.get("/profile/").then(({ data }) => {
      setProfile(data);
      setCurrency(data.default_currency || "USD");
      setInitCurrency(data.default_currency || "USD");
      reset({
        monthly_income:  data.monthly_income  || "",
        fixed_expenses:  data.fixed_expenses  || "",
        current_savings: data.current_savings || "",
        monthly_emi:     data.monthly_emi     || 0,
        country:         data.country         || "OTHER",
        salary_day:      data.salary_day      || "",
      });
    }).finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (values) => {
    try {
      const payload = { ...values, default_currency: currency };
      if (!payload.salary_day) delete payload.salary_day;
      const { data } = await api.patch("/profile/", payload);
      setProfile(data);
      setInitCurrency(currency);
      reset(values);
      invalidateProfileCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Profile saved.");
    } catch (err) {
      const msg = err.response?.data?.error?.details?.fixed_expenses
        || err.response?.data?.error?.message || err.message;
      toast.error(msg || "Failed to save.");
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  return (
    <div>
      <PageHeader
        title="Your Profile"
        subtitle="Set once — all six decision tools use this automatically."
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid md:grid-cols-2 gap-5">

          {/* ── Finances ──────────────────────────────────────── */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider text-ink-500">Monthly finances</h2>

            <FormField label="Monthly income (after tax)" hint="Your take-home pay" error={errors.monthly_income?.message}>
              <input type="number" step="0.01" min="0.01" placeholder="5000" {...register("monthly_income")} />
            </FormField>

            <FormField label="Fixed monthly expenses" hint="Rent, utilities, subscriptions" error={errors.fixed_expenses?.message}>
              <input type="number" step="0.01" min="0" placeholder="2000" {...register("fixed_expenses")} />
            </FormField>

            <FormField label="Monthly EMIs / loan repayments" hint="Car, student loans, debt" error={errors.monthly_emi?.message}>
              <input type="number" step="0.01" min="0" placeholder="0" {...register("monthly_emi")} />
            </FormField>

            <FormField label="Current savings / cash" hint="Total liquid savings right now" error={errors.current_savings?.message}>
              <input type="number" step="0.01" min="0" placeholder="10000" {...register("current_savings")} />
            </FormField>

            {/* Live disposable */}
            {liveDisposable !== null && (
              <div className={clsx("rounded-xl px-4 py-3 flex justify-between items-center",
                liveDisposable > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
                <span className="text-sm text-ink-600">Monthly disposable</span>
                <span className={clsx("font-semibold text-sm", liveDisposable > 0 ? "text-green-700" : "text-red-700")}>
                  {liveDisposable > 0 ? formatCurrency(liveDisposable, currency) : "Expenses exceed income"}
                </span>
              </div>
            )}
          </div>

          {/* ── Locale + Salary ───────────────────────────────── */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider text-ink-500">Currency & timing</h2>

            <div className="field">
              <label>Default currency</label>
              <CurrencySelect value={currency} onChange={setCurrency} />
              {currencyChanged && <p className="text-xs text-blue-600">Changed — save to apply</p>}
            </div>

            <FormField label="Country" error={errors.country?.message}>
              <select {...register("country")}>
                {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </FormField>

            <FormField
              label="Salary day (optional)"
              hint="Day of month salary arrives — improves Buy Now vs Wait timing"
              error={errors.salary_day?.message}
            >
              <input type="number" min="1" max="31" placeholder="e.g. 25" {...register("salary_day")} />
            </FormField>

            {/* Saved snapshot */}
            {profile?.is_onboarded && (
              <div className="bg-ink-50 rounded-xl p-4 space-y-2.5 mt-1">
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Saved snapshot</p>
                {[
                  ["Disposable",        profile.monthly_disposable,      true],
                  ["Emergency cover",   profile.emergency_fund_months
                      ? `${profile.emergency_fund_months} months` : null,  false],
                  ["Salary day",        profile.salary_day
                      ? `Day ${profile.salary_day}` : null,                false],
                ].filter(([, v]) => v != null).map(([label, val, isCurrency]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-ink-500">{label}</span>
                    <span className="font-semibold text-ink-800">
                      {isCurrency ? formatCurrency(val, currency) : val}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <div className="mt-5 flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 animate-fade-in">
              <CheckCircle className="w-4 h-4" /> Saved
            </span>
          )}
          <button type="submit" disabled={isSubmitting || (!isDirty && !currencyChanged)} className="btn-primary gap-2">
            {isSubmitting
              ? <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />
            }
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}
