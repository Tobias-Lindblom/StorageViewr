export type ApiErrorDetail = {
  message: string;
  path?: string;
};

type ApiEnvelope<T> =
  | { data: T; error?: never }
  | {
      data?: never;
      error: {
        code?: string;
        message?: string;
        details?: ApiErrorDetail[];
      };
    };

export class ApiError extends Error {
  readonly name = "ApiError";

  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: ApiErrorDetail[] = [],
    readonly requestId?: string,
  ) {
    super(message);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

export async function clientApi<T>(
  url: string,
  method: string,
  data?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: data === undefined ? {} : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    throw new ApiError(
      "Det gick inte att nå tjänsten. Kontrollera anslutningen och försök igen.",
      0,
      "NETWORK_ERROR",
    );
  }

  const result = await readEnvelope<T>(response);
  const apiError = result && "error" in result ? result.error : undefined;
  if (!response.ok || apiError) {
    const details = apiError?.details ?? [];
    throw new ApiError(
      details[0]?.message ??
        apiError?.message ??
        (response.status >= 500
          ? "Tjänsten kunde inte slutföra förfrågan. Försök igen."
          : "Förfrågan misslyckades."),
      response.status,
      apiError?.code ?? `HTTP_${response.status}`,
      details,
      response.headers.get("x-request-id") ?? undefined,
    );
  }
  if (!result || !("data" in result)) {
    throw new ApiError(
      "Tjänsten returnerade ett oväntat svar.",
      response.status,
      "INVALID_RESPONSE",
      [],
      response.headers.get("x-request-id") ?? undefined,
    );
  }
  return result.data as T;
}
