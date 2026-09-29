"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { CouponFields } from "@/components/coupons/CouponFields"
import { saveCouponAction } from "@/app/(app)/actions"
import { couponFormSchema, type CouponFormValues } from "@/lib/schemas"

const DEFAULTS: CouponFormValues = {
  code: "",
  type: "percent",
  percent: 10,
  amount: 0,
  active: true,
  min_subtotal: 0,
  max_discount: 0,
  applies_to: "all",
  productsText: "",
  categoriesText: "",
  statesText: "",
  startsAt: "",
  endsAt: "",
  max_redemptions: 0,
  per_user_limit: 0,
  bogo_buy_qty: 2,
  bogo_get_qty: 1,
}

export function CouponForm() {
  const push = useToast()
  const router = useRouter()
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: DEFAULTS,
  })

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveCouponAction(null, values)
    push(res.ok, res.ok ? "Coupon created ✓" : (res.error ?? "Couldn't create"))
    if (res.ok) {
      reset(DEFAULTS)
      router.refresh()
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <CouponFields register={register} watch={watch} errors={errors} setValue={setValue} />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create coupon"}
        </button>
      </div>
    </form>
  )
}
