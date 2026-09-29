"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { Field, Select, Textarea, TextInput } from "@/components/forms"
import { createVariantAction, saveProductAction } from "@/app/(app)/actions"
import { productFormSchema, slugify, type ProductFormValues } from "@/lib/schemas"
import { cn } from "@/lib/cn"
import type { Category, Product } from "@/lib/types"

/** Curated badge library — mirrors storefront `badges.ts` KNOWN map (keys are what we store). */
const BADGE_LIBRARY: { key: string; label: string; tone: "signal" | "ink" | "outline" }[] = [
  { key: "featured", label: "Featured", tone: "ink" },
  { key: "bestseller", label: "Best seller", tone: "ink" },
  { key: "trending", label: "Trending", tone: "ink" },
  { key: "new", label: "New", tone: "signal" },
  { key: "sale", label: "Sale", tone: "signal" },
  { key: "hot", label: "Hot", tone: "outline" },
  { key: "limited", label: "Limited", tone: "outline" },
  { key: "budget", label: "Budget pick", tone: "outline" },
  { key: "eco", label: "Eco", tone: "outline" },
  { key: "preorder", label: "Pre-order", tone: "signal" },
  { key: "clearance", label: "Clearance", tone: "signal" },
  { key: "bundle", label: "Bundle", tone: "outline" },
  { key: "exclusive", label: "Exclusive", tone: "ink" },
  { key: "editorschoice", label: "Editor's choice", tone: "ink" },
]

const CHIP_TONE: Record<string, string> = {
  signal: "border-signal bg-signal text-paper",
  ink: "border-ink bg-ink text-paper",
  outline: "border-line bg-paper text-faint",
}

function csvTokens(csv: string): string[] {
  return csv.split(",").map((t) => t.trim()).filter(Boolean)
}

/** Split stored CSV into known keys + custom tokens we must not drop on save. */
function splitCsv(csv: string): { selected: Set<string>; custom: string[] } {
  const selected = new Set<string>()
  const custom: string[] = []
  for (const raw of csvTokens(csv)) {
    const t = raw.toLowerCase()
    const hit = BADGE_LIBRARY.find((b) => b.key === t || b.label.toLowerCase() === t)
    if (hit) selected.add(hit.key)
    else custom.push(raw)
  }
  return { selected, custom }
}

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const push = useToast()
  const router = useRouter()
  const handleTouched = useRef(Boolean(product))
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("0")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const badgesCsv = watch("badges")
  const { selected: selectedBadges, custom: customBadges } = splitCsv(badgesCsv ?? "")

  const toggleBadge = (key: string) => {
    const next = new Set(selectedBadges)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setValue("badges", [...next, ...customBadges].join(", "), { shouldDirty: true })
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!product) {
      const priceNum = Number(price)
      const stockNum = Number(stock)
      if (price.trim() === "" || !Number.isFinite(priceNum) || priceNum < 0) {
        push(false, "Selling price is required to create a sellable product")
        return
      }
      if (!Number.isInteger(stockNum) || stockNum < 0) {
        push(false, "Opening stock must be a whole number")
        return
      }
      const res = await saveProductAction(null, values)
      if (!res.ok || !res.id) {
        push(false, res.error ?? "Couldn't save")
        return
      }
      const vr = await createVariantAction(res.id, {
        title: "Default",
        sku: "",
        price_inr: priceNum,
        price_usd: 0,
        inventory_qty: stockNum,
      })
      if (!vr.ok) {
        push(false, "Product created, but the first variant failed — add it below.")
        router.push(`/products/${res.id}`)
        return
      }
      push(true, "Product created ✓")
      router.push(`/products/${res.id}`)
      return
    }
    const res = await saveProductAction(product.id, values)
    push(res.ok, res.ok ? "Saved ✓" : res.error ?? "Couldn't save")
    if (res.ok) router.refresh()
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

      {!product && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Selling price (INR)"
            htmlFor="price_inr"
            required
            hint="one default variant is created for you"
          >
            <TextInput
              id="price_inr"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="899"
            />
          </Field>
          <Field label="Opening stock" htmlFor="inventory_qty" hint="units on hand">
            <TextInput
              id="inventory_qty"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
      )}

      <Field
        label="Badges"
        htmlFor="badges"
        hint="shown on the storefront — auto −% off comes from compare-at pricing"
        error={errors.badges?.message}
      >
        <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Product badges">
          {BADGE_LIBRARY.map((b) => {
            const on = selectedBadges.has(b.key)
            return (
              <button
                key={b.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleBadge(b.key)}
                className={cn(
                  "label rounded-full border px-3 py-1.5 transition hover:opacity-80",
                  on ? CHIP_TONE[b.tone] : "border-line bg-paper text-faint hover:border-ink hover:text-ink"
                )}
              >
                {b.label}
              </button>
            )
          })}
          <input type="hidden" id="badges" {...register("badges")} />
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
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
