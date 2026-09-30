import { Download } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { MoneyDisplay } from "@/components/display"
import { getDaily, getTopProducts, listOrders } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { summarize, taxRegister } from "@/lib/finance"
import type { DayPoint, Order } from "@/lib/types"

export const metadata = { title: "Reports", robots: { index: false, follow: false } }

const th = "label px-4 py-3 text-left align-middle text-faint"
const td = "px-4 py-3 align-middle"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

function monthLabel(key: string): string {
  const [y, m] = key.split("-")
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${names[Number(m) - 1]} ${y}`
}

export default async function ReportsPage() {
  await requireAdmin()
  // ponytail: listOrders caps at 500 (latest first) — dedicated unbounded query if reports grow
  const [daily, top, orders] = await Promise.all([
    getDaily(90).catch(() => [] as DayPoint[]),
    getTopProducts(30, 20).catch(() => ({ products: [], revenue: 0, orders: 0 })),
    listOrders({ limit: 500 }).catch(() => [] as Order[]),
  ])

  const periods = [
    { label: "Last 7 days", days: 7, pts: daily.slice(-7) },
    { label: "Last 30 days", days: 30, pts: daily.slice(-30) },
    { label: "Last 90 days", days: 90, pts: daily.slice(-90) },
  ].map((p) => {
    const revenue = p.pts.reduce((s, d) => s + d.revenue, 0)
    const ordCount = p.pts.reduce((s, d) => s + d.orders, 0)
    const since = Date.now() - p.days * 86_400_000
    const fin = summarize(orders.filter((o) => Date.parse(o.createdAt) >= since))
    return {
      label: p.label,
      revenue,
      orders: ordCount,
      aov: ordCount > 0 ? Math.round(revenue / ordCount) : 0,
      fin,
    }
  })

  const register = taxRegister(orders, 12)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales performance · top sellers from paid orders"
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/orders/export"
              className="inline-flex h-10 items-center gap-2 rounded-control border border-line px-3.5 text-sm font-medium transition hover:border-ink"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export orders CSV
            </a>
            <a
              href="/api/reports/tax-export"
              className="inline-flex h-10 items-center gap-2 rounded-control border border-line px-3.5 text-sm font-medium transition hover:border-ink"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Tax register CSV
            </a>
          </div>
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
            <tr>
              <td className={`${td} font-medium`}>Gross sales</td>
              {periods.map((p) => (
                <td key={p.label} className={`${td} tabular-nums`}>
                  <MoneyDisplay amount={p.fin.gross} />
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${td} font-medium`}>Discounts</td>
              {periods.map((p) => (
                <td key={p.label} className={`${td} tabular-nums`}>
                  −<MoneyDisplay amount={p.fin.discounts} />
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${td} font-medium`}>Shipping collected</td>
              {periods.map((p) => (
                <td key={p.label} className={`${td} tabular-nums`}>
                  <MoneyDisplay amount={p.fin.shipping} />
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${td} font-medium`}>Returns value</td>
              {periods.map((p) => (
                <td key={p.label} className={`${td} tabular-nums`}>
                  −<MoneyDisplay amount={p.fin.returnsValue} />
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${td} font-medium`}>Net revenue</td>
              {periods.map((p) => (
                <td key={`${p.label}-net`} className={`${td} font-medium tabular-nums`}>
                  <MoneyDisplay amount={p.fin.net} />
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${td} font-medium`}>GST collected (est.)</td>
              {periods.map((p) => (
                <td key={`${p.label}-gst`} className={`${td} tabular-nums text-faint`}>
                  <MoneyDisplay amount={p.fin.gst} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="border-t border-line px-4 py-3 text-xs text-faint">
          Financial rows are computed from settled orders (paid or refunded) in a rolling window;
          revenue/orders come from daily sales. GST is an indicative 18% tax-inclusive split —
          orders don&apos;t store tax. Costs and expenses aren&apos;t tracked yet.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold">GST register</h2>
          <p className="text-xs text-faint">monthly · last 12 months with settled orders</p>
        </div>
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-wash/60">
                <th className={th}>Month</th>
                <th className={th}>Orders</th>
                <th className={th}>Net revenue</th>
                <th className={th}>Taxable</th>
                <th className={th}>CGST 9%</th>
                <th className={th}>SGST 9%</th>
                <th className={th}>GST total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {register.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <p className="font-medium">No settled orders yet</p>
                    <p className="mt-1 text-sm text-faint">
                      The register fills up once orders are paid.
                    </p>
                  </td>
                </tr>
              )}
              {register.map((r) => (
                <tr key={r.month} className="transition hover:bg-wash/70">
                  <td className={`${td} font-medium`}>{monthLabel(r.month)}</td>
                  <td className={`${td} tabular-nums`}>{r.count}</td>
                  <td className={`${td} tabular-nums`}>
                    <MoneyDisplay amount={r.net} />
                  </td>
                  <td className={`${td} tabular-nums`}>
                    <MoneyDisplay amount={r.taxable} />
                  </td>
                  <td className={`${td} tabular-nums`}>
                    <MoneyDisplay amount={r.cgst} />
                  </td>
                  <td className={`${td} tabular-nums`}>
                    <MoneyDisplay amount={r.sgst} />
                  </td>
                  <td className={`${td} font-medium tabular-nums`}>
                    <MoneyDisplay amount={r.gst} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-xs text-faint">
            Indicative: assumes tax-inclusive prices at 18% GST and intra-state supply (CGST + SGST).
            For inter-state supply, report the GST total as IGST instead. Verify with your accountant
            before filing.
          </p>
        </div>
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
                        <span
                          className="block h-1.5 rounded-full bg-ink"
                          style={{ width: `${Math.round(p.share * 100)}%` }}
                        />
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
