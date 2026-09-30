import "server-only";
import { AppError } from "@/lib/server/errors";

type RegistrationEnvironment = {
  NODE_ENV?: string;
  REGISTRATION_ENABLED?: string;
};

export function registrationEnabled(
  environment: RegistrationEnvironment = process.env,
) {
  const configured = environment.REGISTRATION_ENABLED?.trim().toLowerCase();
  if (configured !== undefined && configured !== "") {
    return configured === "true";
  }
  return environment.NODE_ENV !== "production";
}

export function assertRegistrationEnabled(
  environment: RegistrationEnvironment = process.env,
) {
  if (!registrationEnabled(environment)) {
    throw new AppError(
      403,
      "REGISTRATION_DISABLED",
      "Registreringen är tillfälligt stängd. Logga in med ett befintligt konto.",
    );
  }
}
