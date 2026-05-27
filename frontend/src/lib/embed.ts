import type { FormTheme } from '../types';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const EMBED_THEME_KEYS = ['backgroundColor', 'textColor', 'primaryColor', 'buttonColor', 'fontFamily', 'borderRadius'] as const;

type EmbedThemeKey = (typeof EMBED_THEME_KEYS)[number];

export type EmbedThemeOverrides = Pick<
  FormTheme,
  'backgroundColor' | 'textColor' | 'primaryColor' | 'buttonColor' | 'fontFamily' | 'borderRadius'
>;

export interface EmbedSnippetOptions {
  slug: string;
  publicUrl: string;
  theme?: EmbedThemeOverrides | null;
}

function isEmbedThemeKey(value: string): value is EmbedThemeKey {
  return (EMBED_THEME_KEYS as readonly string[]).includes(value);
}

function readColor(params: URLSearchParams, key: EmbedThemeKey): string | undefined {
  const value = params.get(key);
  return value && HEX_COLOR_RE.test(value) ? value : undefined;
}

export function getEmbedThemeOverrides(params: URLSearchParams): EmbedThemeOverrides {
  const overrides: EmbedThemeOverrides = {};

  for (const key of EMBED_THEME_KEYS) {
    if (!isEmbedThemeKey(key)) continue;

    if (key === 'fontFamily') {
      const value = params.get(key);
      if (value === 'Inter' || value === 'Roboto' || value === 'Poppins') overrides.fontFamily = value;
      continue;
    }

    if (key === 'borderRadius') {
      const value = params.get(key);
      if (value === 'sharp' || value === 'rounded' || value === 'pill') overrides.borderRadius = value;
      continue;
    }

    const color = readColor(params, key);
    if (color) overrides[key] = color;
  }

  return overrides;
}

export function mergeEmbedTheme(baseTheme: FormTheme | null | undefined, params: URLSearchParams): FormTheme {
  return { ...(baseTheme ?? {}), ...getEmbedThemeOverrides(params) };
}

export function buildEmbedUrl(publicUrl: string, theme?: EmbedThemeOverrides | null): string {
  const url = new URL(publicUrl);
  url.searchParams.set('embed', '1');

  if (theme) {
    for (const key of EMBED_THEME_KEYS) {
      const value = theme[key];
      if (value) url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export function buildAutoResizeEmbedSnippet({ slug, publicUrl, theme }: EmbedSnippetOptions): string {
  const iframeId = `formnest-${slug}`;
  const embedUrl = buildEmbedUrl(publicUrl, theme);

  return `<iframe
  id="${iframeId}"
  src="${embedUrl}"
  title="FormNest form"
  style="width:100%;min-height:480px;border:0;display:block;"
  loading="lazy"
></iframe>
<script>
  (function() {
    var frame = document.getElementById('${iframeId}');
    window.addEventListener('message', function(event) {
      if (!frame || event.source !== frame.contentWindow) return;
      if (!event.data || event.data.type !== 'formnest:resize' || event.data.slug !== '${slug}') return;
      frame.style.height = Math.max(320, Number(event.data.height || 0)) + 'px';
    });
  })();
</script>`;
}
