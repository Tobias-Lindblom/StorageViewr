import { BrandLogo } from "@/components/brand-logo";
import { AuthForm } from "@/features/auth/auth-form";
import { locationReturnPath } from "@/validation/return-path";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const returnTo = locationReturnPath((await searchParams).next);
  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <BrandLogo />
      <div className="panel mt-10">
        <p className="eyebrow">Kom igång</p>
        <h1 className="text-3xl">Skapa konto</h1>
        <AuthForm mode="register" returnTo={returnTo} />
      </div>
    </main>
  );
}
