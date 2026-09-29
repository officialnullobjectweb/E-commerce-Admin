"use client"

import { useState } from "react"
import { Badge } from "@/components/display"
import { useToast } from "@/components/feedback"
import { healthAction } from "@/app/(app)/actions"

type Health = { worker: boolean; db: boolean }

function Row({ name, ok, hintDown }: { name: string; ok: boolean; hintDown: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm font-medium">{name}</span>
      <Badge tone={ok ? "ok" : "bad"}>{ok ? "healthy" : "down"}</Badge>
      {!ok && <span className="text-xs text-faint">{hintDown}</span>}
    </div>
  )
}

export function HealthSection({ initial }: { initial: Health }) {
  const push = useToast()
  const [health, setHealth] = useState(initial)
  const [pending, setPending] = useState(false)

  const recheck = async () => {
    setPending(true)
    const res = await healthAction()
    setPending(false)
    if (res.ok) {
      setHealth(res.data as Health)
      const h = res.data as Health
      push(h.worker && h.db, h.worker && h.db ? "All systems healthy" : "Something is down")
    } else {
      push(false, res.error ?? "Couldn't check")
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Row name="Worker API" ok={health.worker} hintDown="Can't reach the /health endpoint" />
        <Row name="Database" ok={health.db} hintDown="Supabase query failed" />
      </div>
      <button
        type="button"
        onClick={recheck}
        disabled={pending}
        className="inline-flex h-9 items-center rounded-control border border-line px-3 text-sm transition hover:border-ink disabled:opacity-50"
      >
        {pending ? "Checking…" : "Re-check"}
      </button>
    </div>
  )
}
