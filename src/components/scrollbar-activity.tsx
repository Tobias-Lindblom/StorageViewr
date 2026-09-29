"use client";

import { useEffect } from "react";

const visibleForMs = 900;

export function ScrollbarActivity() {
  useEffect(() => {
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();

    function showScrollbar(event: Event) {
      const target =
        event.target instanceof Element
          ? event.target
          : document.scrollingElement;
      if (!target) return;

      target.classList.add("is-scrolling");
      const current = timers.get(target);
      if (current) clearTimeout(current);
      timers.set(
        target,
        setTimeout(() => {
          target.classList.remove("is-scrolling");
          timers.delete(target);
        }, visibleForMs),
      );
    }

    document.addEventListener("scroll", showScrollbar, true);
    return () => {
      document.removeEventListener("scroll", showScrollbar, true);
      timers.forEach(clearTimeout);
      timers.forEach((_, element) => element.classList.remove("is-scrolling"));
    };
  }, []);

  return null;
}
