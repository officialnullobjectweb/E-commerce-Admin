import { listOrders } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

function csvCell(v: string | number): string {
  const s = String(v ?? "")
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  await requireAdmin()
  // ponytail: listOrders caps at 500 (latest first) — dedicated unbounded query if exports grow
  const orders = await listOrders({ limit: 500 }).catch(() => [])
  const header = "invoice_no,created_at,email,name,items,total_inr,discount_inr,coupon,status,state,method"
  const rows = orders.map((o) =>
    [
      o.invoiceNo ?? "",
      o.createdAt,
      o.email,
      o.name,
      o.items.map((i) => `${i.qty ?? 1}× ${i.title ?? ""}`).join("; "),
      o.total,
      o.discount,
      o.couponCode,
      o.status,
      o.state,
      o.paymentMethod,
    ]
      .map(csvCell)
      .join(",")
  )
  return new Response([header, ...rows].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowcase-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
