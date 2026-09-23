"use client";
export function PrintButton() {
  return (
    <button className="button" onClick={() => window.print()}>
      Skriv ut etiketter
    </button>
  );
}
