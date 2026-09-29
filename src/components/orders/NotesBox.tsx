"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { saveOrderNotesAction } from "@/app/(app)/actions"

export function NotesBox({ orderId, notes }: { orderId: string; notes: string }) {
  const push = useToast()
  const router = useRouter()
  const [value, setValue] = useState(notes)
  const [saving, setSaving] = useState(false)
  const dirty = value !== notes

  return (
    <div className="space-y-3">
      <label htmlFor={`notes-${orderId}`} className="label text-faint">
        Internal notes
      </label>
      <textarea
        id={`notes-${orderId}`}
        value={value}
        maxLength={2000}
        rows={3}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Packing hints, customer requests, courier…"
        className="w-full rounded-control border border-line bg-paper px-3 py-2 text-sm transition placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="label text-faint">{value.length}/2000</span>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={async () => {
            setSaving(true)
            const res = await saveOrderNotesAction(orderId, value)
            setSaving(false)
            push(res.ok, res.ok ? "Notes saved" : res.error ?? "Couldn't save")
            if (res.ok) router.refresh()
          }}
          className="label rounded-control bg-ink px-3.5 py-2 text-paper transition hover:opacity-80 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save notes"}
        </button>
      </div>
    </div>
  )
}
