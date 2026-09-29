"use client"

import { useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { Field, Select, Textarea, TextInput } from "@/components/forms"
import { saveProductAction } from "@/app/(app)/actions"
import { productFormSchema, slugify, type ProductFormValues } from "@/lib/schemas"
import type { Category, Product } from "@/lib/types"

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const push = useToast()
  const router = useRouter()
  const handleTouched = useRef(Boolean(product))

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: product?.title ?? "",
      handle: product?.handle ?? "",
      description: product?.description ?? "",
      collection: product?.collection ?? "accessories",
      brand: product?.brand ?? "accessory",
      badges: product?.badges ?? "",
      tagsText: (product?.tags ?? []).join(", "),
      colorsText: (product?.colors ?? []).join(", "),
      category_id: product?.categoryId ?? "",
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveProductAction(product?.id ?? null, values)
    if (!res.ok) {
      push(false, res.error ?? "Couldn't save")
      return
    }
    push(true, "Saved ✓")
    if (!product && res.id) router.push(`/products/${res.id}`)
    else router.refresh()
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" required error={errors.title?.message}>
          <TextInput
            id="title"
            {...register("title")}
            onChange={(e) => {
              register("title").onChange(e)
              if (!handleTouched.current) setValue("handle", slugify(e.target.value), { shouldValidate: true })
            }}
            placeholder="MagSafe Clear Case"
          />
        </Field>
        <Field
          label="Handle (URL)"
          htmlFor="handle"
          required
          hint="/products/your-handle"
          error={errors.handle?.message}
        >
          <TextInput
            id="handle"
            {...register("handle")}
            onChange={(e) => {
              handleTouched.current = true
              register("handle").onChange(e)
            }}
            placeholder="magsafe-clear-case"
          />
        </Field>
      </div>

      <Field label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" {...register("description")} rows={4} placeholder="Drop-tested protection, crystal clear…" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Collection" htmlFor="collection" error={errors.collection?.message}>
          <Select id="collection" {...register("collection")}>
            <option value="iphone">iphone</option>
            <option value="samsung">samsung</option>
            <option value="accessories">accessories</option>
          </Select>
        </Field>
        <Field label="Brand" htmlFor="brand" error={errors.brand?.message}>
          <Select id="brand" {...register("brand")}>
            <option value="apple">apple</option>
            <option value="samsung">samsung</option>
            <option value="accessory">accessory</option>
          </Select>
        </Field>
        <Field label="Category" htmlFor="category_id" error={errors.category_id?.message}>
          <Select id="category_id" {...register("category_id")}>
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Badges" htmlFor="badges" hint="e.g. New, Bestseller" error={errors.badges?.message}>
          <TextInput id="badges" {...register("badges")} placeholder="New" />
        </Field>
        <Field label="Tags" htmlFor="tagsText" hint="comma separated" error={errors.tagsText?.message}>
          <TextInput id="tagsText" {...register("tagsText")} placeholder="magsafe, clear, drop-tested" />
        </Field>
        <Field label="Colors" htmlFor="colorsText" hint="comma separated" error={errors.colorsText?.message}>
          <TextInput id="colorsText" {...register("colorsText")} placeholder="clear, black" />
        </Field>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-control bg-ink px-6 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  )
}
