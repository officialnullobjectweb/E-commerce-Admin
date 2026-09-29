"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDelete } from "@/components/display"
import { useToast } from "@/components/feedback"
import { Field, NumberInput, Textarea, TextInput } from "@/components/forms"
import { deleteOptionAxisAction, saveOptionAxisAction } from "@/app/(app)/actions"
import { splitList } from "@/lib/schemas"
import type { OptionAxis } from "@/lib/types"

type Draft = { id: string | null; name: string; valuesText: string; position: number }

const EMPTY: Draft = { id: null, name: "", valuesText: "", position: 0 }

export function OptionAxes({ axes }: { axes: OptionAxis[] }) {
  const push = useToast()
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const confirmAxis = axes.find((a) => a.id === confirmId) ?? null

  const save = async () => {
    const values = splitList(draft.valuesText)
    if (!draft.name.trim()) return push(false, "Name is required")
    if (values.length === 0) return push(false, "Add at least one value")
    setSaving(true)
    const res = await saveOptionAxisAction({
      ...(draft.id ? { id: draft.id } : {}),
      name: draft.name.trim(),
      values,
      position: draft.position,
    })
    setSaving(false)
    push(res.ok, res.ok ? "Option saved ✓" : (res.error ?? "Couldn't save"))
    if (res.ok) {
      setDraft(EMPTY)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {axes.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-control border border-line px-3 py-2.5">
            <span className="text-sm font-medium">{a.name}</span>
            <span className="flex flex-wrap gap-1.5">
              {a.values.map((v) => (
                <span key={v} className="label rounded-full border border-line px-2 py-0.5 text-faint">
                  {v}
                </span>
              ))}
            </span>
            <span className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDraft({ id: a.id, name: a.name, valuesText: a.values.join(", "), position: a.position })}
                className="label text-faint transition hover:text-ink"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmId(a.id)}
                className="label text-faint transition hover:text-bad"
              >
                Delete
              </button>
            </span>
          </li>
        ))}
        {axes.length === 0 && <p className="text-sm text-faint">No option axes yet.</p>}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name" htmlFor="opt-name" required className="lg:col-span-1">
          <TextInput
            id="opt-name"
            value={draft.name}
            placeholder="Colour"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label="Values" htmlFor="opt-values" required hint="Comma separated — up to 12" className="lg:col-span-2">
          <Textarea
            id="opt-values"
            rows={2}
            value={draft.valuesText}
            placeholder="Black, Blue, Sand"
            onChange={(e) => setDraft({ ...draft, valuesText: e.target.value })}
          />
        </Field>
        <Field label="Order" htmlFor="opt-position" hint="Lower shows first">
          <NumberInput
            id="opt-position"
            min={0}
            value={draft.position}
            onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) })}
          />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-2">
        {draft.id && (
          <button type="button" onClick={() => setDraft(EMPTY)} className="label text-faint transition hover:text-ink">
            Cancel edit
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-9 rounded-control border border-ink px-4 text-sm font-medium transition hover:bg-ink hover:text-paper disabled:opacity-40"
        >
          {saving ? "Saving…" : draft.id ? "Update axis" : "+ Add axis"}
        </button>
      </div>

      {confirmAxis && (
        <ConfirmDelete
          what={`option axis “${confirmAxis.name}”`}
          onClose={() => setConfirmId(null)}
          onConfirm={async () => {
            const res = await deleteOptionAxisAction(confirmAxis.id)
            push(res.ok, res.ok ? "Axis removed" : (res.error ?? "Couldn't remove"))
            if (res.ok) router.refresh()
            setConfirmId(null)
          }}
        />
      )}
    </div>
  )
}
