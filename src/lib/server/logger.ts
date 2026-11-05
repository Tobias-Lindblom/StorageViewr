import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { redactRouteUrl } from "@/lib/monitoring/privacy";

type RequestLogContext = {
  requestId: string;
  method: string;
  route: string;
  userId?: string;
  organizationId?: string;
};

type RequestActor = Pick<RequestLogContext, "userId" | "organizationId">;

type ApiCompletion = {
  status: number;
  durationMs: number;
  errorCode?: string;
  errorName?: string;
  stackFrames?: string[];
};

const requestLogContext = new AsyncLocalStorage<RequestLogContext>();

/**
 * Keeps route names useful without writing object IDs or invitation tokens to
 * application logs. Query parameters are never included.
 */
export const redactApiRoute = redactRouteUrl;

export function runWithRequestLogContext<T>(
  context: RequestLogContext,
  action: () => Promise<T>,
) {
  return requestLogContext.run(context, action);
}

export function setRequestLogActor(actor: RequestActor) {
  const context = requestLogContext.getStore();
  if (!context) return;
  if (actor.userId) context.userId = actor.userId;
  if (actor.organizationId) context.organizationId = actor.organizationId;
}

export function getRequestLogContext() {
  const context = requestLogContext.getStore();
  return context ? { ...context } : undefined;
}

function write(entry: Record<string, unknown>) {
  const line = JSON.stringify(entry);
  const level = entry.level;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function logApiCompletion(result: ApiCompletion) {
  const context = requestLogContext.getStore();
  if (!context) return;
  const level = result.status >= 500 ? "error" : result.status >= 400 ? "warn" : "info";

  write({
    timestamp: new Date().toISOString(),
    level,
    event: "api.request.completed",
    requestId: context.requestId,
    method: context.method,
    route: context.route,
    status: result.status,
    durationMs: result.durationMs,
    ...(context.userId ? { userId: context.userId } : {}),
    ...(context.organizationId
      ? { organizationId: context.organizationId }
      : {}),
    ...(result.errorCode ? { errorCode: result.errorCode } : {}),
    ...(result.errorName ? { errorName: result.errorName } : {}),
    ...(result.stackFrames?.length ? { stackFrames: result.stackFrames } : {}),
  });
}
