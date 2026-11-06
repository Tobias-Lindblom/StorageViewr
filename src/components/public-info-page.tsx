import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MaterialArrow } from "@/components/material-arrow";
import landingStyles from "@/features/landing/landing-page.module.css";
import styles from "./public-info-page.module.css";

export function PublicInfoPage({ title, intro, children }: {
  title: string; intro: ReactNode; children: ReactNode;
}) {
  return <main id="toppen" className={"viewport-page " + landingStyles.page + " " + styles.page}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <BrandLogo />
        <Link className={styles.homeLink} href="/">
          Till startsidan
          <MaterialArrow name="forward" size={17} />
        </Link>
      </div>
    </header>
    <article className={styles.article}>
      <header className={styles.hero}>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>
      <div className={styles.sections}>{children}</div>
    </article>
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>© {new Date().getFullYear()} StorageViewr</span>
        <nav aria-label="Informationssidor">
          <Link href="/om-oss">Om oss</Link>
          <Link href="/kontakt">Kontakta oss</Link>
          <Link href="/integritet">Personuppgifter</Link>
          <Link className={styles.pilotLink} href="/pilot">Ansök om pilot</Link>
        </nav>
      </div>
    </footer>
  </main>;
}
