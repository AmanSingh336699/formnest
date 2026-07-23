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

async function getGmailAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }).toString(),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Google access token: ${error}`);
  }
  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function sendViaGmailApi(mailOptions: nodemailer.SendMailOptions): Promise<void> {
  const streamTransporter = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const info = await streamTransporter.sendMail(mailOptions);
  const rawBase64Url = (info.message as Buffer).toString('base64url');

  const accessToken = await getGmailAccessToken();
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawBase64Url }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API Error: ${response.status} ${errorText}`);
  }
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  assertTemplateVariables(params.template, params.variables);
  const tpl = loadTemplate(params.template);
  const html = tpl(params.variables);

  const mailOptions = {
    from: `"${env.FROM_NAME}" <${env.FROM_EMAIL}>`,
    to: params.to,
    subject: params.subject,
    html,
    text: htmlToText(html),
  };

  if (env.GOOGLE_REFRESH_TOKEN && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    await sendViaGmailApi(mailOptions);
  } else {
    await transporter.sendMail(mailOptions);
  }

  logger.info({ to: params.to, template: params.template }, 'Email sent');
}

export function validateEmailTemplates(): void {
  for (const name of EMAIL_TEMPLATE_NAMES) {
    loadTemplate(name);
  }
}

export async function verifyEmailTransport(): Promise<boolean> {
  if (env.GOOGLE_REFRESH_TOKEN && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    try {
      await getGmailAccessToken();
      return true;
    } catch (err) {
      logger.error({ err }, 'Gmail API OAuth verification failed');
      return false;
    }
  }

  try {
    await transporter.verify();
    return true;
  } catch (err) {
    logger.error({ err }, 'SMTP verification failed');
    return false;
  }
}
