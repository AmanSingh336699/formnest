import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { authApi } from '../../api/services/auth.service';

export function VerifyEmailPage(): JSX.Element {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err?.message ?? 'Verification failed');
      });
  }, [token]);

  return (
    <Card className="w-full max-w-md text-center">
      {status === 'pending' && <p className="text-gray-600">Verifying your email...</p>}
      {status === 'success' && (
        <>
          <h1 className="text-xl font-semibold text-gray-900">Email verified!</h1>
          <p className="mt-2 text-sm text-gray-500">You can now use all features of FormNest.</p>
          <Link to="/dashboard" className="mt-6 inline-block text-sm text-brand-600 hover:underline">Go to dashboard</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="text-xl font-semibold text-red-600">Verification failed</h1>
          <p className="mt-2 text-sm text-gray-500">{errorMsg}</p>
          <Link to="/dashboard" className="mt-6 inline-block text-sm text-brand-600 hover:underline">Go to dashboard</Link>
        </>
      )}
    </Card>
  );
}
