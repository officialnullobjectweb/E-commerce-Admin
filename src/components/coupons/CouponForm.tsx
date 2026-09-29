"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { Field, NumberInput, TextInput } from "@/components/forms"
import { createCouponAction } from "@/app/(app)/actions"
import { couponFormSchema, type CouponFormValues } from "@/lib/schemas"

export function CouponForm() {
  const push = useToast()
  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: { code: "", percent: 10 },
  })

  const onSubmit = handleSubmit(async (values) => {
    const res = await createCouponAction(values)
    push(res.ok, res.ok ? "Coupon created ✓" : (res.error ?? "Couldn't create"))
    if (res.ok) {
      reset({ code: "", percent: 10 })
      router.refresh()
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-4">
      <Field label="Code" htmlFor="cp-code" required error={errors.code?.message} className="min-w-40 flex-1">
        <TextInput id="cp-code" {...register("code")} placeholder="REUSE20" autoComplete="off" />
      </Field>
      <Field label="Percent off" htmlFor="cp-percent" required error={errors.percent?.message} className="w-32">
        <NumberInput id="cp-percent" {...register("percent")} min={1} max={90} />
      </Field>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
      >
        {isSubmitting ? "Creating…" : "Create coupon"}
      </button>
    </form>
  )
}
