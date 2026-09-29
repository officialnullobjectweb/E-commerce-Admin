"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { Field, Select, Textarea, TextInput } from "@/components/forms"
import { createReviewAction } from "@/app/(app)/actions"
import { reviewFormSchema, type ReviewFormValues } from "@/lib/schemas"

export function AddReview({ products }: { products: { id: string; title: string }[] }) {
  const push = useToast()
  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { product_id: "", name: "", rating: 5, title: "", body: "" },
  })

  const onSubmit = handleSubmit(async (values) => {
    const res = await createReviewAction(values)
    push(res.ok, res.ok ? "Review added ✓" : (res.error ?? "Couldn't add"))
    if (res.ok) {
      reset()
      router.refresh()
    }
  })

  if (products.length === 0) {
    return <p className="text-sm text-faint">Create a product first — reviews attach to products.</p>
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Product" htmlFor="r-product" required error={errors.product_id?.message}>
          <Select id="r-product" {...register("product_id")}>
            <option value="">Pick a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name" htmlFor="r-name" required error={errors.name?.message}>
          <TextInput id="r-name" {...register("name")} placeholder="Priya S." />
        </Field>
        <Field label="Rating" htmlFor="r-rating" error={errors.rating?.message}>
          <Select id="r-rating" {...register("rating")}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Headline" htmlFor="r-title" error={errors.title?.message}>
          <TextInput id="r-title" {...register("title")} placeholder="Perfect fit" />
        </Field>
      </div>
      <Field label="Review" htmlFor="r-body" required error={errors.body?.message}>
        <Textarea id="r-body" {...register("body")} rows={3} placeholder="Exactly what I needed…" />
      </Field>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
        >
          {isSubmitting ? "Adding…" : "Add review"}
        </button>
      </div>
    </form>
  )
}
