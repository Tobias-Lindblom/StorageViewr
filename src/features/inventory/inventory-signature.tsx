"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import SignatureCanvas from "react-signature-canvas";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

const subscribeToClient = () => () => undefined;

function exportTrimmedSignature(source: HTMLCanvasElement) {
  if (source.width < 1 || source.height < 1) return null;
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const pixels = context.getImageData(0, 0, source.width, source.height).data;
  let left = source.width;
  let top = source.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (pixels[(y * source.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return null;

  const padding = Math.max(10, Math.round(12 * window.devicePixelRatio));
  const sourceX = Math.max(0, left - padding);
  const sourceY = Math.max(0, top - padding);
  const width = Math.max(1, Math.min(source.width, right + padding + 1) - sourceX);
  const height = Math.max(1, Math.min(source.height, bottom + padding + 1) - sourceY);
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  output.getContext("2d")?.drawImage(
    source,
    sourceX,
    sourceY,
    width,
    height,
    0,
    0,
    width,
    height,
  );
  return output.toDataURL("image/png");
}

export function InventorySignature({
  signerName,
  signatureDataUrl,
  onSignerNameChange,
  onSignatureChange,
  disabled,
}: {
  signerName: string;
  signatureDataUrl: string | null;
  onSignerNameChange: (value: string) => void;
  onSignatureChange: (value: string | null) => void;
  disabled: boolean;
}) {
  const pad = useRef<SignatureCanvas>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const captureOpen = useRef(false);
  const enteredFullscreen = useRef(false);
  const headingId = useId();
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const [signing, setSigning] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [draftHasSignature, setDraftHasSignature] = useState(false);
  const [captureError, setCaptureError] = useState("");

  useEffect(() => {
    if (!signing) return;
    const element = dialog.current;
    if (!element) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setCanvasReady(true));
    const clearDraftAfterResize = () => {
      setDraftHasSignature(false);
      setCaptureError("");
    };
    window.addEventListener("resize", clearDraftAfterResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", clearDraftAfterResize);
      if (element.open) element.close();
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [signing]);

  function openCapture() {
    if (disabled) return;
    captureOpen.current = true;
    setDraftHasSignature(false);
    setCaptureError("");
    setCanvasReady(false);
    setSigning(true);

    const orientation = screen.orientation as LockableOrientation | undefined;
    const lockLandscape = () => orientation?.lock?.("landscape").catch(() => undefined);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => {
          if (!captureOpen.current) {
            void document.exitFullscreen?.().catch(() => undefined);
            return;
          }
          enteredFullscreen.current = true;
          return lockLandscape();
        })
        .catch(() => undefined);
    } else {
      void lockLandscape();
    }
  }

  function closeCapture() {
    captureOpen.current = false;
    setSigning(false);
    setCanvasReady(false);
    setDraftHasSignature(false);
    setCaptureError("");
    (screen.orientation as LockableOrientation | undefined)?.unlock?.();
    const shouldExitFullscreen = enteredFullscreen.current && document.fullscreenElement;
    enteredFullscreen.current = false;
    if (shouldExitFullscreen) {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  }

  function clearDraft() {
    pad.current?.clear();
    setDraftHasSignature(false);
    setCaptureError("");
  }

  function saveSignature() {
    const instance = pad.current;
    if (!instance || instance.isEmpty()) {
      setDraftHasSignature(false);
      setCaptureError("Skriv din signatur innan du fortsätter.");
      return;
    }
    const image = exportTrimmedSignature(instance.getCanvas());
    if (!image) {
      setCaptureError("Signaturen kunde inte sparas. Rensa ytan och försök igen.");
      return;
    }
    onSignatureChange(image);
    closeCapture();
  }

  return (
    <>
      <section className="inventory-signature" aria-labelledby="inventory-signature-heading">
        <div className="inventory-signature-heading">
          <div>
            <h3 id="inventory-signature-heading">Signera inventeringen</h3>
            <p>Signaturen och namnförtydligandet sparas i inventeringsrapporten.</p>
          </div>
          {signatureDataUrl && (
            <button
              type="button"
              className="inventory-signature-clear"
              onClick={() => onSignatureChange(null)}
              disabled={disabled}
            >
              Rensa
            </button>
          )}
        </div>
        <button
          type="button"
          className="inventory-signature-launch"
          onClick={openCapture}
          disabled={disabled}
          aria-haspopup="dialog"
        >
          {signatureDataUrl ? (
            <Image
              src={signatureDataUrl}
              alt="Sparad signatur"
              width={640}
              height={180}
              unoptimized
            />
          ) : (
            <span>
              <strong>Öppna signeringsytan</strong>
              <small>Använd hela skärmen och vrid gärna mobilen till liggande läge.</small>
            </span>
          )}
        </button>
        <label className="inventory-signature-name">
          <span>Namnförtydligande</span>
          <input
            type="text"
            value={signerName}
            maxLength={120}
            autoComplete="name"
            placeholder="För- och efternamn"
            disabled={disabled}
            onChange={(event) => onSignerNameChange(event.target.value)}
          />
        </label>
      </section>

      {mounted && signing && createPortal(
        <dialog
          ref={dialog}
          className="signature-capture-dialog"
          aria-labelledby={headingId}
          onCancel={(event) => {
            event.preventDefault();
            closeCapture();
          }}
        >
          <header className="signature-capture-header">
            <div>
              <h2 id={headingId}>Skriv din signatur</h2>
              <p>Vrid mobilen till liggande läge för en större signeringsyta.</p>
            </div>
            <button type="button" onClick={closeCapture} aria-label="Stäng signeringsytan">
              Stäng
            </button>
          </header>
          <main className="signature-capture-main">
            <div className="signature-capture-pad" data-empty={!draftHasSignature}>
              {canvasReady && (
                <SignatureCanvas
                  ref={pad}
                  penColor="#201b2e"
                  minWidth={1.4}
                  maxWidth={3.2}
                  throttle={8}
                  clearOnResize
                  onBegin={() => {
                    setDraftHasSignature(true);
                    setCaptureError("");
                  }}
                  canvasProps={{
                    className: "signature-capture-canvas",
                    "aria-label": "Skriv din signatur här",
                  }}
                />
              )}
              {!draftHasSignature && <span>Skriv här</span>}
            </div>
            <p className="signature-capture-rotate">Vrid mobilen för att använda hela skärmbredden.</p>
            {captureError && <p className="signature-capture-error" role="alert">{captureError}</p>}
          </main>
          <footer className="signature-capture-actions">
            <button type="button" className="button-secondary" onClick={clearDraft} disabled={!draftHasSignature}>
              Rensa
            </button>
            <button type="button" className="button" onClick={saveSignature} disabled={!draftHasSignature}>
              Använd signaturen
            </button>
          </footer>
        </dialog>,
        document.body,
      )}
    </>
  );
}
