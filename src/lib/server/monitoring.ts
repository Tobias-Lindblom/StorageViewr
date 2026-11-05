import "server-only";
import * as Sentry from "@sentry/nextjs";

type ApiErrorContext = {
  requestId: string;
  method: string;
  route: string;
  errorCode: string;
  userId?: string;
  organizationId?: string;
};

function monitoringEnabled() {
  return Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export async function captureApiException(
  error: unknown,
  context: ApiErrorContext,
) {
  if (!monitoringEnabled()) return;

  try {
    Sentry.withScope((scope) => {
      scope.setTag("storageviewr.error_code", context.errorCode);
      scope.setTag("storageviewr.route", context.route);
      if (context.organizationId)
        scope.setTag("storageviewr.organization_id", context.organizationId);
      scope.setContext("storageviewr", {
        requestId: context.requestId,
        method: context.method,
        route: context.route,
        userId: context.userId,
        organizationId: context.organizationId,
      });
      Sentry.captureException(error, {
        mechanism: {
          handled: true,
          type: "storageviewr.api_wrapper",
        },
      });
    });
    await Sentry.flush(500);
  } catch {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        event: "monitoring.capture.failed",
        requestId: context.requestId,
      }),
    );
  }
}
