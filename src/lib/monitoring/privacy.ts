import type { ErrorEvent } from "@sentry/nextjs";

const dynamicSegments: Record<string, string> = {
  count: ":locationId",
  discrepancies: ":id",
  inventories: ":id",
  invitations: ":token",
  invite: ":token",
  location: ":token",
  locations: ":id",
  members: ":id",
  products: ":id",
  sessions: ":id",
  warehouses: ":id",
};

const staticChildren = new Set([
  "batch",
  "edit",
  "import",
  "labels",
  "new",
  "report",
  "scan",
]);

export function redactRouteUrl(url: string) {
  const transaction = url.match(
    /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.+)$/,
  );
  const prefix = transaction ? `${transaction[1]} ` : "";
  const target = transaction?.[2] ?? url;
  let pathname = "/unknown";
  try {
    pathname = new URL(target, "http://storageviewr.invalid").pathname;
  } catch {
    return pathname;
  }

  const segments = pathname.split("/");
  for (let index = 1; index < segments.length; index += 1) {
    const replacement = dynamicSegments[segments[index - 1]];
    if (replacement && !staticChildren.has(segments[index]))
      segments[index] = replacement;
  }
  return prefix + segments.join("/");
}

function redactText(value: string) {
  return value
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "[redacted-database-uri]")
    .replace(/https?:\/\/[^\s]+/gi, (url) => redactRouteUrl(url))
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[redacted-token]",
    )
    .replace(/\b[a-f0-9]{32,}\b/gi, "[redacted-token]")
    .replace(
      /\b(?:bearer|token)\s+[A-Za-z0-9._~-]+/gi,
      "[redacted-token]",
    );
}

function scrubBreadcrumbData(data: Record<string, unknown> | undefined) {
  if (!data) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string") continue;
    if (["url", "from", "to"].includes(key))
      safe[key] = redactRouteUrl(value);
    else if (["method", "status_code"].includes(key)) safe[key] = value;
  }
  return Object.keys(safe).length ? safe : undefined;
}

/**
 * Sentry receives technical failure context only. Request bodies, headers,
 * cookies, query parameters, free-form extras and user objects are removed.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  event.user = undefined;
  event.extra = undefined;
  if (event.message) event.message = redactText(event.message);
  if (event.transaction) event.transaction = redactRouteUrl(event.transaction);

  if (event.request) {
    event.request.url = event.request.url
      ? redactRouteUrl(event.request.url)
      : undefined;
    event.request.headers = undefined;
    event.request.cookies = undefined;
    event.request.data = undefined;
    event.request.query_string = undefined;
    event.request.env = undefined;
  }

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redactText(exception.value);
  }

  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    message: breadcrumb.message ? redactText(breadcrumb.message) : undefined,
    data: scrubBreadcrumbData(breadcrumb.data),
  }));

  const nextContext = event.contexts?.nextjs;
  if (nextContext && typeof nextContext.request_path === "string")
    nextContext.request_path = redactRouteUrl(nextContext.request_path);

  return event;
}
