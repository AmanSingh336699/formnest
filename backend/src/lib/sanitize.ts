/**
 * Lightweight server-side sanitization helpers.
 * No JSDOM / browser dependency — safe for Node 20 on Render free tier.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes HTML special characters to prevent XSS.
 * Use this instead of full DOM-based sanitisation where rich-HTML is not needed.
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

/**
 * Strip all HTML tags from a string, leaving only text content.
 */
export function stripHtmlTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // remove all HTML tags
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

export function sanitizePlainText(input: string, maxLength = 10000): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, '') // strip control chars
    .slice(0, maxLength)
    .trim();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
