/**
 * Frontend-only types. Do NOT share with backend.
 * Backend contract respected via OpenAPI spec.
 */

export type UserPlan = 'FREE' | 'PRO' | 'ENTERPRISE';
export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

export type FieldType =
  | 'TEXT_SHORT'
  | 'TEXT_LONG'
  | 'EMAIL'
  | 'NUMBER'
  | 'PHONE'
  | 'RADIO'
  | 'CHECKBOX'
  | 'DROPDOWN'
  | 'DATE'
  | 'RATING'
  | 'YES_NO'
  | 'HEADING'
  | 'DIVIDER';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  emailVerified: boolean;
  avatarUrl?: string | null;
  locale?: string;
  timezone?: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  integerOnly?: boolean;
  regex?: string;
  customError?: string;
  minDate?: string;
  maxDate?: string;
}

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FieldOptions {
  choices?: FieldOption[];
  ratingType?: 'stars' | 'hearts' | 'thumbs';
  ratingMax?: number;
  defaultValue?: string | number | boolean | null;
  searchable?: boolean;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string | null;
  helpText?: string | null;
  required: boolean;
  position: number;
  validation?: FieldValidation | null;
  options?: FieldOptions | null;
}

export interface FormTheme {
  preset?: 'clean' | 'bold' | 'minimal' | 'custom';
  backgroundColor?: string;
  textColor?: string;
  primaryColor?: string;
  buttonColor?: string;
  borderRadius?: 'sharp' | 'rounded' | 'pill';
  fontFamily?: 'Inter' | 'Roboto' | 'Poppins';
  logoUrl?: string;
}

export interface FormSettings {
  allowMultipleSubmissions?: boolean;
  showProgressBar?: boolean;
  redirectUrl?: string;
  successMessage?: string;
  closedMessage?: string;
  limitReachedMessage?: string;
  maxResponses?: number;
  notifyOnResponse?: boolean;
  notifyEmails?: string[];
  showBranding?: boolean;
}

export interface FormSummary {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  customSlug: string | null;
  status: FormStatus;
  totalResponses: number;
  totalViews: number;
  totalStarts: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Form extends FormSummary {
  theme: FormTheme | null;
  settings: FormSettings | null;
  fields: FormField[];
}

export interface ResponseRow {
  id: string;
  formId: string;
  submitterIpHash: string | null;
  userAgent: string | null;
  referrer: string | null;
  completionTimeMs: number | null;
  isSpam: boolean;
  spamReason: string | null;
  createdAt: string;
}

export interface ResponseAnswer {
  id: string;
  fieldId: string;
  fieldType: FieldType;
  value: unknown;
  createdAt: string;
}

export interface ResponseDetail extends ResponseRow {
  answers: ResponseAnswer[];
}

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface WebhookRow {
  id: string;
  formId: string;
  url: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  autoDisabledAt: string | null;
  createdAt: string;
}

export interface WebhookDeliveryRow {
  id: string;
  webhookId: string;
  eventType: string;
  httpStatus: number | null;
  responseBody: string | null;
  durationMs: number | null;
  attempt: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'DEAD';
  errorMessage: string | null;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalViews: number;
  totalStarts: number;
  totalResponses: number;
  completionRate: number;
  daily: Array<{ date: string; views: number; completions: number }>;
}

export interface TeamRow {
  id: string;
  name: string;
  ownerId: string;
  plan: UserPlan;
  createdAt: string;
}

export interface TeamMemberRow {
  id: string;
  teamId: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: 'OWNER' | 'MEMBER';
  status: 'INVITED' | 'ACTIVE' | 'REMOVED';
  invitedAt: string;
  joinedAt: string | null;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  nextCursor?: string | null;
  requestId?: string;
}

export interface ApiEnvelope<T> {
  data?: T;
  meta?: ApiMeta;
  error?: { code: string; message: string; details?: unknown };
}
