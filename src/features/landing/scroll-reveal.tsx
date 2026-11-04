"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./scroll-reveal.module.css";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  mode?: "single" | "group";
};

const ScrollRevealVisibleContext = createContext(false);

export function useScrollRevealVisible() {
  return useContext(ScrollRevealVisibleContext);
}

export function ScrollReveal({
  children,
  className = "",
  mode = "single",
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      const animationFrame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(animationFrame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
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
    <ScrollRevealVisibleContext.Provider value={isVisible}>
      <div
        ref={elementRef}
        className={`${styles.root} ${className}`.trim()}
        data-reveal-mode={mode}
        data-reveal-state={isVisible ? "visible" : "hidden"}
      >
        {children}
      </div>
    </ScrollRevealVisibleContext.Provider>
  );
}
