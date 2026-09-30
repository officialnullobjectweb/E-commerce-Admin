import Link from "next/link"
import { OrdersFilters } from "@/components/orders/OrdersFilters"
import { PageHeader } from "@/components/layout"
import { OrdersTable } from "@/components/list-tables"
import { listOrders } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Order, OrderState } from "@/lib/types"

export const metadata = { title: "Orders", robots: { index: false, follow: false } }

const STATUSES = ["", "pending", "paid", "failed", "refunded", "cancelled"] as const
const STATES = ["", "new", "packing", "shipped", "delivered", "returned"] as const
const METHODS = ["", "razorpay", "cod", "manual"] as const
const DAYS = ["", "7", "30", "90"] as const

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; state?: string; method?: string; days?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status ?? "") : ""
  const state = (STATES as readonly string[]).includes(sp.state ?? "") ? (sp.state ?? "") : ""
  const method = (METHODS as readonly string[]).includes(sp.method ?? "") ? (sp.method ?? "") : ""
  const days = (DAYS as readonly string[]).includes(sp.days ?? "") ? (sp.days ?? "") : ""
  const from = days ? new Date(Date.now() - Number(days) * 86400_000).toISOString() : undefined
  const orders = await listOrders({ limit: 200, status, state: state as OrderState | undefined, method, from }).catch(
    () => [] as Order[]
  )

  const filters = [status, state, method, days ? `last ${days}d` : ""].filter(Boolean)

  const linkFor = (s: string) => {
    const p = new URLSearchParams()
    if (s) p.set("status", s)
    if (state) p.set("state", state)
    if (method) p.set("method", method)
    if (days) p.set("days", days)
    return `/orders${p.size ? `?${p}` : ""}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description={`${orders.length} shown${filters.length ? ` · ${filters.join(" · ")}` : ""}`}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const active = s === status
            return (
              <Link
                key={s || "all"}
                href={linkFor(s)}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "label rounded-full bg-ink px-3.5 py-2 capitalize text-paper"
                    : "label rounded-full border border-line px-3.5 py-2 capitalize text-faint transition hover:border-ink hover:text-ink"
                }
              >
                {s || "all"}
              </Link>
            )
          })}
        </nav>

        <OrdersFilters state={state} method={method} days={days} />
      </div>

      <OrdersTable orders={orders} status={status} />
    </div>
  )
}
