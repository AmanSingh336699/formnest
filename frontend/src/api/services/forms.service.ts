import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ApiEnvelope, Form, FormSummary, FormField, FormTheme, FormSettings } from '../../types';

export interface FormListParams {
  page?: number;
  limit?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  search?: string;
}

export interface FormListResponse {
  items: FormSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateFormInput {
  title: string;
  description?: string;
  fields?: Array<Omit<FormField, 'id'> & { id?: string }>;
  theme?: FormTheme;
  settings?: FormSettings;
}

export interface UpdateFormInput {
  title?: string;
  description?: string | null;
  fields?: Array<Omit<FormField, 'id'> & { id?: string }>;
  theme?: FormTheme;
  settings?: FormSettings;
  customSlug?: string | null;
}

export const formsApi = {
  async list(params: FormListParams = {}): Promise<FormListResponse> {
    const { data } = await api.get<ApiEnvelope<FormSummary[]>>(ENDPOINTS.forms, { params });
    return {
      items: data.data ?? [],
      total: data.meta?.total ?? 0,
      page: data.meta?.page ?? 1,
      limit: data.meta?.limit ?? 20,
    };
  },

  async get(id: string): Promise<Form> {
    const { data } = await api.get<ApiEnvelope<Form>>(ENDPOINTS.form(id));
    if (!data.data) throw new Error('Form not found');
    return data.data;
  },

  async create(input: CreateFormInput): Promise<Form> {
    const { data } = await api.post<ApiEnvelope<Form>>(ENDPOINTS.forms, input);
    if (!data.data) throw new Error('Create form failed');
    return data.data;
  },

  async update(id: string, input: UpdateFormInput): Promise<Form> {
    const { data } = await api.patch<ApiEnvelope<Form>>(ENDPOINTS.form(id), input);
    if (!data.data) throw new Error('Update form failed');
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(ENDPOINTS.form(id));
  },

  async publish(id: string): Promise<Form> {
    const { data } = await api.post<ApiEnvelope<Form>>(ENDPOINTS.publish(id));
    if (!data.data) throw new Error('Publish failed');
    return data.data;
  },

  async close(id: string): Promise<Form> {
    const { data } = await api.post<ApiEnvelope<Form>>(ENDPOINTS.close(id));
    if (!data.data) throw new Error('Close failed');
    return data.data;
  },

  async duplicate(id: string): Promise<Form> {
    const { data } = await api.post<ApiEnvelope<Form>>(ENDPOINTS.duplicate(id));
    if (!data.data) throw new Error('Duplicate failed');
    return data.data;
  },
};
