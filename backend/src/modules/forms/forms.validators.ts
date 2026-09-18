import { z } from 'zod';

export const FIELD_TYPES = [
  'TEXT_SHORT',
  'TEXT_LONG',
  'PASSWORD',
  'EMAIL',
  'NUMBER',
  'PHONE',
  'RADIO',
  'CHECKBOX',
  'DROPDOWN',
  'DATE',
  'RATING',
  'YES_NO',
  'FILE_UPLOAD',
  'HEADING',
  'DIVIDER',
] as const;

export const FieldValidationSchema = z
  .object({
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(1).max(10000).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    integerOnly: z.boolean().optional(),
    regex: z.string().max(500).optional(),
    customError: z.string().max(200).optional(),
    minDate: z.string().optional(),
    maxDate: z.string().optional(),
  })
  .strict()
  .nullable()
  .optional();

export const FieldOptionsSchema = z
  .object({
    choices: z
      .array(
        z.object({
          id: z.string().min(1).max(50),
          label: z.string().min(1).max(200),
          value: z.string().min(1).max(200),
        }),
      )
      .max(100)
      .optional(),
    ratingType: z.enum(['stars', 'hearts', 'thumbs']).optional(),
    ratingMax: z.number().int().min(3).max(10).optional(),
    defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
    searchable: z.boolean().optional(),
    visibility: z
      .object({
        mode: z.enum(['all', 'any']).optional(),
        rules: z
          .array(
            z.object({
              fieldId: z.string().min(1).max(50),
              operator: z.enum(['equals', 'notEquals', 'contains', 'notEmpty', 'empty']),
              value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]).optional(),
            }),
          )
          .max(20)
          .optional(),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict()
  .nullable()
  .optional();

export const FormFieldInputSchema = z
  .object({
    id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/).optional(),
    type: z.enum(FIELD_TYPES),
    label: z.string().min(1).max(200),
    placeholder: z.string().max(200).nullable().optional(),
    helpText: z.string().max(500).nullable().optional(),
    required: z.boolean().default(false),
    position: z.number().int().min(0),
    validation: FieldValidationSchema,
    options: FieldOptionsSchema,
  })
  .strict();

export const FormThemeSchema = z
  .object({
    preset: z.enum(['clean', 'bold', 'minimal', 'custom']).optional(),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    borderRadius: z.enum(['sharp', 'rounded', 'pill']).optional(),
    fontFamily: z.enum(['Inter', 'Roboto', 'Poppins']).optional(),
    logoUrl: z.string().url().optional(),
  })
  .strict()
  .optional();

export const FormSettingsSchema = z
  .object({
    allowMultipleSubmissions: z.boolean().optional(),
    showProgressBar: z.boolean().optional(),
    redirectUrl: z.string().url().startsWith('https://').optional(),
    successMessage: z.string().max(1000).optional(),
    closedMessage: z.string().max(1000).optional(),
    limitReachedMessage: z.string().max(1000).optional(),
    maxResponses: z.number().int().positive().max(1_000_000).optional(),
    notifyOnResponse: z.boolean().optional(),
    notifyEmails: z.array(z.string().email()).max(5).optional(),
    showBranding: z.boolean().optional(),
    closeOnDate: z.string().datetime().optional(),
  })
  .strict()
  .optional();

export const CreateFormBodySchema = z
  .object({
    title: z.preprocess((val) => {
      if (typeof val === 'string' && val.trim() === '') {
        return 'Untitled form';
      }
      return val;
    }, z.string().min(1).max(200)),
    description: z.string().max(1000).optional(),
    fields: z.array(FormFieldInputSchema).max(100).optional(),
    theme: FormThemeSchema,
    settings: FormSettingsSchema,
  })
  .strict();
export type CreateFormBody = z.infer<typeof CreateFormBodySchema>;

export const UpdateFormBodySchema = z
  .object({
    title: z
      .preprocess((val) => {
        if (typeof val === 'string' && val.trim() === '') {
          return 'Untitled form';
        }
        return val;
      }, z.string().min(1).max(200))
      .optional(),
    description: z.string().max(1000).nullable().optional(),
    fields: z.array(FormFieldInputSchema).max(100).optional(),
    theme: FormThemeSchema,
    settings: FormSettingsSchema,
    customSlug: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, digits, hyphens')
      .nullable()
      .optional(),
  })
  .strict();
export type UpdateFormBody = z.infer<typeof UpdateFormBodySchema>;

export const FormIdParamsSchema = z.object({ id: z.string().min(1).max(50) });

export const ListFormsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
    search: z.string().max(100).optional(),
  })
  .strict();

export const FormResponseSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    slug: z.string(),
    customSlug: z.string().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']),
    theme: z.unknown().nullable(),
    settings: z.unknown().nullable(),
    totalResponses: z.number().int(),
    totalViews: z.number().int(),
    totalStarts: z.number().int(),
    publishedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  fields: z.array(z.unknown()).optional(),
});
