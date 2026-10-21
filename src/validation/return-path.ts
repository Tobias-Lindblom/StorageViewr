// Only app-owned, non-mutating destinations may be carried across login.
export function locationReturnPath(value: unknown): string | undefined {
  return typeof value === "string" && (
    /^\/location\/[a-f0-9]{48}$/.test(value) ||
    /^\/invite\/[a-f0-9]{64}$/.test(value)
  )
    ? value
    : undefined;
}
