import Link from "next/link";
import { MaterialArrow } from "@/components/material-arrow";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthPageShell } from "@/features/auth/auth-page-shell";
import { registrationEnabled } from "@/features/auth/registration";
import { locationReturnPath } from "@/validation/return-path";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const returnTo = locationReturnPath((await searchParams).next);
  const available = registrationEnabled();
  const query = returnTo ? "?next=" + encodeURIComponent(returnTo) : "";

  if (!available) {
    return (
      <AuthPageShell
        title="Registreringen är stängd"
        description="StorageViewr körs just nu som en begränsad pilot."
      >
        <p className="text-sm leading-6 text-muted">
          Nya konton kan inte skapas under pilotperioden. Du som redan har ett
          konto kan fortsätta till inloggningen.
        </p>
        <Link href={"/login" + query} className="button mt-6 w-full">
          Logga in
          <MaterialArrow name="forward" />
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Skapa konto"
      description="Skapa ditt personliga konto. Därefter skapar eller väljer du företag."
    >
      <AuthForm mode="register" returnTo={returnTo} />
    </AuthPageShell>
  );
}
