import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/services/auth.service';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import type { NormalizedError } from '../../api/client';

export function RegisterPage(): JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Please enter your full name';
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      next.email = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = 'Please enter a valid email address (e.g. name@example.com)';
    }
    if (!password) {
      next.password = 'Please create a password';
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters long';
    } else {
      const checks = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
      if (checks < 3) next.password = 'Password must contain at least 3 of: uppercase, lowercase, digit, symbol';
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
      const { user, accessToken } = await authApi.register(email.trim(), password, name.trim());
      setSession(user, accessToken);
      toast.success('Account created! Please check your email for the OTP.');
      navigate(`/verify-email?email=${encodeURIComponent(user.email)}`, { replace: true });
    } catch (err) {
      const message = (err as NormalizedError)?.message ?? 'Registration failed. Please check your details and try again.';
      setErrors({ form: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Build forms in minutes. No credit card required.</p>
      </div>

      {errors.form && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          placeholder="e.g. Alex Johnson"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            if (errors.form) setErrors((prev) => ({ ...prev, form: undefined }));
          }}
          autoComplete="name"
          required
          error={errors.name}
        />
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
          type={showPassword ? 'text' : 'password'}
          label="Password"
          placeholder="Create a strong password (min. 8 characters)"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            if (errors.form) setErrors((prev) => ({ ...prev, form: undefined }));
          }}
          autoComplete="new-password"
          required
          helpText="Min 8 chars with 3 of: uppercase, lowercase, digit, symbol"
          error={errors.password}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={!password}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          inputClassName="pr-10"
        />
        <Button type="submit" loading={loading} fullWidth size="lg">Create account</Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
      </p>
    </Card>
  );
}
