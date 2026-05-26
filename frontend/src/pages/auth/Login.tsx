import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/services/auth.service';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import type { NormalizedError } from '../../api/client';

export function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [params] = useSearchParams();
  const sessionExpired = params.get('session') === 'expired';

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const { user, accessToken } = await authApi.login(email, password);
      setSession(user, accessToken);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/dashboard');
    } catch (err) {
      const message = (err as NormalizedError)?.message ?? 'Login failed';
      setErrors({ form: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to your FormNest account</p>
      </div>

      {sessionExpired && (
        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Your session expired. Please sign in again.
        </div>
      )}
      {errors.form && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          error={errors.email}
        />
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          error={errors.password}
        />
        <div className="flex items-center justify-end text-sm">
          <Link to="/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" loading={loading} fullWidth size="lg">Sign in</Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">Sign up free</Link>
      </p>
    </Card>
  );
}
