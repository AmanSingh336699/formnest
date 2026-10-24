import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/services/auth.service';
import toast from 'react-hot-toast';
import type { NormalizedError } from '../../api/client';

export function ResetPasswordPage(): JSX.Element {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function validate(): boolean {
    if (!token) {
      setError('Missing reset token. Please use the link sent to your email.');
      return false;
    }
    if (!password) {
      setError('Please enter your new password');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    const checks = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
    if (checks < 3) {
      setError('Password must contain at least 3 of: uppercase, lowercase, digit, symbol');
      return false;
    }
    setError('');
    return true;
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Password reset successfully! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      setError((err as NormalizedError)?.message ?? 'Unable to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
        <p className="mt-1 text-sm text-gray-500">Choose a new, secure password for your account.</p>
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          type={showPassword ? 'text' : 'password'}
          label="New password"
          placeholder="Enter new password (min. 8 characters)"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError('');
          }}
          autoComplete="new-password"
          required
          helpText="Min 8 chars with 3 of: uppercase, lowercase, digit, symbol"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={!password}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          inputClassName="pr-10"
        />
        <Button type="submit" loading={loading} fullWidth size="lg">Reset password</Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        <Link to="/login" className="font-medium text-brand-600 hover:underline">Back to sign in</Link>
      </p>
    </Card>
  );
}
