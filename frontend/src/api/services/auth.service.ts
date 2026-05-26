import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ApiEnvelope, User } from '../../types';

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresInSec: number;
}

export const authApi = {
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const { data } = await api.post<ApiEnvelope<AuthResponse>>(ENDPOINTS.auth.register, { email, password, name });
    if (!data.data) throw new Error('Empty register response');
    return data.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<ApiEnvelope<AuthResponse>>(ENDPOINTS.auth.login, { email, password });
    if (!data.data) throw new Error('Empty login response');
    return data.data;
  },

  async logout(): Promise<void> {
    await api.post(ENDPOINTS.auth.logout);
  },

  async verifyEmail(token: string): Promise<void> {
    await api.post(ENDPOINTS.auth.verifyEmail, { token });
  },

  async resendVerification(email: string): Promise<void> {
    await api.post(ENDPOINTS.auth.resendVerification, { email });
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post(ENDPOINTS.auth.forgotPassword, { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post(ENDPOINTS.auth.resetPassword, { token, password });
  },
};
