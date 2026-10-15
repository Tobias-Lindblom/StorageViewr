import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { BrandLogo } from "@/components/brand-logo";
export default function NotFound() {
  return (
    <main className="viewport-page system-state-page">
      <BrandLogo />
      <section className="system-state">
        <span className="system-state-icon"><AppIcon name="search" width={24} height={24} /></span>
        <h1>Sidan kunde inte hittas</h1>
        <p>
          Kontrollera länken och att du har valt rätt företag.
        </p>
        <div className="system-state-actions">
          <Link className="button" href="/dashboard">
            Till översikten
          </Link>
          <Link className="button-secondary" href="/organizations">
            Välj företag
          </Link>
        </div>
      </section>
    </main>
  );
}
