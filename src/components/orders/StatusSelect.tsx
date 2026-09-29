"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { SelectMenu } from "@/components/ui/dropdown-menu"
import { setOrderStatusAction } from "@/app/(app)/actions"
import type { Order } from "@/lib/types"

const STATUSES: Order["status"][] = ["pending", "paid", "failed", "refunded", "cancelled"]

export function StatusSelect({ order }: { order: Order }) {
  const push = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <SelectMenu
        label="Payment"
        value={order.status}
        disabled={pending}
        options={STATUSES.map((s) => ({ value: s, label: s }))}
        onChange={async (next) => {
          if (next === order.status) return
          setPending(true)
          const res = await setOrderStatusAction(order.id, next)
          setPending(false)
          push(res.ok, res.ok ? `Marked ${next}` : res.error ?? "Couldn't update")
          if (res.ok) router.refresh()
        }}
      />
    </div>
  )
}
