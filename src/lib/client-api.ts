type ApiResult<T> =
  | { data: T; error?: never }
  | {
      data?: never;
      error: { message: string; details?: { message: string }[] };
    };
export async function clientApi<T>(
  url: string,
  method: string,
  data?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || result.error)
    throw new Error(
      result.error?.details?.[0]?.message ??
        result.error?.message ??
        "Förfrågan misslyckades.",
    );
  return result.data as T;
}
