/** Indian rupees — whole amounts without decimals, paise when needed. */
export function inr(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number(n) % 1 === 0 ? 0 : 2,
  }).format(Number(n))
}

/** Compact datetime for tables (en-IN). */
export function dateTime(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}
