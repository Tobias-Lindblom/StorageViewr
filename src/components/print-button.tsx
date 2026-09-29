"use client";
export function PrintButton() {
  return (
    <button type="button" className="button w-full sm:w-auto" onClick={() => window.print()}>
      Skriv ut etiketter
    </button>
  );
}
