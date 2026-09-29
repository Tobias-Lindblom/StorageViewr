import { AuthForm } from "@/features/auth/auth-form";
import { AuthPageShell } from "@/features/auth/auth-page-shell";
import { locationReturnPath } from "@/validation/return-path";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const returnTo = locationReturnPath((await searchParams).next);
  return (
    <AuthPageShell
      title="Skapa konto"
      description="Skapa ditt personliga konto. Därefter skapar eller väljer du företag."
    >
      <AuthForm mode="register" returnTo={returnTo} />
    </AuthPageShell>
  );
}
