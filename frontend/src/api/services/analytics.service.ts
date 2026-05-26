import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ApiEnvelope, AnalyticsSummary } from '../../types';

export const analyticsApi = {
  async forForm(formId: string, days = 7): Promise<AnalyticsSummary> {
    const { data } = await api.get<ApiEnvelope<AnalyticsSummary>>(ENDPOINTS.formAnalytics(formId), {
      params: { days },
    });
    if (!data.data) throw new Error('Analytics fetch failed');
    return data.data;
  },
};
