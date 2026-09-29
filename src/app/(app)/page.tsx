import type { Metadata } from "next"
import Link from "next/link"
import { PageHeader } from "@/components/layout"
import { RevenueChart } from "@/components/RevenueChart"
import { Badge, MoneyDisplay } from "@/components/display"
import { getAlerts, getDaily, getStats, listOrders } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-line bg-paper p-5">
      <p className="label text-faint">{label}</p>
      <p className="font-display mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  await requireAdmin()
  const [stats, daily, alerts, recent] = await Promise.all([
    getStats().catch(() => ({ products: 0, orders: 0, paidOrders: 0, revenueInr: 0, reviews: 0 })),
    getDaily(14).catch(() => []),
    getAlerts().catch(() => ({ lowStock: [], topProducts: [] })),
    listOrders(5).catch(() => []),
  ])
  const aov = stats.paidOrders > 0 ? Math.round(stats.revenueInr / stats.paidOrders) : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Store health at a glance." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Card label="Revenue" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(stats.revenueInr)} hint={`${stats.paidOrders} paid orders`} />
        <Card label="Orders" value={String(stats.orders)} />
        <Card label="Avg order" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(aov)} />
        <Card label="Products" value={String(stats.products)} />
        <Card label="Reviews" value={String(stats.reviews)} />
      </div>

      <div className="rounded-card border border-line bg-paper p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-base font-bold">Revenue · last 14 days</h2>
          <span className="label text-faint">INR</span>
        </div>
        <div className="mt-4">
          {daily.some((d) => d.revenue > 0) ? (
            <RevenueChart data={daily} />
          ) : (
            <p className="py-8 text-center text-sm text-faint">No revenue yet — paid orders will chart here.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-paper p-5">
          <h2 className="font-display text-base font-bold">
            Low stock {alerts.lowStock.length > 0 && `(${alerts.lowStock.length})`}
          </h2>
          {alerts.lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-faint">Every variant has 10+ units.</p>
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
