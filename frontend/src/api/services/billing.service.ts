import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ApiEnvelope } from '../../types';

export const billingApi = {
  async checkout(plan: 'PRO' | 'ENTERPRISE', interval: 'monthly' | 'yearly'): Promise<{ url: string }> {
    const { data } = await api.post<ApiEnvelope<{ url: string }>>(ENDPOINTS.checkout, { plan, interval });
    if (!data.data) throw new Error('Checkout failed');
    return data.data;
  },
  async portal(): Promise<{ url: string }> {
    const { data } = await api.post<ApiEnvelope<{ url: string }>>(ENDPOINTS.portal);
    if (!data.data) throw new Error('Portal failed');
    return data.data;
  },
};
