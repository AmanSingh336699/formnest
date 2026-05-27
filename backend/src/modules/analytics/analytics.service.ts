/**
 * Analytics service. Combines DB counters with Redis daily breakdown.
 */
import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { forms } from '../../../drizzle/schema/forms';
import { NotFoundError } from '../../lib/AppError';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';
import { safeRedis } from '../../lib/redisSafe';

export interface AnalyticsSummary {
  totalViews: number;
  totalStarts: number;
  totalResponses: number;
  completionRate: number;
  daily: Array<{ date: string; views: number; completions: number }>;
}

function lastNDays(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export const analyticsService = {
  async forForm(user: AuthenticatedUser, formId: string, days = 7): Promise<AnalyticsSummary> {
    const [form] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.userId, user.id)))
      .limit(1);
    if (!form) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');

    const dates = lastNDays(days);
    const viewsKeys = dates.map((d) => `analytics:${formId}:${d}:views`);
    const completionsKeys = dates.map((d) => `analytics:${formId}:${d}:completions`);

    const [viewVals, compVals] = await Promise.all([
      safeRedis('analytics:views:mget', () => redis.mget(...viewsKeys)),
      safeRedis('analytics:completions:mget', () => redis.mget(...completionsKeys)),
    ]);

    const daily = dates.map((date, i) => ({
      date,
      views: Number(viewVals?.[i] ?? '0'),
      completions: Number(compVals?.[i] ?? '0'),
    }));

    const totalViews = form.totalViews;
    const totalStarts = form.totalStarts;
    const totalResponses = form.totalResponses;
    const completionRate = totalStarts > 0 ? Math.round((totalResponses / totalStarts) * 100) : 0;

    return { totalViews, totalStarts, totalResponses, completionRate, daily };
  },
};
