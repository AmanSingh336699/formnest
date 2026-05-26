import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/services/auth.service';

export function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-900">Check your email</h1>
        <p className="mt-2 text-sm text-gray-500">
          If an account exists for <strong>{email}</strong>, we've sent a password reset link.
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button type="submit" loading={loading} fullWidth size="lg">Send reset link</Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        Remembered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
      </p>
    </Card>
  );
}
