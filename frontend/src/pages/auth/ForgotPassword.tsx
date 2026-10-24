import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/services/auth.service';
import type { NormalizedError } from '../../api/client';

export function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  function validate(): boolean {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address (e.g. name@example.com)');
      return false;
    }
    setError('');
    return true;
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      const msg = (err as NormalizedError)?.message ?? 'Unable to send reset link. Please try again later.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-900">Check your email</h1>
        <p className="mt-2 text-sm text-gray-500">
          If an account exists for <strong>{email.trim()}</strong>, we've sent a password reset link.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm text-brand-600 hover:underline">Back to sign in</Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Forgot password?</h1>
        <p className="mt-1 text-sm text-gray-500">We'll send you a link to reset it.</p>
      </div>
      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
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
            if (error) setError('');
          }}
          autoComplete="email"
          required
          error={error}
        />
        <Button type="submit" loading={loading} fullWidth size="lg">Send reset link</Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        Remembered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
      </p>
    </Card>
  );
}
