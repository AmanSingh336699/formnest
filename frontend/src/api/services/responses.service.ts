import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import { env } from '../../lib/env';
import type { ApiEnvelope, ResponseRow, ResponseDetail } from '../../types';
import { useAuthStore } from '../../store/authStore';

export interface ListResponsesParams {
  page?: number;
  limit?: number;
  includeSpam?: boolean;
  sort?: 'createdAt' | '-createdAt';
}

export const responsesApi = {
  async listForForm(
    formId: string,
    params: ListResponsesParams = {},
  ): Promise<{ items: ResponseRow[]; total: number; page: number; limit: number }> {
    const { data } = await api.get<ApiEnvelope<ResponseRow[]>>(ENDPOINTS.formResponses(formId), { params });
    return {
      items: data.data ?? [],
      total: data.meta?.total ?? 0,
      page: data.meta?.page ?? 1,
      limit: data.meta?.limit ?? 50,
    };
  },

  async get(id: string): Promise<ResponseDetail> {
    const { data } = await api.get<ApiEnvelope<ResponseDetail>>(ENDPOINTS.response(id));
    if (!data.data) throw new Error('Response not found');
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(ENDPOINTS.response(id));
  },

  async markSpam(id: string, isSpam: boolean): Promise<void> {
    await api.post(ENDPOINTS.responseSpam(id), { isSpam });
  },

  /** Trigger CSV download via direct browser fetch (preserves auth + content-disposition) */
  async downloadCsv(formId: string, includeSpam = false): Promise<void> {
    const token = useAuthStore.getState().accessToken;
    const url = `${env.apiUrl}${ENDPOINTS.formExport(formId)}?includeSpam=${includeSpam}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      credentials: 'include',
    });
    if (!resp.ok) throw new Error('Export failed');
    const blob = await resp.blob();
    const cd = resp.headers.get('Content-Disposition') ?? '';
    const match = cd.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `responses-${formId}.csv`;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },
};
