import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthPageShell } from "@/features/auth/auth-page-shell";
import { locationReturnPath } from "@/validation/return-path";

export const metadata: Metadata = {
  title: "Logga in | StorageViewr",
  description:
    "Logga in i StorageViewr och fortsätt arbeta med lager, inventering och lagerplatser.",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const returnTo = locationReturnPath((await searchParams).next);
  return (
    <AuthPageShell
      title="Logga in"
      description="Fortsätt till ert lager och dagens arbete."
    >
      <AuthForm mode="login" returnTo={returnTo} />
    </AuthPageShell>
  );
}
