"use client"

import { useRouter } from "next/navigation"
import { SelectMenu } from "@/components/ui/dropdown-menu"
import type { OrderState } from "@/lib/types"

const STATE_OPTIONS = [
  { value: "", label: "all" },
  { value: "new", label: "new" },
  { value: "packing", label: "packing" },
  { value: "shipped", label: "shipped" },
  { value: "delivered", label: "delivered" },
  { value: "returned", label: "returned" },
] as const

const METHOD_OPTIONS = [
  { value: "", label: "all" },
  { value: "razorpay", label: "razorpay" },
  { value: "cod", label: "cod" },
  { value: "manual", label: "manual" },
] as const

const PERIOD_OPTIONS = [
  { value: "", label: "all time" },
  { value: "7", label: "last 7 days" },
  { value: "30", label: "last 30 days" },
  { value: "90", label: "last 90 days" },
] as const

export function OrdersFilters({ state, method, days }: { state: string; method: string; days: string }) {
  const router = useRouter()

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/orders${params.size ? `?${params}` : ""}`)
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Order filters">
      <SelectMenu
        label="Fulfilment"
        value={state as OrderState | ""}
        options={[...STATE_OPTIONS]}
        onChange={(v) => setParam("state", v)}
      />
      <SelectMenu
        label="Payment"
        value={method}
        options={[...METHOD_OPTIONS]}
        onChange={(v) => setParam("method", v)}
      />
      <SelectMenu
        label="Period"
        value={days}
        options={[...PERIOD_OPTIONS]}
        onChange={(v) => setParam("days", v)}
      />
    </div>
  )
}
