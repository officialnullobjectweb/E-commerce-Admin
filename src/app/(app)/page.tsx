import type { Metadata } from "next"
import Link from "next/link"
import { PageHeader } from "@/components/layout"
import { DashboardChart } from "@/components/DashboardChart"
import { Badge, MoneyDisplay } from "@/components/display"
import { cn } from "@/lib/cn"
import { getAlerts, getDaily, getStats, listOrders } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { DashboardStats, DayPoint } from "@/lib/types"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
const FALLBACK_STATS: DashboardStats = { products: 0, orders: 0, paidOrders: 0, revenueInr: 0, reviews: 0 }

function deltaPct(cur: number, prev: number): number | null {
  return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null
}

function Card({
  label,
  value,
  hint,
  delta,
}: {
  label: string
  value: string
  hint?: string
  delta?: number | null
}) {
  return (
    <div className="rounded-card border border-line bg-paper p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="label text-faint">{label}</p>
        {delta !== undefined && <Delta v={delta} />}
      </div>
      <p className="font-display mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  )
}

function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="text-xs text-faint">—</span>
  return (
    <span
      className={cn("text-xs font-medium tabular-nums", v >= 0 ? "text-ok" : "text-bad")}
      title="vs previous 7 days"
    >
      {v >= 0 ? "▲" : "▼"} {Math.abs(v)}%
    </span>
  )
}

const STAGES = ["new", "packing", "shipped", "delivered", "returned"]

function SplitList({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0)
  const max = Math.max(...rows.map((r) => r.count), 1)
  if (total === 0) return <p className="py-4 text-sm text-faint">{empty}</p>
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="capitalize">{r.label}</span>
            <span className="tabular-nums text-faint">
              {r.count}
              <span className="ml-1.5 text-xs">({Math.round((r.count / total) * 100)}%)</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-wash">
            <div
              className="h-full rounded-full bg-ink transition-[width]"
              style={{ width: `${Math.max((r.count / max) * 100, r.count > 0 ? 6 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default async function DashboardPage() {
  await requireAdmin()
  const [stats, daily, alerts, recent] = await Promise.all([
    getStats().catch(() => FALLBACK_STATS),
    getDaily(90).catch((e) => {
      console.error("[dashboard] getDaily failed:", e)
      return [] as DayPoint[]
    }),
    getAlerts().catch(() => ({ lowStock: [], topProducts: [] })),
    listOrders({ limit: 5 }).catch(() => []),
  ])
  const aov = stats.paidOrders > 0 ? Math.round(stats.revenueInr / stats.paidOrders) : 0

  // 7-day deltas vs the previous 7 days
  const rev7 = daily.slice(-7).reduce((s, d) => s + d.revenue, 0)
  const revPrev = daily.slice(-14, -7).reduce((s, d) => s + d.revenue, 0)
  const ord7 = daily.slice(-7).reduce((s, d) => s + d.orders, 0)
  const ordPrev = daily.slice(-14, -7).reduce((s, d) => s + d.orders, 0)

  const stateRows = STAGES.filter((s) => (stats.states?.[s] ?? 0) > 0 || s === "new").map((s) => ({
    label: s,
    count: stats.states?.[s] ?? 0,
  }))
  const methodRows = Object.entries(stats.methods ?? {})
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Store health at a glance." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Card
          label="Revenue"
          value={inr.format(stats.revenueInr)}
          hint={
            (stats.couponDiscountInr ?? 0) > 0
              ? `${stats.paidOrders} paid · ${inr.format(stats.couponDiscountInr ?? 0)} discounted`
              : `${stats.paidOrders} paid orders`
          }
          delta={deltaPct(rev7, revPrev)}
        />
        <Card label="Orders" value={String(stats.orders)} delta={deltaPct(ord7, ordPrev)} />
        <Card label="Avg order" value={inr.format(aov)} hint="paid orders" />
        <Card label="Products" value={String(stats.products)} />
        <Card label="Reviews" value={String(stats.reviews)} />
        <Card
          label="Low stock"
          value={String(stats.lowStock ?? 0)}
          hint={alerts.lowStock[0] ? `lowest: ${alerts.lowStock[0].products?.title ?? "—"}` : "all stocked"}
        />
      </div>

      <DashboardChart data={daily} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-paper p-5">
          <h2 className="font-display text-base font-bold">Fulfilment</h2>
          <SplitList rows={stateRows} empty="No orders yet." />
        </div>
        <div className="rounded-card border border-line bg-paper p-5">
          <h2 className="font-display text-base font-bold">Payment methods</h2>
          <SplitList rows={methodRows} empty="No payments yet." />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-paper p-5">
          <h2 className="font-display text-base font-bold">
            Low stock {alerts.lowStock.length > 0 && `(${alerts.lowStock.length})`}
          </h2>
          {alerts.lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-faint">Every variant is above the threshold.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {alerts.lowStock.slice(0, 6).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{v.products?.title ?? "—"}</span>{" "}
                    <span className="text-faint">{v.title}</span>
                  </span>
                  <Badge tone={v.inventory_qty === 0 ? "bad" : "warn"}>
                    {v.inventory_qty === 0 ? "out" : `${v.inventory_qty} left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-card border border-line bg-paper p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold">Recent orders</h2>
            <Link href="/orders" className="label text-faint transition hover:text-ink">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-4 text-sm text-faint">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                      {o.email}
                    </Link>
                    <span className="block truncate text-xs text-faint">
                      {(o.items ?? []).map((i) => `${i.title ?? "?"}×${i.qty ?? 1}`).join(", ") || "—"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <MoneyDisplay amount={o.total} />
                    <Badge tone={o.status === "paid" ? "ok" : o.status === "pending" ? "warn" : "bad"}>
                      {o.status}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
