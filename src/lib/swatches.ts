/**
 * Canonical colour palette — mirrors storefront `FilterSortBar.SWATCHES`
 * (keep the two lists in sync) plus common aliases older products use.
 */
export const SWATCHES: Record<string, string> = {
  Onyx: "#141414",
  Graphite: "#3a3a3c",
  Glacier: "#dbe7e9",
  Sand: "#d9c9a8",
  Sage: "#a9b8a0",
  Blush: "#e6c9c9",
  Ocean: "#aec6d8",
  Crimson: "#c2373f",
  Amber: "#e0a437",
  Forest: "#3d6b4f",
  Lavender: "#c3b2e0",
  White: "#ffffff",
  Clear: "#f3f4f6",
  Black: "#141414",
}

/** Case-insensitive hex lookup; null when the colour is a custom token. */
export function swatchHex(name: string): string | null {
  const needle = name.trim().toLowerCase()
  if (!needle) return null
  for (const [key, hex] of Object.entries(SWATCHES)) {
    if (key.toLowerCase() === needle) return hex
  }
  return null
}

export function csvColors(csv: string): string[] {
  return csv
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
}
