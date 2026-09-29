"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { Field, NumberInput, Switch, Textarea, TextInput } from "@/components/forms"
import { savePromoAction } from "@/app/(app)/actions"
import { promoFormSchema, type PromoFormValues } from "@/lib/schemas"
import type { PromoSettings } from "@/lib/types"

export function PromoForm({ value }: { value: PromoSettings }) {
  const push = useToast()
  const router = useRouter()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PromoFormValues>({
    resolver: zodResolver(promoFormSchema),
    defaultValues: { ...value },
  })

  const enabled = watch("enabled")

  const onSubmit = handleSubmit(async (values) => {
    const res = await savePromoAction(values)
    push(res.ok, res.ok ? "Promo saved ✓" : (res.error ?? "Couldn't save"))
    if (res.ok) router.refresh()
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <label className="flex items-center gap-3 text-sm font-medium">
        <Switch checked={enabled} onChange={(v) => setValue("enabled", v, { shouldDirty: true })} label="Promo enabled" />
        Promo modal enabled
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Title" htmlFor="pr-title" required error={errors.title?.message}>
          <TextInput id="pr-title" {...register("title")} placeholder="10% off your first case" />
        </Field>
        <Field label="Delay (seconds)" htmlFor="pr-delay" hint="0 = show immediately" error={errors.delay?.message} className="w-40">
          <NumberInput id="pr-delay" {...register("delay")} min={0} max={60} />
        </Field>
      </div>

      <Field label="Body" htmlFor="pr-body" error={errors.body?.message}>
        <Textarea id="pr-body" {...register("body")} rows={2} placeholder="Use code REUSE10 at checkout." />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Button label" htmlFor="pr-cta" required error={errors.cta_label?.message}>
          <TextInput id="pr-cta" {...register("cta_label")} placeholder="Shop cases" />
        </Field>
        <Field label="Button link" htmlFor="pr-cta-link" error={errors.cta_link?.message}>
          <TextInput id="pr-cta-link" {...register("cta_link")} placeholder="/shop" />
        </Field>
        <Field label="Image URL" htmlFor="pr-image" hint="optional" error={errors.image?.message}>
          <TextInput id="pr-image" {...register("image")} placeholder="https://… (1:1 image)" />
        </Field>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save promo"}
        </button>
      </div>
    </form>
  )
}
