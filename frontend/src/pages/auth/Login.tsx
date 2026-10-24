import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authApi } from "../../api/services/auth.service";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";
import type { NormalizedError } from "../../api/client";

export function LoginPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [params] = useSearchParams();
  const sessionExpired = params.get("session") === "expired";
  const justVerified = params.get("verified") === "true";

  function validate(): boolean {
    const next: typeof errors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      next.email = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = 'Please enter a valid email address (e.g. name@example.com)';
    }
    if (!password) {
      next.password = 'Please enter your password';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    setLoading(true);
    try {
      const { user, accessToken } = await authApi.login(email.trim(), password);
      setSession(user, accessToken);
      if (!user.emailVerified) {
        toast.success("Enter the OTP sent to your email.");
        navigate(`/verify-email?email=${encodeURIComponent(user.email)}`, {
          replace: true,
        });
        return;
      }
      toast.success(`Welcome back, ${user.name}`);
      if (user.isAdmin) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const message = (err as NormalizedError)?.message ?? "Invalid email or password. Please try again.";
      setErrors({ form: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign in to your FormNest account
        </p>
      </div>

      {justVerified && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          ✓ Email verified successfully! Sign in to continue.
        </div>
      )}
      {sessionExpired && (
        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Your session expired. Please sign in again.
        </div>
      )}
      {errors.form && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          type="email"
          label="Email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            if (errors.form) setErrors((prev) => ({ ...prev, form: undefined }));
          }}
          autoComplete="email"
          required
          error={errors.email}
        />
        <Input
          type={showPassword ? "text" : "password"}
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            if (errors.form) setErrors((prev) => ({ ...prev, form: undefined }));
          }}
          autoComplete="current-password"
          required
          error={errors.password}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          inputClassName="pr-10"
        />
        <div className="flex items-center justify-end text-sm">
          <Link
            to="/forgot-password"
            className="text-brand-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={loading} fullWidth size="lg">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-brand-600 hover:underline"
        >
          Sign up free
        </Link>
      </p>
    </Card>
  );
}
