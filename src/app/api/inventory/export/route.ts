import { listInventory } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

function csvCell(v: string | number): string {
  const s = String(v ?? "")
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: Request) {
  await requireAdmin()
  const url = new URL(req.url)
  const state = url.searchParams.get("state")
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase()

  const { rows } = await listInventory().catch(() => ({ rows: [] }))
  const filtered = rows
    .filter((r) => (state === "out" || state === "low" || state === "ok" ? r.state === state : true))
    .filter((r) =>
      q
        ? [r.productTitle, r.title, r.sku, Object.values(r.options).join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(q)
        : true,
    )

  const header = "product,variant,options,sku,stock_qty,price_inr,value_inr,state"
  const body = filtered.map((r) =>
    [
      r.productTitle,
      r.title,
      Object.values(r.options).join(" / "),
      r.sku,
      r.qty,
      r.price,
      r.qty * r.price,
      r.state,
    ]
      .map(csvCell)
      .join(","),
  )
  return new Response([header, ...body].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowcase-inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
