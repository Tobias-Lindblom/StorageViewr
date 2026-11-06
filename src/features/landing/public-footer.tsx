import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { MaterialArrow } from "@/components/material-arrow";
import { FooterScrollToTop } from "./scroll-to-top";
import styles from "./landing-page.module.css";

export function PublicFooter() {
  return (
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <BrandLogo href="#toppen" />
              <div className={styles.footerDescription}>
                <p>Lagerkontroll för verksamheter med ett fysiskt lager.</p>
                <p>
                  Från lagerplatser och fysiska inventeringar till spårbar
                  historik och signerade inventeringsrapporter.
                </p>
              </div>
              <span className={styles.footerStatus}>
                <span aria-hidden="true" />
                Begränsad pilot pågår
              </span>
            </div>

            <nav
              aria-label="Länkar i sidfoten"
              className={styles.footerNavigation}
            >
              <div className={styles.footerLinkGroup}>
                <h2>Produkt</h2>
                <a href="#oversikt">Lageröversikt</a>
                <a href="#qr-skanner">QR-skanner</a>
                <a href="#lagerplatser">Lagerplatser &amp; produkter</a>
              </div>
              <div className={styles.footerLinkGroup}>
                <h2>Arbetsflöde</h2>
                <a href="#inventering">Inventering</a>
                <a href="#rapporter">Rapporter &amp; dokument</a>
              </div>
              <div className={styles.footerLinkGroup}>
                <h2>Företaget</h2>
                <Link href="/om-oss">Om oss</Link>
                <Link href="/kontakt">Kontakta oss</Link>
                <Link href="/integritet">Personuppgifter</Link>
              </div>
              <div className={styles.footerLinkGroup}>
                <h2>Kom igång</h2>
                <a href="#kom-igang">Så fungerar det</a>
                <Link className={styles.footerAccentLink} href="/pilot">
                  Ansök om pilot
                  <MaterialArrow name="forward" size={16} />
                </Link>
                <Link href="/pilot#pilotvillkor">Praktiskt om piloten</Link>
                <Link href="/login">Logga in</Link>
              </div>
            </nav>
          </div>

          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} StorageViewr</span>
            <FooterScrollToTop />
          </div>
        </div>
      </footer>
  );
}
