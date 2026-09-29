"use client"

import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDelete, Modal } from "@/components/display"
import { useToast } from "@/components/feedback"
import { ActionMenu } from "@/components/ui/dropdown-menu"
import { Field, NumberInput, Switch } from "@/components/forms"
import { deleteCouponAction, updateCouponAction } from "@/app/(app)/actions"
import type { Coupon } from "@/lib/types"

export function CouponActions({ coupon }: { coupon: Coupon }) {
  const [mode, setMode] = useState<"none" | "edit" | "delete">("none")
  const [percent, setPercent] = useState(String(coupon.percent))
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
    <span className="flex items-center justify-end gap-4">
      <Switch
        checked={coupon.active}
        label={`${coupon.code} active`}
        onChange={(v) => run(() => updateCouponAction(coupon.id, { active: v }), v ? "Coupon activated" : "Coupon paused")}
      />
      <ActionMenu
        label={`Actions for ${coupon.code}`}
        items={[
          { label: "Edit", icon: <Pencil className="h-4 w-4" />, onSelect: () => setMode("edit") },
          { label: "Delete", danger: true, icon: <Trash2 className="h-4 w-4" />, onSelect: () => setMode("delete") },
        ]}
      />

      {mode === "edit" && (
        <Modal title={`Edit ${coupon.code}`} onClose={() => setMode("none")}>
          <Field label="Percent off" htmlFor="cp-edit-percent" required>
            <NumberInput
              id="cp-edit-percent"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              min={1}
              max={90}
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode("none")}
              className="h-11 rounded-control border border-line px-5 text-sm transition hover:border-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const n = Math.floor(Number(percent))
                if (!Number.isFinite(n) || n < 1 || n > 90) {
                  push(false, "Percent must be 1–90")
                  return
                }
                void run(() => updateCouponAction(coupon.id, { percent: n }), "Coupon saved ✓")
              }}
              className="h-11 rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {mode === "delete" && (
        <ConfirmDelete
          what={`${coupon.code} coupon`}
          pending={pending}
          onClose={() => setMode("none")}
          onConfirm={() => run(() => deleteCouponAction(coupon.id), "Coupon deleted")}
        />
      )}
    </span>
  )
}
