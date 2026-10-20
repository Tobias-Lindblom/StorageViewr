import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./auth-page.module.css";

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
    <div className={`viewport-page ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <BrandLogo />
          <nav aria-label="Inloggningsnavigation" className={styles.headerActions}>
            <Link href="/" className={styles.backLink}>
              <span className={styles.backLinkLong}>Tillbaka till startsidan</span>
              <span className={styles.backLinkShort}>Startsidan</span>
            </Link>
            <Link href="/pilot" className={`button ${styles.pilotLink}`}>
              <span className={styles.pilotLinkLong}>Starta pilot</span>
              <span className={styles.pilotLinkShort}>Pilot</span>
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" className={styles.main}>
        <section className={styles.card} aria-labelledby="auth-page-title">
          <header className={styles.heading}>
            <h1 id="auth-page-title">{title}</h1>
            <p>{description}</p>
          </header>
          <div>{children}</div>
        </section>
      </main>
    </div>
  );
}
