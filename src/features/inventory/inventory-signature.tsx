"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import SignatureCanvas from "react-signature-canvas";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

type StandaloneNavigator = Navigator & { standalone?: boolean };

const subscribeToClient = () => () => undefined;

function runsAsInstalledApp() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as StandaloneNavigator).standalone === true;
}

function resizeSignatureCanvas(instance: SignatureCanvas) {
  const canvas = instance.getCanvas();
  const bounds = canvas.getBoundingClientRect();
  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);
  if (width < 1 || height < 1) return;

  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const previousRatio = Number(canvas.dataset.signatureRatio) || ratio;
  const previousWidth = canvas.width / previousRatio;
  const previousHeight = canvas.height / previousRatio;
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);
  canvas.dataset.signatureRatio = String(ratio);
  if (canvas.width === targetWidth && canvas.height === targetHeight) return;

  const data = instance.toData();
  const scaleX = previousWidth > 0 ? width / previousWidth : 1;
  const scaleY = previousHeight > 0 ? height / previousHeight : 1;
  const scaled = data.map((stroke) => stroke.map((point) => ({
    ...point,
    x: point.x * scaleX,
    y: point.y * scaleY,
  }))) as ReturnType<SignatureCanvas["toData"]>;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.getContext("2d")?.scale(ratio, ratio);
  instance.clear();
  if (scaled.length) instance.fromData(scaled);
}

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
    return () => {
      cancelAnimationFrame(frame);
      if (element.open) element.close();
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [signing]);

  useEffect(() => {
    if (!signing || !canvasReady) return;
    if (!pad.current) return;
    const instance = pad.current;
    const canvas = instance.getCanvas();
    const container = canvas.parentElement;
    if (!container) return;

    let frame = 0;
    function scheduleResize() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        resizeSignatureCanvas(instance);
        setDraftHasSignature(!instance.isEmpty());
      });
    }
    const observer = new ResizeObserver(scheduleResize);
    observer.observe(container);
    window.visualViewport?.addEventListener("resize", scheduleResize);
    screen.orientation?.addEventListener("change", scheduleResize);
    scheduleResize();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", scheduleResize);
      screen.orientation?.removeEventListener("change", scheduleResize);
    };
  }, [canvasReady, signing]);

  function openCapture() {
    if (disabled) return;
    captureOpen.current = true;
    setDraftHasSignature(false);
    setCaptureError("");
    setCanvasReady(false);
    setSigning(true);

    const orientation = screen.orientation as LockableOrientation | undefined;
    const lockLandscape = async () => {
      try {
        await orientation?.lock?.("landscape");
      } catch {
        // Portrait remains fully usable when the PWA or device rejects a lock.
      }
    };
    if (runsAsInstalledApp() || document.fullscreenElement ||
      !document.documentElement.requestFullscreen) {
      void lockLandscape();
      return;
    }
    void document.documentElement
      .requestFullscreen({ navigationUI: "hide" })
      .then(async () => {
        if (!captureOpen.current) {
          await document.exitFullscreen?.().catch(() => undefined);
          return;
        }
        enteredFullscreen.current = true;
        await lockLandscape();
      })
      .catch(lockLandscape);
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
              <small>Signera i stående eller liggande läge med hela skärmen.</small>
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
              <p>Signera direkt eller vrid mobilen för en bredare signeringsyta.</p>
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
                  clearOnResize={false}
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
            <p className="signature-capture-rotate">Du kan signera här direkt eller vrida mobilen för en bredare yta.</p>
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
