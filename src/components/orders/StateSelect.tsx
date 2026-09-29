"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { SelectMenu } from "@/components/ui/dropdown-menu"
import { setOrderStateAction } from "@/app/(app)/actions"
import type { Order } from "@/lib/types"

const STATES: Exclude<Order["state"], "">[] = ["new", "packing", "shipped", "delivered", "returned"]

export function StateSelect({ order }: { order: Order }) {
  const push = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const current = (order.state || "new") as Exclude<Order["state"], "">

  return (
    <SelectMenu
      label="Fulfilment"
      value={current}
      disabled={pending}
      options={STATES.map((s) => ({ value: s, label: s }))}
      onChange={async (next) => {
        if (next === current) return
        setPending(true)
        const res = await setOrderStateAction(order.id, next)
        setPending(false)
        push(res.ok, res.ok ? `Marked ${next}` : res.error ?? "Couldn't update")
        if (res.ok) router.refresh()
      }}
    />
  )
}
