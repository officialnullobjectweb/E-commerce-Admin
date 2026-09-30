import { listOrders } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { taxRegister } from "@/lib/finance"
import type { Order } from "@/lib/types"

export const dynamic = "force-dynamic"

function csvCell(v: string | number): string {
  const s = String(v ?? "")
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  await requireAdmin()
  const orders = await listOrders({ limit: 500 }).catch(() => [] as Order[])
  const rows = taxRegister(orders, 24)
  const header = "month,settled_orders,gross_inr,discounts_inr,shipping_inr,returns_inr,net_revenue_inr,taxable_inr,cgst_inr,sgst_inr,gst_total_inr"
  const body = rows.map((r) =>
    [r.month, r.count, r.gross, r.discounts, r.shipping, r.returnsValue, r.net, r.taxable, r.cgst, r.sgst, r.gst]
      .map(csvCell)
      .join(","),
  )
  return new Response([header, ...body].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowcase-tax-register-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
