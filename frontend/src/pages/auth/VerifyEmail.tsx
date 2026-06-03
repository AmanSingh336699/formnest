import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/services/auth.service';
import { useAuthStore } from '../../store/authStore';
import type { NormalizedError } from '../../api/client';

export function VerifyEmailPage(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const token = params.get('token') ?? '';
  const initialEmail = params.get('email') ?? user?.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    setStatus('verifying');
    authApi
      .verifyEmail({ token })
      .then(() => {
        if (user) setUser({ ...user, emailVerified: true });
        setStatus('success');
        toast.success('Email verified! Please sign in.');
        navigate('/login?verified=true', { replace: true });
      })
      .catch((err: NormalizedError) => {
        setStatus('error');
        setErrorMsg(err?.message ?? 'Verification failed');
      });
  }, [navigate, setUser, token, user]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedOtp = otp.replace(/\D/g, '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMsg('Enter the email you used during signup.');
      setStatus('error');
      return;
    }
    if (!/^\d{6}$/.test(normalizedOtp)) {
      setErrorMsg('Enter the 6 digit OTP from your email.');
      setStatus('error');
      return;
    }

    setStatus('verifying');
    setErrorMsg('');
    try {
      await authApi.verifyEmail({ email: normalizedEmail, otp: normalizedOtp });
      if (user) setUser({ ...user, emailVerified: true });
      setStatus('success');
      toast.success('Email verified! Please sign in.');
      navigate('/login?verified=true', { replace: true });
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as NormalizedError)?.message ?? 'Verification failed');
    }
  }

  async function handleResend(): Promise<void> {
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMsg('Enter a valid email before requesting a new OTP.');
      setStatus('error');
      return;
    }

    setResending(true);
    setErrorMsg('');
    try {
      await authApi.resendVerification(normalizedEmail);
      toast.success('New OTP sent to your email');
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as NormalizedError)?.message ?? 'Could not resend OTP');
    } finally {
      setResending(false);
    }
  }

  if (token) {
    return (
      <Card className="w-full max-w-md text-center">
        {status === 'verifying' && (
          <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-red-600 dark:text-red-400">
              Verification failed
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{errorMsg}</p>
            <Link
              to="/verify-email"
              className="mt-6 inline-block text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Enter OTP instead
            </Link>
          </>
        )}
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md dark:bg-gray-800/80 dark:backdrop-blur-sm dark:border-gray-700">
      <div className="mb-6 text-center">
        {status === 'success' ? (
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500 dark:text-emerald-400" />
        ) : (
          <MailCheck className="mx-auto mb-3 h-10 w-10 text-brand-600 dark:text-brand-400" />
        )}
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Verify your email</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter the 6 digit OTP sent to your inbox.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
        >
          {errorMsg}
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
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
        <Input
          label="OTP"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoComplete="one-time-code"
          className="text-center font-mono text-lg tracking-[0.35em] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          required
        />
        <Button type="submit" loading={status === 'verifying'} fullWidth size="lg">
          Verify email
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="inline-flex items-center gap-1.5 font-medium text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-brand-400 dark:hover:text-brand-300"
        >
          <RefreshCw size={15} className={resending ? 'animate-spin' : ''} />
          Resend OTP
        </button>
        <Link
          to="/login"
          className="text-gray-500 transition-colors hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
        >
          Back to sign in
        </Link>
      </div>
    </Card>
  );
}