import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PageHeading } from "@/components/page-heading";

export function AuthPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-5 sm:px-8">
      <header className="flex min-h-20 shrink-0 items-center sm:min-h-22">
        <BrandLogo />
      </header>
      <section className="mx-auto w-full max-w-md pb-12 pt-10 sm:pt-14">
        <PageHeading title={title} description={description} />
        <div className="panel p-5! sm:p-7!">{children}</div>
      </section>
    </main>
  );
}
