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

const transporter: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

function loadTemplate(name: string): HandlebarsTemplateDelegate {
  const cached = templateCache.get(name);
  if (cached) return cached;

  const templatePath = path.join(process.cwd(), 'templates', `${name}.hbs`);
  if (!fs.existsSync(templatePath)) {
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
  template: string;
  variables: Record<string, unknown>;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const tpl = loadTemplate(params.template);
  const html = tpl(params.variables);

  await transporter.sendMail({
    from: `"${env.FROM_NAME}" <${env.FROM_EMAIL}>`,
    to: params.to,
    subject: params.subject,
    html,
  });

  logger.info({ to: params.to, template: params.template }, 'Email sent');
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
