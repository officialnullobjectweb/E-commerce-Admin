"use client"

import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { ConfirmDelete, Modal } from "@/components/display"
import { useToast } from "@/components/feedback"
import { ActionMenu } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/forms"
import { CouponFields } from "@/components/coupons/CouponFields"
import { deleteCouponAction, saveCouponAction, updateCouponAction } from "@/app/(app)/actions"
import { couponFormSchema, type CouponFormValues } from "@/lib/schemas"
import type { Coupon } from "@/lib/types"

const local = (iso: string | null): string => {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const toForm = (c: Coupon): CouponFormValues => ({
  code: c.code,
  type: c.type,
  percent: c.percent,
  amount: c.amount,
  active: c.active,
  min_subtotal: c.minSubtotal,
  max_discount: c.maxDiscount,
  applies_to: c.appliesTo,
  productsText: c.productIds.join(", "),
  categoriesText: c.categoryIds.join(", "),
  statesText: c.states.join(", "),
  startsAt: local(c.startsAt),
  endsAt: local(c.endsAt),
  max_redemptions: c.maxRedemptions,
  per_user_limit: c.perUserLimit,
  bogo_buy_qty: c.bogoBuyQty,
  bogo_get_qty: c.bogoGetQty,
})

function EditCoupon({ coupon, onDone }: { coupon: Coupon; onDone: () => void }) {
  const push = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: toForm(coupon),
  })

  const onSubmit = handleSubmit(async (values) => {
    setPending(true)
    const res = await saveCouponAction(coupon.id, values)
    setPending(false)
    push(res.ok, res.ok ? "Coupon saved ✓" : (res.error ?? "Couldn't save"))
    if (res.ok) {
      onDone()
      router.refresh()
    }
  })

  return (
    <Modal title={`Edit ${coupon.code}`} onClose={onDone}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <CouponFields register={register} watch={watch} errors={errors} setValue={setValue} idPrefix="ecp-" />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onDone}
            className="h-11 rounded-control border border-line px-5 text-sm transition hover:border-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function CouponActions({ coupon }: { coupon: Coupon }) {
  const [mode, setMode] = useState<"none" | "edit" | "delete">("none")
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

      {mode === "edit" && <EditCoupon coupon={coupon} onDone={() => setMode("none")} />}

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
