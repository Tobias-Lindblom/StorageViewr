import "server-only";
import { notFound } from "next/navigation";
import { ZodError } from "zod";
import { AppError } from "./errors";

export async function pageResource<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (
      error instanceof ZodError ||
      (error instanceof AppError && error.status === 404)
    )
      notFound();
    throw error;
  }
}
