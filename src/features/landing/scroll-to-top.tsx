"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import styles from "./landing-page.module.css";

function scrollLandingToTop() {
  const scrollRoot = document.getElementById("toppen");
  if (!scrollRoot) return;
  scrollRoot.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

export function FloatingScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const scrollRoot = document.getElementById("toppen");
    const footer = scrollRoot?.querySelector("footer");
    if (!scrollRoot) return;

    const updateVisibility = () => setVisible(scrollRoot.scrollTop > 96);
    updateVisibility();
    scrollRoot.addEventListener("scroll", updateVisibility, { passive: true });

    const observer = footer
      ? new IntersectionObserver(
          ([entry]) => setFooterVisible(entry.isIntersecting),
          { root: scrollRoot, threshold: 0.05 },
        )
      : null;
    if (footer && observer) observer.observe(footer);

    return () => {
      scrollRoot.removeEventListener("scroll", updateVisibility);
      observer?.disconnect();
    };
  }, []);

  return (
    <button
      type="button"
      className={`${styles.floatingTopButton} ${
        visible && !footerVisible ? styles.floatingTopButtonVisible : ""
      }`}
      aria-label="Till toppen"
      aria-hidden={!visible || footerVisible}
      title="Till toppen"
      tabIndex={visible && !footerVisible ? 0 : -1}
      onClick={scrollLandingToTop}
    >
      <AppIcon name="chevron" width={17} height={17} />
    </button>
  );
}

export function FooterScrollToTop() {
  return (
    <button
      type="button"
      className={styles.footerTopLink}
      onClick={scrollLandingToTop}
    >
      Till toppen
      <AppIcon
        name="chevron"
        width={15}
        height={15}
        className={styles.footerTopIcon}
      />
    </button>
  );
}
