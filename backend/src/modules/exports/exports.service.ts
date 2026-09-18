import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { forms, formFields, type FormField } from '../../../drizzle/schema/forms';
import { responses, responseAnswers } from '../../../drizzle/schema/responses';
import { NotFoundError, ForbiddenError } from '../../lib/AppError';
import { EXPORT_LIMITS } from '../../lib/constants';
import { recordAudit } from '../../lib/auditLog';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str: string;
  if (typeof value === 'object') {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const exportsService = {
  async exportFormCsv(
    user: AuthenticatedUser,
    formId: string,
    options: { includeSpam: boolean },
  ): Promise<{ filename: string; csv: string }> {
    const [form] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.userId, user.id)))
      .limit(1);
    if (!form) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');

    const fields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, formId))
      .orderBy(formFields.position);

    const inputFields: FormField[] = fields.filter((f) => f.type !== 'HEADING' && f.type !== 'DIVIDER');

    const conditions = [eq(responses.formId, formId)];
    if (!options.includeSpam) conditions.push(eq(responses.isSpam, false));

    const rows = await db
      .select()
      .from(responses)
      .where(and(...conditions))
      .orderBy(desc(responses.createdAt))
      .limit(EXPORT_LIMITS.maxRows);

    if (rows.length === 0) {
      const headers = ['response_id', 'submitted_at', ...inputFields.map((f) => f.label)];
      const csv = `\uFEFF${headers.map(escapeCsvCell).join(',')}\n`;
      return { filename: this.buildFilename(form.title), csv };
    }

    const responseIds = rows.map((r) => r.id);
    const answers = await db
      .select()
      .from(responseAnswers)
      .where(sql`${responseAnswers.responseId} IN (${sql.join(responseIds.map((id) => sql`${id}`), sql`, `)})`);

    // Map: responseId -> fieldId -> value
    const answerMap = new Map<string, Map<string, unknown>>();
    for (const a of answers) {
      if (!answerMap.has(a.responseId)) answerMap.set(a.responseId, new Map());
      answerMap.get(a.responseId)!.set(a.fieldId, a.value);
    }

    const header = ['response_id', 'submitted_at', ...inputFields.map((f) => f.label)];
    const lines: string[] = [header.map(escapeCsvCell).join(',')];

    for (const r of rows) {
      const ans = answerMap.get(r.id);
      const row = [
        r.id,
        r.createdAt.toISOString(),
        ...inputFields.map((f) => (ans?.get(f.id) ?? '')),
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }

    const csv = `\uFEFF${lines.join('\n')}\n`;

    await recordAudit({
      userId: user.id,
      entityType: 'form',
      entityId: formId,
      action: 'EXPORT',
      diff: { rowCount: rows.length, includeSpam: options.includeSpam },
    });

    return { filename: this.buildFilename(form.title), csv };
  },

  buildFilename(title: string): string {
    const safe = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'form';
    const ts = new Date().toISOString().slice(0, 10);
    return `${safe}-responses-${ts}.csv`;
  },
};

// suppress
void ForbiddenError;
