// Only QR location URLs may be carried across login or organization selection.
export function locationReturnPath(value: unknown): string | undefined {
  return typeof value === "string" && /^\/location\/[a-f0-9]{48}$/.test(value)
    ? value
    : undefined;
}
