import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { responses, responseAnswers, type Response, type ResponseAnswer } from '../../../drizzle/schema/responses';
import { forms } from '../../../drizzle/schema/forms';
import { NotFoundError, ForbiddenError } from '../../lib/AppError';
import { recordAudit } from '../../lib/auditLog';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';

async function assertFormOwnership(formId: string, userId: string): Promise<void> {
  const [row] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.userId, userId)))
    .limit(1);
  if (!row) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');
}

export interface ResponseWithAnswers extends Response {
  answers: ResponseAnswer[];
}

export const responsesService = {
  async listByForm(
    user: AuthenticatedUser,
    formId: string,
    params: { page: number; limit: number; includeSpam: boolean; sort: 'createdAt' | '-createdAt' },
  ): Promise<{ items: Response[]; total: number }> {
    await assertFormOwnership(formId, user.id);

    const conditions = [eq(responses.formId, formId)];
    if (!params.includeSpam) conditions.push(eq(responses.isSpam, false));
    const where = and(...conditions);

    const orderBy = params.sort === '-createdAt' ? desc(responses.createdAt) : asc(responses.createdAt);

    const offset = (params.page - 1) * params.limit;
    const [items, totalRow] = await Promise.all([
      db.select().from(responses).where(where).orderBy(orderBy).limit(params.limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(responses).where(where),
    ]);

    return { items, total: totalRow[0]?.count ?? 0 };
  },

  async getOne(user: AuthenticatedUser, responseId: string): Promise<ResponseWithAnswers> {
    const [row] = await db
      .select({ response: responses, formUserId: forms.userId })
      .from(responses)
      .innerJoin(forms, eq(forms.id, responses.formId))
      .where(eq(responses.id, responseId))
      .limit(1);
    if (!row) throw new NotFoundError('Response not found');
    if (row.formUserId !== user.id) throw new ForbiddenError();

    const answers = await db
      .select()
      .from(responseAnswers)
      .where(eq(responseAnswers.responseId, responseId));
    return { ...row.response, answers };
  },

  async delete(user: AuthenticatedUser, responseId: string, ctx: { ip: string | null; ua: string | null }): Promise<void> {
    const existing = await this.getOne(user, responseId);

    await db.transaction(async (tx) => {
      await tx.delete(responses).where(eq(responses.id, responseId));
      // Decrement form counter
      if (!existing.isSpam) {
        await tx
          .update(forms)
          .set({ totalResponses: sql`GREATEST(${forms.totalResponses} - 1, 0)` })
          .where(eq(forms.id, existing.formId));
      }
    });

    await recordAudit({
      userId: user.id,
      entityType: 'response',
      entityId: responseId,
      action: 'DELETE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async markSpam(user: AuthenticatedUser, responseId: string, isSpam: boolean): Promise<void> {
    const existing = await this.getOne(user, responseId);
    if (existing.isSpam === isSpam) return;

    await db.transaction(async (tx) => {
      await tx
        .update(responses)
        .set({ isSpam, spamReason: isSpam ? 'manual' : null })
        .where(eq(responses.id, responseId));

      if (isSpam) {
        await tx
          .update(forms)
          .set({ totalResponses: sql`GREATEST(${forms.totalResponses} - 1, 0)` })
          .where(eq(forms.id, existing.formId));
      } else {
        await tx
          .update(forms)
          .set({ totalResponses: sql`${forms.totalResponses} + 1` })
          .where(eq(forms.id, existing.formId));
      }
    });
  },
};
