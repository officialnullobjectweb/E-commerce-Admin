"use client"

import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { Field, NumberInput, Switch, TextInput } from "@/components/forms"
import { saveAnnouncementAction } from "@/app/(app)/actions"
import { announcementFormSchema, type AnnouncementFormValues } from "@/lib/schemas"
import type { AnnouncementSettings } from "@/lib/types"

const PAGES = ["home", "shop", "cart", "product"] as const

export function AnnouncementForm({ value }: { value: AnnouncementSettings }) {
  const push = useToast()
  const router = useRouter()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      enabled: value.enabled,
      marquee: value.marquee,
      speed: value.speed,
      link: value.link,
      pages: value.pages,
      messages: value.messages.length ? value.messages : [{ text: "", link: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "messages" })
  const enabled = watch("enabled")
  const marquee = watch("marquee")

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveAnnouncementAction(values)
    push(res.ok, res.ok ? "Announcement saved ✓" : (res.error ?? "Couldn't save"))
    if (res.ok) router.refresh()
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch checked={enabled} onChange={(v) => setValue("enabled", v, { shouldDirty: true })} label="Announcement enabled" />
          Enabled
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch checked={marquee} onChange={(v) => setValue("marquee", v, { shouldDirty: true })} label="Marquee scroll" />
          Scrolling marquee
        </label>
        <Field label="Speed (s)" htmlFor="ann-speed" error={errors.speed?.message} className="w-28">
          <NumberInput id="ann-speed" {...register("speed")} min={8} max={120} />
        </Field>
        <Field label="Bar link" htmlFor="ann-link" hint="optional" error={errors.link?.message} className="flex-1 min-w-48">
          <TextInput id="ann-link" {...register("link")} placeholder="/shop" />
        </Field>
      </div>

      <fieldset>
        <legend className="label mb-2 text-faint">Show on pages</legend>
        <div className="flex flex-wrap gap-4">
          {PAGES.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                value={p}
                {...register("pages")}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              {p}
            </label>
          ))}
        </div>
        {errors.pages && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-bad">
            {errors.pages.message}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="label mb-2 text-faint">Messages</legend>
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="flex flex-wrap items-start gap-2">
              <Field label={`Message ${i + 1}`} htmlFor={`ann-msg-${i}`} error={errors.messages?.[i]?.text?.message} className="min-w-56 flex-1">
                <TextInput id={`ann-msg-${i}`} {...register(`messages.${i}.text`)} placeholder="Free shipping over ₹999" />
              </Field>
              <Field label="Link" htmlFor={`ann-link-${i}`} error={errors.messages?.[i]?.link?.message} className="w-44">
                <TextInput id={`ann-link-${i}`} {...register(`messages.${i}.link`)} placeholder="/shop" />
              </Field>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={fields.length === 1}
                aria-label={`Remove message ${i + 1}`}
                className="mt-6 h-11 rounded-control border border-line px-3 text-sm transition hover:border-bad hover:text-bad disabled:opacity-40"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => append({ text: "", link: "" })}
          className="label mt-3 text-faint transition hover:text-ink"
        >
          + Add message
        </button>
      </fieldset>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save announcement"}
        </button>
      </div>
    </form>
  )
}
