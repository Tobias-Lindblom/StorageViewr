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
    <div className="app-shell auth-shell mx-auto w-full max-w-5xl px-4 sm:px-8">
      <header className="auth-header flex min-h-20 shrink-0 items-center sm:min-h-22">
        <BrandLogo compact />
      </header>
      <main id="main-content" className="app-content">
        <section className="auth-content mx-auto w-full max-w-md">
          <PageHeading title={title} description={description} />
          <div className="panel">{children}</div>
        </section>
      </main>
    </div>
  );
}
