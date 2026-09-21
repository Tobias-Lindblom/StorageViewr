export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}
export function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
