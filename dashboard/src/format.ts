/** `0x1234…abcd` */
export function shortAddress(address: string | null | undefined, size = 4): string {
  if (!address) return "-";
  if (address.length <= size * 2 + 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

/**
 * Formats an 18-decimal uint256 (as a string) for display.
 * Uses BigInt so values larger than 2^53 never lose precision.
 */
export function formatTokenAmount(value: string, decimals = 18): string {
  let raw: bigint;
  try {
    raw = BigInt(value);
  } catch {
    return value;
  }

  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  const wholeText = whole.toLocaleString("en-US");

  if (fraction === 0n) return `${wholeText} CIDX`;

  const fractionText = fraction.toString().padStart(decimals, "0").slice(0, 4).replace(/0+$/, "");
  return fractionText.length > 0
    ? `${wholeText}.${fractionText} CIDX`
    : `${wholeText} CIDX`;
}

/** Unix seconds (as a string) -> local date-time. */
export function formatTimestamp(unixSeconds: string | null | undefined): string {
  if (!unixSeconds) return "-";
  const seconds = Number(unixSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  return new Date(seconds * 1000).toLocaleString();
}

/** ISO string -> local time (used for the usage log). */
export function formatIso(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString();
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
