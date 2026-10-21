"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "@/components/app-icon";
import { ProductPhoto } from "@/components/product-photo";

type Props = {
  src: string;
  alt: string;
};

export function ProductPhotoLightbox({ src, alt }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="product-photo-trigger"
        aria-label={`Förstora bild för ${alt}`}
        onClick={() => setOpen(true)}
      >
        <ProductPhoto src={src} alt={alt} eager className="product-detail-photo" />
        <span className="product-photo-zoom-cue" aria-hidden="true">
          <AppIcon name="expand" width={13} height={13} />
        </span>
      </button>

      {open && createPortal(
        <dialog
          ref={dialogRef}
          className="product-photo-lightbox"
          aria-label={alt}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="product-photo-lightbox-panel">
            <div className="product-photo-lightbox-toolbar">
              <p>{alt}</p>
              <button type="button" aria-label="Stäng bildvisning" onClick={close}>
                <AppIcon name="close" width={20} height={20} />
              </button>
            </div>
            <div className="product-photo-lightbox-stage">
              <ProductPhoto src={src} alt={alt} eager className="product-photo-lightbox-image" />
            </div>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
}
