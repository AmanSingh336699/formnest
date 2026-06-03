import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export function RequireAdmin({ children }: { children: ReactNode }): JSX.Element {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && !user.isAdmin) {
      toast.error('Admin access required');
    }
  }, [user]);

  if (!user || !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
