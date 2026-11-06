"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

export function ScrollReveal({ children, className = "", mode = "single" }: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // SSR and failed hydration stay readable. Never hide content already in view.
    if (motion.matches || !("IntersectionObserver" in window) ||
        element.getBoundingClientRect().top < window.innerHeight) return;

    const reveal = () => {
      element.dataset.revealState = "visible";
      setIsVisible(true);
      observer.disconnect();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) reveal();
    }, {
      // A tall section must not require 14% of its total height to fit on screen.
      threshold: 0,
      rootMargin: "0px 0px -18% 0px",
    });

    observer.observe(element);
    element.dataset.revealState = "hidden";
    const onMotionChange = () => { if (motion.matches) reveal(); };
    motion.addEventListener("change", onMotionChange);
    element.addEventListener("focusin", reveal);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", onMotionChange);
      element.removeEventListener("focusin", reveal);
      if (element.dataset.revealState === "hidden") element.dataset.revealState = "static";
    };
  }, []);

  return (
    <ScrollRevealVisibleContext.Provider value={isVisible}>
      <div ref={elementRef} className={`${styles.root} ${className}`.trim()}
        data-reveal-mode={mode} data-reveal-state={isVisible ? "visible" : "static"}>
        {children}
      </div>
    </ScrollRevealVisibleContext.Provider>
  );
}
