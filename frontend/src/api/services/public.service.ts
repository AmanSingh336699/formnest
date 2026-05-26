/**
 * Unauthenticated public form fetch + submit.
 * Uses a separate axios instance to avoid auth interceptor side-effects.
 */
import axios from 'axios';
import { env } from '../../lib/env';
import { ENDPOINTS } from '../endpoints';
import type { ApiEnvelope, Form } from '../../types';

const publicAxios = axios.create({
  baseURL: env.apiUrl,
  timeout: 30000,
});

export interface SubmitResult {
  responseId: string;
  redirectUrl: string | null;
  successMessage: string | null;
  branding: boolean;
}

export const publicApi = {
  async getBySlug(slug: string): Promise<Form> {
    const { data } = await publicAxios.get<ApiEnvelope<Form>>(ENDPOINTS.publicForm(slug));
    if (!data.data) throw new Error('Form not found');
    return data.data;
  },

  async trackStart(formId: string): Promise<void> {
    await publicAxios.post(ENDPOINTS.publicStart(formId)).catch(() => undefined);
  },

  async submit(
    formId: string,
    body: {
      answers: Record<string, unknown>;
      loadedAt: number;
      submittedAt: number;
      referrer?: string;
      [key: string]: unknown;
    },
    idempotencyKey: string,
  ): Promise<SubmitResult> {
    const { data } = await publicAxios.post<ApiEnvelope<SubmitResult>>(
      ENDPOINTS.publicSubmit(formId),
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    if (!data.data) throw new Error('Submit failed');
    return data.data;
  },
};
