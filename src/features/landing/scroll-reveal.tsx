"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./scroll-reveal.module.css";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  mode?: "single" | "group";
};

export function ScrollReveal({
  children,
  className = "",
  mode = "single",
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      element.dataset.revealState = "visible";
      return;
    }

    element.dataset.revealState = "hidden";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        element.dataset.revealState = "visible";
        observer.disconnect();
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -18% 0px",
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      className={`${styles.root} ${className}`.trim()}
      data-reveal-mode={mode}
    >
      {children}
    </div>
  );
}
