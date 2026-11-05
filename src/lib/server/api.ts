import "server-only";
import { randomUUID } from "node:crypto";
import { ZodError, type ZodType } from "zod";
import { AppError, isDuplicateKey } from "./errors";
import {
  getRequestLogContext,
  logApiCompletion,
  redactApiRoute,
  runWithRequestLogContext,
} from "./logger";
import { captureApiException } from "./monitoring";

export function assertOrigin(request: Request) {
  const configured = process.env.APP_URL;
  if (!configured)
    throw new AppError(
      503,
      "NOT_CONFIGURED",
      "Applikationen är inte konfigurerad.",
    );
  if (request.headers.get("origin") !== new URL(configured).origin) {
    throw new AppError(403, "INVALID_ORIGIN", "Förfrågan har fel ursprung.");
  }
}
export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = 16_384,
): Promise<T> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new AppError(415, "INVALID_CONTENT_TYPE", "Förväntade JSON.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "INVALID_JSON", "Tom förfrågan.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AppError(413, "PAYLOAD_TOO_LARGE", "Förfrågan är för stor.");
    }
    chunks.push(value);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(400, "INVALID_JSON", "Ogiltig JSON.");
  }
  return schema.parse(body);
}
type ApiFailure = {
  status: number;
  code: string;
  message: string;
  details?: { path: string; message: string }[];
};

function failureFor(error: unknown): ApiFailure {
  if (error instanceof ZodError)
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Kontrollera uppgifterna.",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  if (error instanceof AppError)
    return { status: error.status, code: error.code, message: error.message };
  if (isDuplicateKey(error))
    return {
      status: 409,
      code: "CONFLICT",
      message: "Uppgifterna används redan.",
    };
  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Något gick fel. Försök igen.",
  };
}

function safeStackFrames(error: unknown) {
  if (!(error instanceof Error) || !error.stack) return undefined;
  return error.stack
    .split("\n")
    .slice(1, 6)
    .map((line) => line.trim().replaceAll(process.cwd(), "[app]"));
}

async function executeApiRequest(
  request: Request,
  action: () => Promise<Response>,
) {
  const requestId = randomUUID();
  const startedAt = performance.now();

  return runWithRequestLogContext(
    {
      requestId,
      method: request.method,
      route: redactApiRoute(request.url),
    },
    async () => {
      let response: Response;
      let failure: ApiFailure | undefined;
      let caught: unknown;

      try {
        response = await action();
      } catch (error) {
        caught = error;
        failure = failureFor(error);
        response = Response.json(
          {
            error: {
              code: failure.code,
              message: failure.message,
              ...(failure.details ? { details: failure.details } : {}),
              requestId,
            },
          },
          { status: failure.status },
        );
      }

      response.headers.set("x-request-id", requestId);
      if (!response.headers.has("Cache-Control"))
        response.headers.set("Cache-Control", "no-store");

      if (
        failure?.status === 500 &&
        caught !== undefined &&
        !(caught instanceof AppError)
      ) {
        const context = getRequestLogContext();
        await captureApiException(caught, {
          requestId,
          method: request.method,
          route: context?.route ?? redactApiRoute(request.url),
          errorCode: failure.code,
          userId: context?.userId,
          organizationId: context?.organizationId,
        });
      }

      logApiCompletion({
        status: response.status,
        durationMs: Number((performance.now() - startedAt).toFixed(1)),
        ...(failure ? { errorCode: failure.code } : {}),
        ...(caught instanceof Error ? { errorName: caught.name } : {}),
        ...(failure?.status === 500
          ? { stackFrames: safeStackFrames(caught) }
          : {}),
      });
      return response;
    },
  );
}

export async function api(
  request: Request,
  action: () => Promise<unknown>,
  status = 200,
) {
  return executeApiRequest(request, async () =>
    Response.json({ data: await action() }, { status }),
  );
}

export async function apiResponse(
  request: Request,
  action: () => Promise<Response>,
) {
  return executeApiRequest(request, action);
}
