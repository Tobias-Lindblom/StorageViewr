"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AppIcon } from "@/components/app-icon";

export function QrScanner({ locationCode, description, resolveCode, actionLabel = "Verifiera plats", compact = false, active = true }: {
  locationCode: string; description: string; actionLabel?: string; compact?: boolean; active?: boolean;
  resolveCode: (input: { qr: string } | { code: string }, signal: AbortSignal) => Promise<void>;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const manualInput = useRef<HTMLInputElement>(null);
  const manualId = useId();
  const [manualOpen, setManualOpen] = useState(false);
  useEffect(() => { if (manualOpen) manualInput.current?.focus(); }, [manualOpen]);
  const stopCamera = useRef<() => void>(() => {});
  const request = useRef<AbortController | null>(null);
  const resolving = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"starting" | "scanning" | "paused">(
    "starting",
  );
  const [error, setError] = useState("");
  const [cameraIssue, setCameraIssue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  async function resolve(input: { qr: string } | { code: string }) {
    if (resolving.current) return;
    resolving.current = true;
    stopCamera.current();
    setState("paused");
    setBusy(true);
    setError("");
    setCameraIssue(false);
    const controller = new AbortController();
    request.current = controller;
    try {
      await resolveCode(input, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Platsen kunde inte öppnas. Försök igen.",
        );
    } finally {
      if (!controller.signal.aborted) {
        resolving.current = false;
        setBusy(false);
      }
    }
  }
  const onRead = useRef(resolve);
  useEffect(() => {
    onRead.current = resolve;
  });

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const element = video.current;
    function stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (element && element.srcObject === stream) element.srcObject = null;
    }
    stopCamera.current = stop;
    function visibility() {
      if (document.hidden) {
        stop();
        setState("paused");
      }
    }
    document.addEventListener("visibilitychange", visibility);
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Kameran kräver en säker anslutning (HTTPS).",
          );
        }
        const { default: jsQR } = await import("jsqr");
        if (disposed || stopped) return;
        const acquired = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        stream = acquired;
        if (disposed || stopped || document.hidden) {
          stop();
          return;
        }
        if (!element) {
          stop();
          return;
        }
        element.srcObject = stream;
        await element.play();
        if (disposed || stopped) return;
        setCameraIssue(false);
        setState("scanning");
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context)
          throw new Error(
            "Kamerabilden kunde inte läsas.",
          );
        function frame() {
          if (disposed || stopped || !element || !context) return;
          try {
            if (element.readyState >= 2 && element.videoWidth > 0) {
              const scale = Math.min(
                1,
                960 / Math.max(element.videoWidth, element.videoHeight),
              );
              canvas.width = Math.round(element.videoWidth * scale);
              canvas.height = Math.round(element.videoHeight * scale);
              context.drawImage(element, 0, 0, canvas.width, canvas.height);
              const pixels = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const result = jsQR(pixels.data, pixels.width, pixels.height, {
                inversionAttempts: "dontInvert",
              });
              if (result?.data) {
                stop();
                setState("paused");
                void onRead.current({ qr: result.data });
                return;
              }
            }
            timer = setTimeout(frame, 180);
          } catch {
            stop();
            setState("paused");
            setCameraIssue(true);
            setError(
              "Kamerabilden kunde inte läsas. Försök starta kameran igen.",
            );
          }
        }
        frame();
      } catch (error) {
        if (disposed || stopped) return;
        stop();
        setState("paused");
        setCameraIssue(true);
        setError(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Kameraåtkomst nekades. Tillåt kameran i webbläsarens inställningar och försök igen."
            : error instanceof DOMException &&
                (error.name === "NotFoundError" ||
                  error.name === "NotReadableError")
              ? "Ingen tillgänglig kamera hittades. Kontrollera att kameran inte används av en annan app."
              : error instanceof Error
                ? error.message
                : "Kameran kunde inte startas.",
        );
      }
    }
    void start();
    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [attempt, active]);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [active],
  );

  function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resolve({ code });
  }
  function retry() {
    setError(""); setCameraIssue(false); setManualOpen(false);
    setState("starting"); setAttempt(value => value + 1);
  }
  if (compact) return <div className="scanner-content">
    <div className="scanner-camera" data-state={state} data-manual={manualOpen}>
      <video ref={video} muted playsInline autoPlay aria-label="Kamera för QR-skanning" />
      {state === "scanning" && <>
        <div className="scanner-target" aria-hidden="true"><i /><i /><i /><i /></div>
        <p className="scanner-camera-hint"><AppIcon name="scan" width={20} height={20} />Håll QR-koden inom ramen</p>
      </>}
      {state !== "scanning" && <div className="scanner-camera-status" role="status">
        <AppIcon name={busy ? "location" : "camera"} width={30} height={30} />
        <strong>{busy ? "Öppnar lagerplats…" : state === "starting" ? "Startar kameran…" :
          cameraIssue ? "Kameran är inte tillgänglig" : manualOpen ? "Ange platskoden nedan" : "Kameran är pausad"}</strong>
        {!busy && state === "paused" && <button type="button" className="scanner-retry" onClick={retry}>Starta kameran igen</button>}
      </div>}
    </div>
    {error && <p role="alert" className="scanner-error">{error}</p>}
    <button type="button" className="scanner-manual-trigger" disabled={busy}
      aria-expanded={manualOpen} aria-controls={manualId} onClick={() => {
        if (manualOpen) { retry(); return; }
        stopCamera.current(); setState("paused"); setError(""); setCameraIssue(false); setManualOpen(true);
      }}>
      <AppIcon name="keyboard" width={25} height={25} />
      <span>Ange platskod manuellt</span><AppIcon name="chevron" width={17} height={17} />
    </button>
    {manualOpen && <form id={manualId} className="scanner-manual-form" onSubmit={manual}>
      <label>Platskod<input ref={manualInput} name="locationCode" value={code} required maxLength={16}
        autoComplete="off" autoCapitalize="characters" placeholder={locationCode} spellCheck={false}
        disabled={busy} onChange={event => setCode(event.target.value)} /></label>
      <button type="submit" className="scanner-submit" disabled={busy || !code.trim()}>
        {busy ? "Öppnar lagerplats…" : actionLabel}
      </button>
    </form>}
    <p className="scanner-help"><AppIcon name="info" width={17} height={17} />Kan du inte skanna? Verifiera platsen manuellt.</p>
  </div>;
  return (
    <div>
      <p className="text-sm leading-6 text-muted">
        {description}
      </p>
      {state === "starting" || state === "scanning" ? (
        <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-canvas">
          <video
            ref={video}
            muted
            playsInline
            autoPlay
            aria-label="Kamera för QR-skanning"
            className="h-full w-full object-cover"
          />
          {state === "scanning" ? (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[16%] rounded-2xl border-2 border-white/70 shadow-[0_0_0_999px_rgba(9,8,16,0.3)]"
              />
              <p className="absolute inset-x-0 bottom-4 text-center text-xs font-medium text-white">
                Söker efter QR-kod…
              </p>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-canvas/80 p-6 text-center text-sm text-muted" role="status">
              Startar kameran…
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 flex min-h-28 items-center gap-4 rounded-2xl border border-line bg-canvas p-5" role="status">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-muted">
            <AppIcon name="camera" />
          </span>
          <div>
            <p className="text-sm font-medium">
              {busy
                ? "Verifierar platskoden…"
                : error
                  ? cameraIssue
                    ? "Kameran är inte tillgänglig"
                    : "Verifieringen avbröts"
                  : "Kameran är pausad"}
            </p>
            {!busy && <p className="mt-1 text-xs leading-5 text-muted">Starta kameran igen eller verifiera platsen manuellt.</p>}
          </div>
        </div>
      )}
      {error && (
        <div role="alert" className="error mt-4">
          <p className="font-medium">
            {cameraIssue ? "Kunde inte använda kameran" : "Platsen kunde inte verifieras"}
          </p>
          <p className="mt-1 leading-5">{error}</p>
        </div>
      )}
      {state === "paused" && !busy && (
        <button
          type="button"
          className="button-secondary mt-4 w-full"
          onClick={() => {
            setError("");
            setCameraIssue(false);
            setState("starting");
            setAttempt((value) => value + 1);
          }}
        >
          Försök med kameran igen
        </button>
      )}
      <form onSubmit={manual} className="mt-6 border-t border-line/60 pt-5">
        <div className="mb-4">
          <h3 className="mb-1! text-base!">Verifiera manuellt</h3>
          <p className="text-xs leading-5 text-muted">Ange platskoden om QR-koden inte kan skannas.</p>
        </div>
        <label>
          Platskod
          <input
            name="locationCode"
            value={code}
            required
            maxLength={16}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder={locationCode}
            spellCheck={false}
            disabled={busy}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <button
          className="button-secondary mt-3 w-full"
          disabled={busy || !code.trim()}
        >
          {actionLabel}
        </button>
      </form>
    </div>
  );
}
