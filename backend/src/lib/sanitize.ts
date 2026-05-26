/**
 * Server-side HTML sanitization for user-supplied rich content.
 * Use whenever rendering user text back into HTML contexts.
 */
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'u', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  });
}

export function sanitizePlainText(input: string, maxLength = 10000): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, '') // strip control chars
    .slice(0, maxLength)
    .trim();
}

/** Generate a slug-safe ascii string, 8 chars cuid-style. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
