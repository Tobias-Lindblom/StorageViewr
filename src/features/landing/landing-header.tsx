"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./landing-page.module.css";

const navigationItems = [
  { href: "#oversikt", id: "oversikt", label: "Översikt" },
  { href: "#qr-skanner", id: "qr-skanner", label: "QR-skanner" },
  {
    href: "#lagerplatser",
    id: "lagerplatser",
    label: "Lager & produkter",
  },
  { href: "#lagerhandelser", id: "lagerhandelser", label: "Historik" },
  { href: "#inventering", id: "inventering", label: "Inventering" },
  { href: "#rapporter", id: "rapporter", label: "Rapporter" },
] as const;

export function LandingHeader() {
  const [activeId, setActiveId] = useState("oversikt");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const scrollRoot = document.getElementById("toppen");
    if (!scrollRoot) return;
    let frame = 0;

    const updateHeader = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.innerWidth > 1120) setMenuOpen(false);
        const threshold = scrollRoot.getBoundingClientRect().top + 150;
        let current: (typeof navigationItems)[number]["id"] =
          navigationItems[0].id;
        for (const item of navigationItems) {
          const section = document.getElementById(item.id);
          if (section && section.getBoundingClientRect().top <= threshold) {
            current = item.id;
          }
        }
        setActiveId(current);
        setScrolled(scrollRoot.scrollTop > 8);
      });
    };

    updateHeader();
    scrollRoot.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);
    return () => {
      cancelAnimationFrame(frame);
      scrollRoot.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithKeyboard);
    };
  }, [menuOpen]);

  const navigationLinks = navigationItems.map((item) => (
    <a
      key={item.id}
      href={item.href}
      aria-current={activeId === item.id ? "location" : undefined}
      onClick={() => setMenuOpen(false)}
    >
      {item.label}
    </a>
  ));

  return (
    <header
      ref={headerRef}
      className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}
    >
      <div className={styles.headerInner}>
        <BrandLogo />
        <nav aria-label="Huvudnavigation" className={styles.navigation}>
          <div className={styles.navigationLinks}>{navigationLinks}</div>
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? "Stäng navigeringen" : "Öppna navigeringen"}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={styles.headerActions}>
            <Link
              className={`${styles.loginButton} button-secondary`}
              href="/login"
            >
              Logga in
            </Link>
            <Link
              className={`${styles.headerPrimary} button`}
              href="/pilot"
            >
              <span className={styles.headerPrimaryFull}>Starta pilot</span>
              <span className={styles.headerPrimaryShort}>Pilot</span>
            </Link>
          </div>
        </nav>

        <nav
          id="landing-mobile-navigation"
          aria-label="Mobil navigation"
          className={styles.mobileNavigation}
          hidden={!menuOpen}
        >
          {navigationLinks}
          <Link
            href="/login"
            className={styles.mobileLoginLink}
            onClick={() => setMenuOpen(false)}
          >
            Logga in
          </Link>
        </nav>
      </div>
    </header>
  );
}
