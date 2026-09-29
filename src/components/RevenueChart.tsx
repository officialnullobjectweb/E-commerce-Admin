"use client"

import dynamic from "next/dynamic"
import type { DayPoint } from "@/lib/types"

const Chart = dynamic(
  () => import("recharts").then((m) => {
    const { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } = m
    return {
      default: function RevenueChart({ data }: { data: DayPoint[] }) {
        return (
          <div className="h-56 w-full" role="img" aria-label="Revenue over the last 14 days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) =>
                    new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-wash)" }}
                  formatter={(value) => [
                    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value)),
                    "Revenue",
                  ]}
                />
                <Bar dataKey="revenue" fill="var(--color-ink)" radius={[6, 6, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      },
    }
  }),
  {
    ssr: false,
    loading: () => <div className="h-56 w-full animate-pulse rounded-control bg-wash" aria-label="Loading chart" />,
  }
)

export function RevenueChart({ data }: { data: DayPoint[] }) {
  return <Chart data={data} />
}
