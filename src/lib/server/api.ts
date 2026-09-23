import "server-only";
import { ZodError, type ZodType } from "zod";
import { AppError, isDuplicateKey } from "./errors";

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
export async function api(action: () => Promise<unknown>, status = 200) {
  const headers = { "Cache-Control": "no-store" };
  try {
    return Response.json({ data: await action() }, { status, headers });
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Kontrollera uppgifterna.",
            details: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
        },
        { status: 400, headers },
      );
    if (error instanceof AppError)
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers },
      );
    if (isDuplicateKey(error))
      return Response.json(
        { error: { code: "CONFLICT", message: "Uppgifterna används redan." } },
        { status: 409, headers },
      );
    // Do not log database URIs, passwords, or request bodies.
    console.error(
      "API request failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return Response.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Något gick fel. Försök igen.",
        },
      },
      { status: 500, headers },
    );
  }
}
