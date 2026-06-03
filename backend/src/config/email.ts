/**
 * Nodemailer transport + Handlebars template rendering.
 * Provider-agnostic via SMTP. Switch to Resend SDK in Phase 2 if needed.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './env';
import { logger } from './logger';
import {
  EMAIL_TEMPLATE_NAMES,
  EMAIL_TEMPLATE_REQUIRED_VARIABLES,
  type EmailTemplateName,
  type EmailTemplateVariables,
} from '../lib/emailTemplates';

const transporter: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

const templateCache = new Map<EmailTemplateName, HandlebarsTemplateDelegate>();

function loadTemplate(name: EmailTemplateName): HandlebarsTemplateDelegate {
  const cached = templateCache.get(name);
  if (cached) return cached;

  const templateFile = `${name}.hbs`;
  const templateCandidates = [
    path.join(process.cwd(), 'templates', templateFile),
    path.join(process.cwd(), 'backend', 'templates', templateFile),
    path.resolve(__dirname, '../../templates', templateFile),
    path.resolve(__dirname, '../../../templates', templateFile),
  ];
  const templatePath = templateCandidates.find((candidate) => fs.existsSync(candidate));
  if (!templatePath) {
    throw new Error(`Email template not found: ${name}`);
  }
  const source = fs.readFileSync(templatePath, 'utf8');
  const compiled = Handlebars.compile(source, { noEscape: false });
  templateCache.set(name, compiled);
  return compiled;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  template: EmailTemplateName;
  variables: EmailTemplateVariables[EmailTemplateName];
}

function assertTemplateVariables(name: EmailTemplateName, variables: Record<string, unknown>): void {
  const missing = EMAIL_TEMPLATE_REQUIRED_VARIABLES[name].filter((key) => variables[String(key)] === undefined || variables[String(key)] === null);
  if (missing.length > 0) {
    throw new Error(`Missing variables for email template "${name}": ${missing.join(', ')}`);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  assertTemplateVariables(params.template, params.variables);
  const tpl = loadTemplate(params.template);
  const html = tpl(params.variables);

  await transporter.sendMail({
    from: `"${env.FROM_NAME}" <${env.FROM_EMAIL}>`,
    to: params.to,
    subject: params.subject,
    html,
    text: htmlToText(html),
  });

  logger.info({ to: params.to, template: params.template }, 'Email sent');
}

export function validateEmailTemplates(): void {
  for (const name of EMAIL_TEMPLATE_NAMES) {
    loadTemplate(name);
  }
}

export async function verifyEmailTransport(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (err) {
    logger.error({ err }, 'SMTP verification failed');
    return false;
  }
}
