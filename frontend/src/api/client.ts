/**
 * Axios client with auth, refresh-token queue, request-id, error normalization.
 */
import axios, { type AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { env } from '../lib/env';
import { useAuthStore } from '../store/authStore';
import type { ApiEnvelope } from '../types';

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  timeout: 30000,
});

interface RefreshSubscriber {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

let isRefreshing = false;
let refreshSubscribers: RefreshSubscriber[] = [];

function subscribeTokenRefresh(): Promise<string> {
  return new Promise((resolve, reject) => {
    refreshSubscribers.push({ resolve, reject });
  });
}

function notifySubscribers(token: string | null, err?: unknown): void {
  refreshSubscribers.forEach((sub) => {
    if (token) sub.resolve(token);
    else sub.reject(err);
  });
  refreshSubscribers = [];
}

async function callRefresh(): Promise<string> {
  const resp = await axios.post<ApiEnvelope<{ accessToken: string; user: unknown }>>(
    `${env.apiUrl}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const token = resp.data.data?.accessToken;
  if (!token) throw new Error('No access token from refresh');
  return token;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    const message = error.response?.data?.error?.message ?? error.message;

    // Skip refresh attempts for refresh endpoint itself
    const isRefreshEndpoint = original?.url?.includes('/auth/refresh');

    if (status === 401 && !original?._retried && !isRefreshEndpoint) {
      original._retried = true;

      if (isRefreshing) {
        const token = await subscribeTokenRefresh();
        original.headers.set('Authorization', `Bearer ${token}`);
        return api(original);
      }

      isRefreshing = true;
      try {
        const newToken = await callRefresh();
        useAuthStore.getState().setAccessToken(newToken);
        notifySubscribers(newToken);
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return await api(original);
      } catch (refreshErr) {
        notifySubscribers(null, refreshErr);
        useAuthStore.getState().clear();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?session=expired';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Side-effects per status (toast etc) — but pass error through for component handling
    if (status === 403) toast.error(message || "You don't have permission");
    else if (status === 409) toast.error(message || 'Conflict');
    else if (status === 429) toast.error(message || 'Too many requests — slow down a bit');
    else if (status && status >= 500) toast.error('Something went wrong. Our team has been notified.');
    else if (!error.response) toast.error('Check your internet connection');

    return Promise.reject({ status, code, message, raw: error });
  },
);

export interface NormalizedError {
  status: number | undefined;
  code: string | undefined;
  message: string;
  raw: unknown;
}
