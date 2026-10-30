"use client";

import { useEffect } from "react";

function editing(element: Element | null) {
  return element instanceof HTMLElement && (element.isContentEditable ||
    element instanceof HTMLTextAreaElement && !element.readOnly && !element.disabled ||
    element instanceof HTMLSelectElement && !element.disabled ||
    element instanceof HTMLInputElement && !element.readOnly && !element.disabled &&
      ["text", "search", "email", "password", "tel", "url", "number", "date", "time", "datetime-local"].includes(element.type));
}

export function AppViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;
    let settleTimer = 0;
    let touch: { x: number; y: number; target: Element } | null = null;

    function reset() {
      root.style.removeProperty("--app-visible-height");
      root.style.removeProperty("--app-viewport-top");
      root.style.removeProperty("--app-keyboard-inset");
    }

    function updateViewport() {
      frame = 0;
      // Keyboard changes the visual viewport on iOS while dvh can stay unchanged.
      // Ignore pinch zoom; it must remain available for accessibility.
      if (!viewport || Math.abs(viewport.scale - 1) > 0.05 ||
        !editing(document.activeElement) || window.innerHeight - viewport.height < 80) {
        reset();
        return;
      }
      root.style.setProperty("--app-visible-height", viewport.height + "px");
      root.style.setProperty("--app-viewport-top", Math.max(0, viewport.offsetTop) + "px");
      root.style.setProperty("--app-keyboard-inset",
        Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) + "px");

      const field = document.activeElement as HTMLElement;
      const scroll = field.closest<HTMLElement>(".bottom-sheet-content, .app-content, .viewport-page");
      if (!scroll) return;
      const bounds = scroll.getBoundingClientRect();
      const input = field.getBoundingClientRect();
      const padding = Math.min(12, Math.max(0, (bounds.height - input.height) / 2));
      // Scroll only the owning content area, never the document or its ancestors.
      if (input.bottom > bounds.bottom - padding)
        scroll.scrollTop += input.bottom - bounds.bottom + padding;
      else if (input.top < bounds.top + padding)
        scroll.scrollTop -= bounds.top + padding - input.top;
    }

    function schedule() {
      if (document.visibilityState === "hidden") {
        reset();
        return;
      }
      if (!frame) frame = requestAnimationFrame(updateViewport);
    }

    function cancelPendingUpdate() {
      cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      frame = 0;
      settleTimer = 0;
    }

    function suspend() {
      cancelPendingUpdate();
      touch = null;
      const active = document.activeElement;
      // iOS can retain the focused field and stale visual viewport coordinates
      // while a standalone PWA is in the background. Blurring keeps the layout
      // and its touch targets in the same coordinate system when the app returns.
      if (editing(active) && active instanceof HTMLElement) active.blur();
      reset();
    }

    function resume() {
      cancelPendingUpdate();
      touch = null;
      reset();
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);

      // WebKit may expose the previous visual viewport during the first frame
      // after a PWA resumes. Re-read it after layout has settled and once more
      // after the native app-switch animation has completed.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(updateViewport);
      });
      settleTimer = window.setTimeout(schedule, 250);
    }

    function visibilityChanged() {
      if (document.visibilityState === "hidden") suspend();
      else resume();
    }

    function touchStart(event: TouchEvent) {
      const target = event.target instanceof Element ? event.target : null;
      touch = event.touches.length === 1 && target
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY, target } : null;
    }

    function touchMove(event: TouchEvent) {
      if (!touch || event.touches.length !== 1) return;
      const point = event.touches[0];
      const dx = touch.x - point.clientX;
      const dy = touch.y - point.clientY;
      touch.x = point.clientX;
      touch.y = point.clientY;
      if (Math.abs(dy) <= Math.abs(dx) || Math.abs(dy) < 1 ||
        (viewport?.scale ?? 1) > 1.05 || editing(touch.target) ||
        window.getSelection()?.type === "Range" || touch.target.closest(".bottom-sheet-handle")) return;

      // Some iOS versions still pan the native root scroll view at a boundary.
      // Cancel only vertical drags that no inner area can consume.
      for (let element: Element | null = touch.target; element && element !== document.body; element = element.parentElement) {
        const style = getComputedStyle(element);
        if (style.overflowY !== "auto" && style.overflowY !== "scroll") continue;
        const range = element.scrollHeight - element.clientHeight;
        if (range > 1 && (dy > 0 && element.scrollTop < range - 1 || dy < 0 && element.scrollTop > 1)) return;
        if (style.overscrollBehaviorY === "contain" || style.overscrollBehaviorY === "none") break;
      }
      if (event.cancelable) event.preventDefault();
    }

    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", visibilityChanged);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    document.addEventListener("touchstart", touchStart, { passive: true });
    document.addEventListener("touchmove", touchMove, { passive: false });
    resume();
    return () => {
      cancelPendingUpdate();
      reset();
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", visibilityChanged);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      document.removeEventListener("touchstart", touchStart);
      document.removeEventListener("touchmove", touchMove);
    };
  }, []);

  return null;
}
