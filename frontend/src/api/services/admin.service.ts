import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  ApiEnvelope,
  AdminStats,
  AdminUserRow,
  AdminUserDetail,
  AdminFormRow,
  AdminApiKeyRow,
  AdminWebhookRow,
  FormSummary,
  ApiKeyRow,
  WebhookRow,
} from '../../types';

export interface AdminUserListParams {
  search?: string;
  page?: number;
  limit?: number;
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  verified?: boolean;
  suspended?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export const adminApi = {
  async getStats(): Promise<AdminStats> {
    const { data } = await api.get<ApiEnvelope<AdminStats>>(ENDPOINTS.admin.stats);
    if (!data.data) throw new Error('Failed to fetch admin stats');
    return data.data;
  },

  async listUsers(params: AdminUserListParams = {}): Promise<{ items: AdminUserRow[]; total: number }> {
    const { data } = await api.get<ApiEnvelope<AdminUserRow[]>>(ENDPOINTS.admin.users, { params });
    return {
      items: data.data ?? [],
      total: data.meta?.total ?? 0,
    };
  },

  async getUser(userId: string): Promise<AdminUserDetail> {
    const { data } = await api.get<ApiEnvelope<AdminUserDetail>>(ENDPOINTS.admin.user(userId));
    if (!data.data) throw new Error('Failed to fetch user detail');
    return data.data;
  },

  async verifyEmail(userId: string, reason: string): Promise<void> {
    await api.post(ENDPOINTS.admin.verifyEmail(userId), { reason });
  },

  async unverifyEmail(userId: string, reason: string): Promise<void> {
    await api.post(ENDPOINTS.admin.unverifyEmail(userId), { reason });
  },

  async resendVerification(userId: string): Promise<void> {
    await api.post(ENDPOINTS.admin.resendVerification(userId));
  },

  async changePlan(userId: string, input: { plan: 'FREE' | 'PRO' | 'ENTERPRISE'; planValidUntil?: string | null; reason: string }): Promise<void> {
    await api.patch(ENDPOINTS.admin.changePlan(userId), input);
  },

  async suspend(userId: string, reason: string): Promise<void> {
    await api.post(ENDPOINTS.admin.suspend(userId), { reason });
  },

  async unsuspend(userId: string, reason: string): Promise<void> {
    await api.post(ENDPOINTS.admin.unsuspend(userId), { reason });
  },

  async revokeSessions(userId: string, reason: string): Promise<void> {
    await api.post(ENDPOINTS.admin.revokeSessions(userId), { reason });
  },

  async getUserForms(userId: string, params: { page?: number; limit?: number } = {}): Promise<{ items: FormSummary[]; total: number }> {
    const { data } = await api.get<ApiEnvelope<FormSummary[]>>(ENDPOINTS.admin.userForms(userId), { params });
    return {
      items: data.data ?? [],
      total: data.meta?.total ?? 0,
    };
  },

  async getUserApiKeys(userId: string): Promise<Omit<ApiKeyRow, 'canReveal'>[]> {
    const { data } = await api.get<ApiEnvelope<Omit<ApiKeyRow, 'canReveal'>[]>>(ENDPOINTS.admin.userApiKeys(userId));
    return data.data ?? [];
  },

  async getUserWebhooks(userId: string): Promise<WebhookRow[]> {
    const { data } = await api.get<ApiEnvelope<WebhookRow[]>>(ENDPOINTS.admin.userWebhooks(userId));
    return data.data ?? [];
  },

  async listForms(params: { search?: string; page?: number; limit?: number } = {}): Promise<{ items: AdminFormRow[]; total: number }> {
    const { data } = await api.get<ApiEnvelope<AdminFormRow[]>>(ENDPOINTS.admin.forms, { params });
    return {
      items: data.data ?? [],
      total: data.meta?.total ?? 0,
    };
  },

  async listApiKeys(params: { search?: string; page?: number; limit?: number } = {}): Promise<{ items: AdminApiKeyRow[]; total: number }> {
    const { data } = await api.get<ApiEnvelope<AdminApiKeyRow[]>>(ENDPOINTS.admin.apiKeys, { params });
    return {
      items: data.data ?? [],
      total: data.meta?.total ?? 0,
    };
  },

  async listFailedWebhooks(params: { search?: string; page?: number; limit?: number } = {}): Promise<{ items: AdminWebhookRow[]; total: number }> {
    const { data } = await api.get<ApiEnvelope<AdminWebhookRow[]>>(ENDPOINTS.admin.failedWebhooks, { params });
    return {
      items: data.data ?? [],
      total: data.meta?.total ?? 0,
    };
  },

  async revokeApiKey(keyId: string, reason: string): Promise<void> {
    await api.post(ENDPOINTS.admin.revokeApiKey(keyId), { reason });
  },

  async disableWebhook(webhookId: string, reason: string): Promise<void> {
    await api.post(ENDPOINTS.admin.disableWebhook(webhookId), { reason });
  },
};
