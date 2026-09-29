"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDelete, Modal } from "@/components/display"
import { useToast } from "@/components/feedback"
import { Field, Textarea, TextInput } from "@/components/forms"
import { deleteCategoryAction, updateCategoryAction } from "@/app/(app)/actions"
import type { Category } from "@/lib/types"

export function CategoryActions({ category }: { category: Category }) {
  const [mode, setMode] = useState<"none" | "edit" | "delete">("none")
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description)
  const [pending, setPending] = useState(false)
  const push = useToast()
  const router = useRouter()

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    setPending(true)
    const res = await fn()
    setPending(false)
    push(res.ok, res.ok ? okMsg : (res.error ?? "Couldn't save"))
    if (res.ok) {
      setMode("none")
      router.refresh()
    }
  }

  return (
    <span className="flex items-center justify-end gap-3">
      <button type="button" onClick={() => setMode("edit")} className="label text-faint transition hover:text-ink">
        Edit
      </button>
      <button type="button" onClick={() => setMode("delete")} className="label text-faint transition hover:text-bad">
        Delete
      </button>

      {mode === "edit" && (
        <Modal title={`Edit ${category.name}`} onClose={() => setMode("none")}>
          <div className="space-y-4">
            <Field label="Name" htmlFor="edit-c-name" required>
              <TextInput id="edit-c-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Description" htmlFor="edit-c-desc">
              <Textarea id="edit-c-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </Field>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode("none")}
                className="h-11 rounded-control border border-line px-5 text-sm transition hover:border-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !name.trim()}
                onClick={() =>
                  run(
                    () => updateCategoryAction(category.id, { name: name.trim(), description }),
                    "Category saved ✓"
                  )
                }
                className="h-11 rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {mode === "delete" && (
        <ConfirmDelete
          what={`${category.name} (${category.productCount ?? 0} products become uncategorised)`}
          pending={pending}
          onClose={() => setMode("none")}
          onConfirm={() => run(() => deleteCategoryAction(category.id), "Category deleted")}
        />
      )}
    </span>
  )
}
