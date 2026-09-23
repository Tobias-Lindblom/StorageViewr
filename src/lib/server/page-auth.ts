import "server-only";
import { redirect } from "next/navigation";
import { requireSession } from "./session";
import { tenantForSession } from "./tenant";
import { AppError } from "./errors";
import { locationReturnPath } from "@/validation/return-path";

function destination(path: string, returnTo?: string) {
  const safe = locationReturnPath(returnTo);
  return path + (safe ? "?next=" + encodeURIComponent(safe) : "");
}
export async function pageSession(returnTo?: string) {
  try {
    return await requireSession();
  } catch (error) {
    if (error instanceof AppError && error.status === 401)
      redirect(destination("/login", returnTo));
    throw error;
  }
}
export async function pageTenant(returnTo?: string) {
  const session = await pageSession(returnTo);
  try {
    return await tenantForSession(session);
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.status === 403 || error.status === 409)
    )
      redirect(destination("/organizations", returnTo));
    throw error;
  }
}
