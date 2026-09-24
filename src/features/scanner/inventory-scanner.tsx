"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { InventoryDetail } from "@/features/inventory/session-queries";

type Resolved = { inventory: InventoryDetail; locationId: string };
export function InventoryScanner({
  inventoryId,
  locationId,
  locationCode,
  onResolved,
}: {
  inventoryId: string;
  locationId: string;
  locationCode: string;
  onResolved: (result: Resolved) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stopCamera = useRef<() => void>(() => {});
  const request = useRef<AbortController | null>(null);
  const resolving = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"starting" | "scanning" | "paused">(
    "starting",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  async function resolve(input: { qr: string } | { code: string }) {
    if (resolving.current) return;
    resolving.current = true;
    stopCamera.current();
    setState("paused");
    setBusy(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch(
        "/api/inventory/sessions/" + inventoryId + "/scan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, locationId }),
          signal: controller.signal,
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.details?.[0]?.message ??
            result.error?.message ??
            "Platsen kunde inte öppnas.",
        );
      if (!controller.signal.aborted) onResolved(result.data);
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
            "Kameran behöver en säker anslutning (HTTPS). Ange platskoden nedan för att fortsätta.",
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
        setState("scanning");
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context)
          throw new Error(
            "Kamerabilden kunde inte läsas. Ange platskoden nedan.",
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
            setError(
              "Kamerabilden kunde inte läsas. Försök igen eller ange platskoden.",
            );
          }
        }
        frame();
      } catch (error) {
        stop();
        if (disposed) return;
        setState("paused");
        setError(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Kameraåtkomst nekades. Tillåt kameran i webbläsaren eller ange platskoden nedan."
            : error instanceof DOMException &&
                (error.name === "NotFoundError" ||
                  error.name === "NotReadableError")
              ? "Ingen tillgänglig kamera hittades. Kontrollera kameran eller ange platskoden nedan."
              : error instanceof Error
                ? error.message
                : "Kameran kunde inte startas. Ange platskoden nedan.",
        );
      }
    }
    void start();
    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [attempt]);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );

  function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resolve({ code });
  }
  return (
    <div className="space-y-5">
      <p className="text-sm leading-7 text-muted">
        Rikta kameran mot QR-etiketten för {locationCode}. Material och
        antalsfält visas när rätt kod har lästs.
      </p>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-canvas">
        <video
          ref={video}
          muted
          playsInline
          autoPlay
          aria-label="Kamera för QR-skanning"
          className="h-full w-full object-contain"
        />
        {state === "scanning" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[15%] rounded-xl border-2 border-accent/70"
          />
        )}
        {state !== "scanning" && (
          <div
            className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted"
            role="status"
          >
            {busy
              ? "Öppnar platsen…"
              : state === "starting"
                ? "Startar kameran…"
                : "Kameran är pausad"}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm leading-6 text-rose-200">
          {error}
        </p>
      )}
      {state === "paused" && !busy && (
        <button
          className="button-secondary w-full"
          onClick={() => {
            setError("");
            setState("starting");
            setAttempt((value) => value + 1);
          }}
        >
          Starta kameran igen
        </button>
      )}
      <form onSubmit={manual} className="border-t border-line/60 pt-5">
        <label>
          Kan du inte skanna? Ange platskoden
          <input
            name="locationCode"
            value={code}
            required
            maxLength={16}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="A-01-02"
            disabled={busy}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <button
          className="button-secondary mt-3 w-full"
          disabled={busy || !code.trim()}
        >
          Öppna plats
        </button>
      </form>
    </div>
  );
}
