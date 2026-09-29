"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { Field, TextInput } from "@/components/forms"
import { customerFormSchema, type CustomerFormValues } from "@/lib/schemas"
import type { Customer } from "@/lib/types"
import { saveCustomerAction } from "@/app/(app)/actions"

export function CustomerForm({ customer }: { customer: Customer }) {
  const push = useToast()
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
      tagsText: customer.tags.join(", "),
      marketingOptIn: customer.marketingOptIn,
    },
  })

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        const res = await saveCustomerAction(customer.id, values)
        push(res.ok, res.ok ? "Customer saved" : res.error ?? "Couldn't save")
        if (res.ok) router.refresh()
      })}
      className="space-y-5"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name" error={errors.name?.message}>
          <TextInput id="c-name" {...register("name")} autoComplete="name" />
        </Field>
        <Field label="Phone" htmlFor="c-phone" error={errors.phone?.message}>
          <TextInput id="c-phone" {...register("phone")} autoComplete="tel" />
        </Field>
      </div>

      <Field label="Tags" htmlFor="c-tags" hint="comma separated, up to 12" error={errors.tagsText?.message}>
        <TextInput id="c-tags" {...register("tagsText")} placeholder="vip, wholesale" />
      </Field>

      <Field label="Notes" htmlFor="c-notes" hint="internal only — never shown to the customer" error={errors.notes?.message}>
        <textarea
          id="c-notes"
          rows={3}
          maxLength={2000}
          {...register("notes")}
          placeholder="Preferences, support history…"
          className="w-full rounded-control border border-line bg-paper px-3 py-2 text-sm transition placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        />
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          {...register("marketingOptIn")}
          className="h-4 w-4 rounded border-line accent-[var(--color-signal,#111)]"
        />
        Subscribed to marketing emails
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="label rounded-control bg-ink px-4 py-2.5 text-paper transition hover:opacity-80 disabled:opacity-40"
        >
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  )
}
