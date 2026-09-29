import { listCustomers } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

function csvCell(v: string | number): string {
  const s = String(v ?? "")
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  await requireAdmin()
  const customers = await listCustomers().catch(() => [])
  const header = "email,name,phone,orders,paid_revenue_inr,last_order,tags,notes,marketing_opt_in"
  const rows = customers.map((c) =>
    [
      c.email,
      c.name,
      c.phone,
      c.orders,
      c.revenue,
      c.lastOrderAt ?? "",
      c.tags.join("|"),
      c.notes,
      c.marketingOptIn ? "yes" : "no",
    ]
      .map(csvCell)
      .join(",")
  )
  return new Response([header, ...rows].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowcase-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
