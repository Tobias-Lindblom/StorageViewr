import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <BrandLogo />
      <div className="panel mt-10">
        <p className="eyebrow">Sidan saknas</p>
        <h1>Sidan kunde inte hittas.</h1>
        <p className="mb-7 text-sm leading-7 text-muted">
          Kontrollera länken och att du har valt rätt företag.
        </p>
        <div className="flex flex-col gap-3">
          <Link className="button" href="/dashboard">
            Till översikten
          </Link>
          <Link className="button-secondary" href="/organizations">
            Välj företag
          </Link>
        </div>
      </div>
    </main>
  );
}
