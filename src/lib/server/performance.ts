import "server-only";

type PerformanceMetadata = Record<string, number | string | boolean>;

/**
 * Opt-in server timing for production-like verification. It deliberately logs
 * operation names and aggregate counts only, never tenant or user identifiers.
 */
export async function measureServerOperation<T>(
  operation: string,
  work: () => Promise<T>,
  metadata: PerformanceMetadata = {},
): Promise<T> {
  if (process.env.PERFORMANCE_LOGGING !== "1") return work();
  const startedAt = performance.now();
  try {
    return await work();
  } finally {
    console.info(JSON.stringify({
      type: "server-performance",
      operation,
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
      ...metadata,
    }));
  }
}
