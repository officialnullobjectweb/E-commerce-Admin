import { Download } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { MoneyDisplay } from "@/components/display"
import { getDaily, getTopProducts } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { DayPoint } from "@/lib/types"

export const metadata = { title: "Reports", robots: { index: false, follow: false } }

const th = "px-4 py-3 text-left align-middle"
const td = "px-4 py-3 align-middle"

export default async function ReportsPage() {
  await requireAdmin()
  const [daily, top] = await Promise.all([
    getDaily(90).catch(() => [] as DayPoint[]),
    getTopProducts(30, 20).catch(() => ({ products: [], revenue: 0, orders: 0 })),
  ])

  const periods = [
    { label: "Last 7 days", pts: daily.slice(-7) },
    { label: "Last 30 days", pts: daily.slice(-30) },
    { label: "Last 90 days", pts: daily.slice(-90) },
  ].map((p) => {
    const revenue = p.pts.reduce((s, d) => s + d.revenue, 0)
    const orders = p.pts.reduce((s, d) => s + d.orders, 0)
    return { ...p, revenue, orders, aov: orders > 0 ? Math.round(revenue / orders) : 0 }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales performance · top sellers from paid orders"
        actions={
          <a
            href="/api/orders/export"
            className="label inline-flex h-10 items-center gap-2 rounded-control border border-line px-3.5 transition hover:border-ink"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export orders CSV
          </a>
        }
      />

      <section className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-wash/60">
              <th className={th}>Metric</th>
              {periods.map((p) => (
                <th key={p.label} className={th}>
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <td className={`${td} font-medium`}>Revenue</td>
              {periods.map((p) => (
                <td key={p.label} className={`${td} tabular-nums`}>
                  <MoneyDisplay amount={p.revenue} />
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${td} font-medium`}>Orders</td>
              {periods.map((p) => (
                <td key={p.label} className={`${td} tabular-nums`}>
                  {p.orders}
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${td} font-medium`}>Avg order</td>
              {periods.map((p) => (
                <td key={p.label} className={`${td} tabular-nums`}>
                  <MoneyDisplay amount={p.aov} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold">Top products · 30 days</h2>
          <p className="text-xs text-faint">
            {top.orders} paid orders · <MoneyDisplay amount={top.revenue} /> revenue
          </p>
        </div>
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-wash/60">
                <th className={th}>#</th>
                <th className={th}>Product</th>
                <th className={th}>Units</th>
                <th className={th}>Revenue</th>
                <th className={th}>Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {top.products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <p className="font-medium">No paid orders in this period</p>
                    <p className="mt-1 text-sm text-faint">Sales land here once orders are paid.</p>
                  </td>
                </tr>
              )}
              {top.products.map((p, i) => (
                <tr key={p.title} className="transition hover:bg-wash/70">
                  <td className={`${td} tabular-nums text-faint`}>{i + 1}</td>
                  <td className={`${td} font-medium`}>{p.title}</td>
                  <td className={`${td} tabular-nums`}>{p.units}</td>
                  <td className={`${td} tabular-nums`}>
                    <MoneyDisplay amount={p.revenue} />
                  </td>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-faint">{(p.share * 100).toFixed(1)}%</span>
                      <span aria-hidden="true" className="h-1.5 w-20 overflow-hidden rounded-full bg-wash">
                        <span className="block h-1.5 rounded-full bg-ink" style={{ width: `${Math.round(p.share * 100)}%` }} />
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
