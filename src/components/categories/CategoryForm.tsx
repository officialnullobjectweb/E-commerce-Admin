"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { Field, Textarea, TextInput } from "@/components/forms"
import { createCategoryAction } from "@/app/(app)/actions"
import { categoryFormSchema, slugify, type CategoryFormValues } from "@/lib/schemas"
import { useRef } from "react"

export function CategoryForm() {
  const push = useToast()
  const router = useRouter()
  const handleTouched = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", handle: "", description: "" },
  })

  const onSubmit = handleSubmit(async (values) => {
    const res = await createCategoryAction(values)
    push(res.ok, res.ok ? "Category created ✓" : (res.error ?? "Couldn't create"))
    if (res.ok) {
      reset()
      handleTouched.current = false
      router.refresh()
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name" required error={errors.name?.message}>
          <TextInput
            id="c-name"
            {...register("name")}
            onChange={(e) => {
              register("name").onChange(e)
              if (!handleTouched.current) setValue("handle", slugify(e.target.value), { shouldValidate: true })
            }}
            placeholder="AirPods Cases"
          />
        </Field>
        <Field label="Handle (URL)" htmlFor="c-handle" required error={errors.handle?.message}>
          <TextInput
            id="c-handle"
            {...register("handle")}
            onChange={(e) => {
              handleTouched.current = true
              register("handle").onChange(e)
            }}
            placeholder="airpods-cases"
          />
        </Field>
      </div>
      <Field label="Description" htmlFor="c-desc" error={errors.description?.message}>
        <Textarea id="c-desc" {...register("description")} rows={2} placeholder="Optional — shows on the storefront." />
      </Field>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create category"}
        </button>
      </div>
    </form>
  )
}
