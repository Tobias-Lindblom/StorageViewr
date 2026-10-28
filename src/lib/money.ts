/** Unit values are canonical SEK strings with four decimals. Arithmetic uses 1/10,000 SEK. */
export function parseSekValue(input: string): string | null {
  const value = input.trim().replace(/[ \u00a0\u202f]/g, "");
  if (!value) return null;
  if (!/^\d{1,14}([.,]\d{1,4})?$/.test(value))
    throw new Error("Ange ett positivt styckvärde eller 0, med högst fyra decimaler.");
  const [whole, fraction = ""] = value.split(/[.,]/);
  return BigInt(whole).toString() + "." + fraction.padEnd(4, "0");
}

export function legacyOreToSek(ore: number | null): string | null {
  if (ore === null) return null;
  const amount = BigInt(ore);
  return (amount / BigInt(100)).toString() + "." +
    (amount % BigInt(100)).toString().padStart(2, "0") + "00";
}

export function sekToUnits(value: string): bigint {
  return BigInt(value.replace(".", ""));
}

export function formatSekInput(value: string | null): string {
  if (value === null) return "";
  const [whole, fraction] = value.split(".");
  // Keep at least two decimals, and show additional precision when needed.
  return whole + "," + fraction.slice(0, 2) + fraction.slice(2).replace(/0+$/, "");
}

export function formatUnitValue(value: string): string {
  const [whole, fraction] = formatSekInput(value).split(",");
  return BigInt(whole).toLocaleString("sv-SE") + "," + fraction + "\u00a0kr";
}

export function formatSek(units: bigint): string {
  // Round only the final stock value to öre, half up.
  const ore = (units + BigInt(50)) / BigInt(100);
  return (ore / BigInt(100)).toLocaleString("sv-SE") + "," +
    (ore % BigInt(100)).toString().padStart(2, "0") + "\u00a0kr";
}
