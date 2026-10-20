import { redirect } from "next/navigation";
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

  if (!available) redirect("/pilot");

  return (
    <AuthPageShell
      title="Skapa konto"
      description="Skapa ditt personliga konto. Därefter skapar eller väljer du företag."
    >
      <AuthForm mode="register" returnTo={returnTo} />
    </AuthPageShell>
  );
}
