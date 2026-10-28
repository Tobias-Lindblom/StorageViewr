"use client";

import { useState, type FormEvent } from "react";
import { formatSek, formatSekInput, parseSekValue, sekToUnits } from "@/lib/money";

export type IncomingValueDraft = {
  label: string;
  amount: string;
};

export function IncomingValueEditor({
  entries,
  onChange,
  disabled,
}: {
  entries: IncomingValueDraft[];
  onChange: (entries: IncomingValueDraft[]) => void;
  disabled: boolean;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const total = entries.reduce(
    (sum, entry) => sum + sekToUnits(entry.amount),
    BigInt(0),
  );

  function reset() {
    setLabel("");
    setAmount("");
    setEditingIndex(null);
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedLabel = label.trim();
    if (!normalizedLabel) {
      setError("Ange en referens eller beskrivning.");
      return;
    }
    try {
      const value = parseSekValue(amount);
      if (value === null) throw new Error("missing amount");
      const next = { label: normalizedLabel, amount: value };
      if (editingIndex === null) onChange([...entries, next]);
      else onChange(entries.map((entry, index) => index === editingIndex ? next : entry));
      reset();
    } catch {
      setError("Ange ett värde på minst 0 kr, med högst fyra decimaler.");
    }
  }

  function edit(index: number) {
    const entry = entries[index];
    setLabel(entry.label);
    setAmount(formatSekInput(entry.amount));
    setEditingIndex(index);
    setError("");
  }

  function remove(index: number) {
    onChange(entries.filter((_, entryIndex) => entryIndex !== index));
    if (editingIndex === index) reset();
    else if (editingIndex !== null && editingIndex > index)
      setEditingIndex(editingIndex - 1);
  }

  const atLimit = entries.length >= 50 && editingIndex === null;

  return (
    <section className="incoming-value-editor" aria-labelledby="incoming-value-heading">
      <header>
        <h3 id="incoming-value-heading">Inkommande varuvärde</h3>
        <p>Varor som är på väg men inte ingår i den fysiska inventeringen.</p>
      </header>

      {entries.length > 0 && (
        <>
          <ul className="incoming-value-list">
            {entries.map((entry, index) => (
              <li key={entry.label + ":" + entry.amount + ":" + index}>
                <div>
                  <strong>{entry.label}</strong>
                  <span>{formatSek(sekToUnits(entry.amount))}</span>
                </div>
                <div className="incoming-value-row-actions">
                  <button type="button" onClick={() => edit(index)} disabled={disabled}>Redigera</button>
                  <button type="button" onClick={() => remove(index)} disabled={disabled}>Ta bort</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="incoming-value-total">
            <span>Totalt inkommande</span>
            <strong>{formatSek(total)}</strong>
          </div>
        </>
      )}

      <form onSubmit={submit} className="incoming-value-form">
        <label>
          <span>Referens / beskrivning</span>
          <input
            type="text"
            value={label}
            required
            maxLength={120}
            disabled={disabled}
            placeholder="Exempel: HMD (Dispo van)"
            autoComplete="off"
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <label>
          <span>Värde</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            required
            maxLength={30}
            disabled={disabled}
            placeholder="Exempel: 10 000"
            autoComplete="off"
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        {error && <p className="incoming-value-error" role="alert">{error}</p>}
        <div className="incoming-value-form-actions">
          <button type="submit" className="button-secondary" disabled={disabled || atLimit}>
            {editingIndex === null ? "+ Lägg till post" : "Spara ändring"}
          </button>
          {editingIndex !== null && (
            <button type="button" onClick={reset} disabled={disabled}>Avbryt</button>
          )}
        </div>
        {atLimit && <p className="incoming-value-limit">Högst 50 poster kan läggas till.</p>}
      </form>
    </section>
  );
}
