"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { deleteProductAction } from "@/app/(app)/actions"

export function BulkDeleteButton({ ids, reset }: { ids: string[]; reset: () => void }) {
  const push = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm(`Delete ${ids.length} product${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return
        setPending(true)
        let failed = 0
        for (const id of ids) {
          const res = await deleteProductAction(id)
          if (!res.ok) failed++
        }
        setPending(false)
        reset()
        push(failed === 0, failed === 0 ? `${ids.length} deleted` : `${failed} failed — try again`)
        router.refresh()
      }}
      className="h-9 rounded-control bg-bad px-4 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-50"
    >
      {pending ? "Deleting…" : `Delete ${ids.length}`}
    </button>
  )
}
