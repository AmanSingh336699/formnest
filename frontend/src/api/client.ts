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
    const errData = error.response?.data?.error;
    const code = errData?.code;
    let message = errData?.message ?? error.message;

    // Unpack validation field/form errors if present to show the real human message
    if (errData?.details && typeof errData.details === 'object') {
      const details = errData.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
      if (details.formErrors && Array.isArray(details.formErrors) && details.formErrors[0]) {
        message = details.formErrors[0];
      } else if (details.fieldErrors && typeof details.fieldErrors === 'object') {
        const firstFieldList = Object.values(details.fieldErrors).flat();
        if (firstFieldList.length > 0 && firstFieldList[0]) {
          message = firstFieldList[0];
        }
      }
    }

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
    if (status === 403) toast.error(message || "You do not have permission to perform this action.");
    else if (status === 409) toast.error(message || 'A conflict occurred. Please review and try again.');
    else if (status === 429) toast.error('Too many requests. Please slow down and try again shortly.');
    else if (status && status >= 500) toast.error('Something went wrong on our end. Please try again later.');
    else if (!error.response) toast.error('Unable to connect to the server. Please check your internet connection.');

    return Promise.reject({ status, code, message, details: errData?.details, raw: error });
  },
);

export interface NormalizedError {
  status: number | undefined;
  code: string | undefined;
  message: string;
  details?: unknown;
  raw: unknown;
}
