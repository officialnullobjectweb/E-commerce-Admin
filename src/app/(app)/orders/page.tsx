import Link from "next/link"
import { PageHeader } from "@/components/layout"
import { OrdersTable } from "@/components/list-tables"
import { listOrders } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Order } from "@/lib/types"

export const metadata = { title: "Orders", robots: { index: false, follow: false } }

const STATUSES = ["", "pending", "paid", "failed", "refunded", "cancelled"] as const

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin()
  const { status: raw } = await searchParams
  const status = (STATUSES as readonly string[]).includes(raw ?? "") ? ((raw ?? "") as Order["status"] | "") : ""
  const orders = await listOrders(200, status).catch(() => [] as Order[])

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description={`${orders.length} shown${status ? ` · ${status} only` : ""}`} />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = s === status
          return (
            <Link
              key={s || "all"}
              href={s ? `/orders?status=${s}` : "/orders"}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "label rounded-full bg-ink px-3.5 py-2 text-paper"
                  : "label rounded-full border border-line px-3.5 py-2 text-faint transition hover:border-ink hover:text-ink"
              }
            >
              {s || "all"}
            </Link>
          )
        })}
      </nav>

      <OrdersTable orders={orders} status={status} />
    </div>
  )
}
