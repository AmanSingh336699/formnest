import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ApiEnvelope, WebhookRow, WebhookDeliveryRow } from '../../types';

export interface CreatedWebhook extends WebhookRow {
  secret: string;
}

export const webhooksApi = {
  async list(formId: string): Promise<WebhookRow[]> {
    const { data } = await api.get<ApiEnvelope<WebhookRow[]>>(ENDPOINTS.formWebhooks(formId));
    return data.data ?? [];
  },

  async create(formId: string, url: string, events: string[]): Promise<CreatedWebhook> {
    const { data } = await api.post<ApiEnvelope<CreatedWebhook>>(ENDPOINTS.formWebhooks(formId), { url, events });
    if (!data.data) throw new Error('Create webhook failed');
    return data.data;
  },

  async update(id: string, body: Partial<{ url: string; events: string[]; isActive: boolean }>): Promise<WebhookRow> {
    const { data } = await api.patch<ApiEnvelope<WebhookRow>>(ENDPOINTS.webhook(id), body);
    if (!data.data) throw new Error('Update webhook failed');
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(ENDPOINTS.webhook(id));
  },

  async test(id: string): Promise<{ deliveryId: string }> {
    const { data } = await api.post<ApiEnvelope<{ deliveryId: string }>>(ENDPOINTS.testWebhook(id));
    if (!data.data) throw new Error('Test webhook failed');
    return data.data;
  },

  async listDeliveries(
    id: string,
    params: { page?: number; limit?: number; status?: string } = {},
  ): Promise<{ items: WebhookDeliveryRow[]; total: number; page: number; limit: number }> {
    const { data } = await api.get<ApiEnvelope<WebhookDeliveryRow[]>>(ENDPOINTS.webhookDeliveries(id), { params });
    return {
      items: data.data ?? [],
      total: data.meta?.total ?? 0,
      page: data.meta?.page ?? 1,
      limit: data.meta?.limit ?? 50,
    };
  },

  async retryDelivery(webhookId: string, deliveryId: string): Promise<void> {
    await api.post(ENDPOINTS.retryDelivery(webhookId, deliveryId));
  },
};
