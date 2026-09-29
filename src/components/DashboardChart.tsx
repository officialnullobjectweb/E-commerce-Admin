"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { SelectMenu } from "@/components/ui/dropdown-menu"
import type { DayPoint } from "@/lib/types"

type Period = "7" | "30" | "90"
type Metric = "revenue" | "orders"

const Chart = dynamic(
  () => import("recharts").then((m) => {
    const { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } = m
    return {
      default: function ChartInner({
        data,
        metric,
      }: {
        data: DayPoint[]
        metric: Metric
      }) {
        const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
        return (
          <div className="h-72 w-full" role="img" aria-label={`${metric === "revenue" ? "Revenue" : "Orders"} over selected period`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  tickFormatter={(d: string) =>
                    new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    metric === "revenue" ? (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`) : `${v}`
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--color-wash)" }}
                  formatter={(value) => [
                    metric === "revenue" ? inr.format(Number(value)) : Number(value),
                    metric === "revenue" ? "Revenue" : "Orders",
                  ]}
                  labelFormatter={(d) =>
                    new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                  }
                />
                <Bar
                  dataKey={metric}
                  fill={metric === "revenue" ? "var(--color-ink)" : "var(--color-signal)"}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      },
    }
  }),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full animate-pulse rounded-control bg-wash" aria-label="Loading chart" />,
  }
)

/** Revenue/orders chart with period + metric controls (Woo-style dashboard panel). */
export function DashboardChart({ data }: { data: DayPoint[] }) {
  const [period, setPeriod] = useState<Period>("30")
  const [metric, setMetric] = useState<Metric>("revenue")
  const sliced = data.slice(-Number(period))

  return (
    <div className="rounded-card border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold">
          {metric === "revenue" ? "Revenue" : "Orders"} · last {period} days
        </h2>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="Chart metric"
            className="flex rounded-control border border-line p-0.5"
          >
            {(["revenue", "orders"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metric === m}
                onClick={() => setMetric(m)}
                className={`label rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 capitalize transition ${
                  metric === m ? "bg-ink text-paper" : "text-faint hover:text-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <SelectMenu
            label="Period"
            align="end"
            value={period}
            options={[
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
            onChange={(v) => setPeriod(v as Period)}
          />
        </div>
      </div>
      <div className="mt-4">
        {sliced.some((d) => (metric === "revenue" ? d.revenue > 0 : d.orders > 0)) ? (
          <Chart data={sliced} metric={metric} />
        ) : (
          <p className="py-16 text-center text-sm text-faint">
            No {metric} yet — data will chart here.
          </p>
        )}
      </div>
    </div>
  )
}
