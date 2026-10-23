"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

export function InventorySignature({
  signerName,
  onSignerNameChange,
  onSignatureChange,
  disabled,
}: {
  signerName: string;
  onSignerNameChange: (value: string) => void;
  onSignatureChange: (value: string | null) => void;
  disabled: boolean;
}) {
  const pad = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (disabled) pad.current?.off();
    else pad.current?.on();
  }, [disabled]);

  function capture() {
    const canvas = pad.current;
    if (!canvas || canvas.isEmpty()) {
      setHasSignature(false);
      onSignatureChange(null);
      return;
    }
    setHasSignature(true);
    onSignatureChange(canvas.getTrimmedCanvas().toDataURL("image/png"));
  }

  function clear() {
    pad.current?.clear();
    setHasSignature(false);
    onSignatureChange(null);
  }

  return (
    <section className="inventory-signature" aria-labelledby="inventory-signature-heading">
      <div className="inventory-signature-heading">
        <div>
          <h3 id="inventory-signature-heading">Signera inventeringen</h3>
          <p>Signaturen och namnförtydligandet sparas i inventeringsrapporten.</p>
        </div>
        <button
          type="button"
          className="inventory-signature-clear"
          onClick={clear}
          disabled={disabled || !hasSignature}
        >
          Rensa
        </button>
      </div>
      <div className="inventory-signature-pad" data-empty={!hasSignature}>
        <SignatureCanvas
          ref={pad}
          penColor="#201b2e"
          minWidth={1.2}
          maxWidth={2.7}
          throttle={8}
          clearOnResize={false}
          onBegin={() => setHasSignature(true)}
          onEnd={capture}
          canvasProps={{
            className: "inventory-signature-canvas",
            "aria-label": "Skriv din signatur här",
          }}
        />
        {!hasSignature && <span>Skriv din signatur här</span>}
      </div>
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
  );
}
