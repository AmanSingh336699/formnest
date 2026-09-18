interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_URL: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_POSTHOG_KEY?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1",
  appName: import.meta.env.VITE_APP_NAME ?? "FormNest",
  appUrl: import.meta.env.VITE_APP_URL ?? "http://localhost:5173",
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? "",
  posthogKey: import.meta.env.VITE_POSTHOG_KEY ?? "",
} as const;
