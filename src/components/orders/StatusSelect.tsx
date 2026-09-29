"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { setOrderStatusAction } from "@/app/(app)/actions"
import type { Order } from "@/lib/types"

const STATUSES: Order["status"][] = ["pending", "paid", "failed", "refunded", "cancelled"]

export function StatusSelect({ order }: { order: Order }) {
  const push = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <label className="flex items-center gap-2">
      <span className="label text-faint">Status</span>
      <select
        value={order.status}
        disabled={pending}
        onChange={async (e) => {
          const next = e.target.value as Order["status"]
          if (next === order.status) return
          setPending(true)
          const res = await setOrderStatusAction(order.id, next)
          setPending(false)
          push(res.ok, res.ok ? `Marked ${next}` : (res.error ?? "Couldn't update"))
          if (res.ok) router.refresh()
          else e.target.value = order.status
        }}
        className="h-10 rounded-control border border-line bg-transparent px-3 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  )
}
