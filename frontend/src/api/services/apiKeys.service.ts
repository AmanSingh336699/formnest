import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ApiEnvelope, ApiKeyRow } from '../../types';

export interface CreatedApiKey extends ApiKeyRow {
  rawKey: string;
}

export const apiKeysApi = {
  async list(): Promise<ApiKeyRow[]> {
    const { data } = await api.get<ApiEnvelope<ApiKeyRow[]>>(ENDPOINTS.apiKeys);
    return data.data ?? [];
  },

  async create(name: string): Promise<CreatedApiKey> {
    const { data } = await api.post<ApiEnvelope<CreatedApiKey>>(ENDPOINTS.apiKeys, { name });
    if (!data.data) throw new Error('Create API key failed');
    return data.data;
  },

  async revoke(id: string): Promise<void> {
    await api.delete(ENDPOINTS.apiKey(id));
  },

  async reveal(id: string): Promise<string> {
    const { data } = await api.get<ApiEnvelope<{ rawKey: string }>>(ENDPOINTS.revealApiKey(id));
    if (!data.data?.rawKey) throw new Error('Failed to reveal API key');
    return data.data.rawKey;
  },
};
