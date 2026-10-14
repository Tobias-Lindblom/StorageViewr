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
    <div className="app-shell mx-auto w-full max-w-5xl px-5 sm:px-8">
      <header className="auth-header flex min-h-20 shrink-0 items-center sm:min-h-22">
        <BrandLogo />
      </header>
      <main id="main-content" className="app-content">
        <section className="mx-auto w-full max-w-md pb-12 pt-10 sm:pt-14">
          <PageHeading title={title} description={description} />
          <div className="panel p-5! sm:p-7!">{children}</div>
        </section>
      </main>
    </div>
  );
}
