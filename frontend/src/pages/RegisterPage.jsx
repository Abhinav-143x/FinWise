import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { FormField } from "@/components/ui";
import toast from "react-hot-toast";
import { Wallet, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  });

export default function RegisterPage() {
  const navigate = useNavigate();
  const register_ = useAuthStore((s) => s.register);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email, password, password_confirm }) => {
    try {
      await register_(email, password, password_confirm);
      toast.success("Account created! Let's set up your profile.");
      navigate("/profile");
    } catch (err) {
      toast.error(err.message || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-ink-900 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl font-semibold text-ink-900">FinWise</span>
          </Link>
        </div>

        <div className="card p-8 animate-scale-in">
          <h1 className="text-2xl font-semibold text-ink-900 mb-1">Create account</h1>
          <p className="text-sm text-ink-500 mb-7">Free. No credit card needed.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email" error={errors.email?.message}>
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
              />
            </FormField>

            <FormField
              label="Password"
              error={errors.password?.message}
              hint="8+ characters, one uppercase, one number"
            >
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <FormField label="Confirm password" error={errors.password_confirm?.message}>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register("password_confirm")}
              />
            </FormField>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-500 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-ink-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
