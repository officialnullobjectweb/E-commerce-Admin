import type { Order } from "./types"

/**
 * Financial summaries + GST register built from real order data.
 * Orders don't store tax (prices are treated as tax-inclusive at 18% GST,
 * the standard rate for phone accessories) — splits are indicative.
 */

export const GST_RATE = 0.18

export interface Summary {
  count: number
  gross: number // sum(subtotal)
  discounts: number
  shipping: number
  returnsValue: number // total of returned/refunded orders
  net: number // total minus returns
  gst: number // indicative GST inside net (tax-inclusive)
  taxable: number // net minus gst
}

export function isSettled(o: Order): boolean {
  return o.status === "paid" || o.status === "refunded"
}

export function isReturn(o: Order): boolean {
  return o.state === "returned" || o.status === "refunded"
}

export function summarize(orders: Order[]): Summary {
  const settled = orders.filter(isSettled)
  const s: Summary = {
    count: settled.length,
    gross: 0,
    discounts: 0,
    shipping: 0,
    returnsValue: 0,
    net: 0,
    gst: 0,
    taxable: 0,
  }
  for (const o of settled) {
    s.gross += o.subtotal || 0
    s.discounts += o.discount || 0
    s.shipping += o.shipping || 0
    if (isReturn(o)) s.returnsValue += o.total || 0
    else s.net += o.total || 0
  }
  // tax-inclusive: net = taxable + gst, gst = net * r/(1+r)
  s.taxable = Math.round(s.net / (1 + GST_RATE))
  s.gst = s.net - s.taxable
  return s
}

export interface TaxRow extends Summary {
  month: string // "2026-09"
  cgst: number
  sgst: number
}

/** Monthly GST register, newest first, months with no settled orders skipped. */
export function taxRegister(orders: Order[], months = 12): TaxRow[] {
  const byMonth = new Map<string, Order[]>()
  for (const o of orders) {
    if (!isSettled(o)) continue
    const key = o.createdAt.slice(0, 7)
    const list = byMonth.get(key)
    if (list) list.push(o)
    else byMonth.set(key, [o])
  }
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, months)
    .map(([month, list]) => {
      const s = summarize(list)
      const cgst = Math.floor(s.gst / 2)
      return { month, ...s, cgst, sgst: s.gst - cgst }
    })
}
