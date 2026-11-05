import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/monitoring/privacy";
import { privateDataCollection } from "@/lib/monitoring/sentry-options";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV,
  dataCollection: privateDataCollection,
  sampleRate: 1,
  tracesSampleRate: 0,
  beforeSend: scrubSentryEvent,
});
