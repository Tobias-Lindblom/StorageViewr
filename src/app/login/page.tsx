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
      title="Logga in"
      description="Fortsätt till ditt företag och dagens lagerarbete."
    >
      <AuthForm mode="login" returnTo={returnTo} />
    </AuthPageShell>
  );
}
