"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function BottomSheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const moved = useRef(false);
  const closingRef = useRef(false);
  const exitAnimation = useRef<Animation | null>(null);
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState({ distance: 0, active: false });

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      exitAnimation.current?.cancel();
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function requestClose() {
    const element = dialog.current;
    if (!element?.open || closingRef.current) return;
    closingRef.current = true;
    pointer.current = null;
    setClosing(true);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.close();
      return;
    }

    // Continue from the current position, including an unfinished opening or drag.
    const current = getComputedStyle(element);
    const animation = element.animate(
      [
        { transform: current.transform, translate: current.translate },
        { transform: "translateY(100%)", translate: "0 0" },
      ],
      { duration: 220, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    exitAnimation.current = animation;
    animation.onfinish = () => element.close();
  }

  // Mounted only after the user opens the panel.
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="bottom-sheet print:hidden"
      data-dragging={drag.active}
      data-closing={closing}
      style={{ translate: "0 " + drag.distance + "px" }}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 && element.getClientRects().length > 0,
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          requestClose();
        }
      }}
    >
      <div className="sticky top-0 z-10 rounded-t-3xl bg-surface px-5 sm:px-7">
        <button
          type="button"
          aria-label={"Stäng " + title.toLocaleLowerCase("sv")}
          className="group mx-auto flex min-h-13 w-full touch-none items-center justify-center rounded-xl cursor-grab! active:cursor-grabbing!"
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            pointer.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            moved.current = false;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDrag({ distance: 0, active: true });
          }}
          onPointerMove={(event) => {
            const start = pointer.current;
            if (!start || start.id !== event.pointerId) return;
            if (
              Math.abs(event.clientY - start.y) > 6 ||
              Math.abs(event.clientX - start.x) > 6
            )
              moved.current = true;
            setDrag({
              distance: Math.max(0, event.clientY - start.y),
              active: true,
            });
          }}
          onPointerUp={(event) => {
            const start = pointer.current;
            if (!start || start.id !== event.pointerId) return;
            pointer.current = null;
            setDrag({ distance: 0, active: false });
            if (event.clientY - start.y >= 80) requestClose();
          }}
          onPointerCancel={() => {
            pointer.current = null;
            moved.current = true;
            setDrag({ distance: 0, active: false });
          }}
          onClick={(event) => {
            if (event.detail === 0 || !moved.current) requestClose();
          }}
        >
          <span
            aria-hidden="true"
            className="h-1 w-10 rounded-full bg-muted/40 transition-colors group-hover:bg-accent/70"
          />
        </button>
        <h2 id={titleId} className="mb-0! border-b border-line/60 pb-5 text-xl">
          {title}
        </h2>
      </div>
      <div className="px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7 sm:pt-6">
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
