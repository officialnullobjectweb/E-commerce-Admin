"use client"

import { useRef, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/feedback"
import { Field, Textarea, TextInput } from "@/components/forms"
import { SearchSelect } from "@/components/ui/search-select"
import { createVariantAction, saveProductAction } from "@/app/(app)/actions"
import { productFormSchema, slugify, type ProductFormValues } from "@/lib/schemas"
import { csvColors, SWATCHES, swatchHex } from "@/lib/swatches"
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

/** Palette chips + custom token adder — writes back the same comma-separated string. */
function SwatchPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (csv: string) => void
}) {
  const selected = csvColors(value)
  const selectedLower = new Set(selected.map((c) => c.toLowerCase()))
  const [custom, setCustom] = useState("")

  const toggle = (name: string) => {
    const needle = name.toLowerCase()
    const has = selected.some((c) => c.toLowerCase() === needle)
    onChange(has ? selected.filter((c) => c.toLowerCase() !== needle).join(", ") : [...selected, name].join(", "))
  }

  const addCustom = () => {
    const name = custom.trim()
    if (!name || name.includes(",")) return
    toggle(name)
    setCustom("")
  }

  const extra = selected.filter((c) => !swatchHex(c))

  return (
    <div className="pt-1">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Colours">
        {Object.keys(SWATCHES).map((name) => {
          const on = selectedLower.has(name.toLowerCase())
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(name)}
              className={cn(
                "label inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition hover:opacity-80",
                on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-faint hover:border-ink hover:text-ink"
              )}
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full border border-black/15"
                style={{ background: swatchHex(name) ?? "#e5e5e5" }}
              />
              {name}
            </button>
          )
        })}
        {extra.map((name) => {
          const on = selectedLower.has(name.toLowerCase())
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(name)}
              className={cn(
                "label inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition hover:opacity-80",
                on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-faint hover:border-ink hover:text-ink"
              )}
            >
              <span aria-hidden="true" className="h-3 w-3 rounded-full border border-black/15 bg-wash" />
              {name}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <TextInput
          aria-label="Add custom colour"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder="Custom colour…"
          className="h-9 max-w-52"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="h-9 rounded-control border border-line px-3 text-sm font-medium text-faint transition hover:border-ink hover:text-ink disabled:opacity-40"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

/** Live storefront-style card: badges, title, price and colour dots as shoppers see them. */
function ProductCardPreview({
  product,
  title,
  badges,
  colors,
  price,
}: {
  product?: Product
  title: string
  badges: string
  colors: string
  price: number
}) {
  const { selected } = splitCsv(badges)
  const shown = BADGE_LIBRARY.filter((b) => selected.has(b.key))
  const dots = csvColors(colors)
  const image = product?.images?.[0]?.url ?? product?.thumbnail
  return (
    <div className="rounded-card border border-line bg-paper p-4">
      <p className="label text-faint">Storefront preview</p>
      <div className="mt-3 flex gap-4">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-control border border-line bg-wash">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-faint" aria-hidden="true">
              <span className="text-lg font-display">F.</span>
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-1.5">
          {shown.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {shown.slice(0, 3).map((b) => (
                <span key={b.key} className={cn("label rounded-full border px-2 py-0.5", CHIP_TONE[b.tone])}>
                  {b.label}
                </span>
              ))}
              {shown.length > 3 && <span className="label text-faint">+{shown.length - 3}</span>}
            </div>
          )}
          <p className="truncate text-sm font-medium">{title.trim() || "Untitled product"}</p>
          <p className="text-sm font-semibold">
            ₹{Number.isFinite(price) && price > 0 ? price.toLocaleString("en-IN") : "—"}
          </p>
          {dots.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              {dots.slice(0, 6).map((c) => (
                <span
                  key={c}
                  title={c}
                  className="h-3.5 w-3.5 rounded-full border border-black/15"
                  style={{ background: swatchHex(c) ?? "#e5e5e5" }}
                />
              ))}
              {dots.length > 6 && <span className="label text-faint">+{dots.length - 6}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const push = useToast()
  const router = useRouter()
  const handleTouched = useRef(Boolean(product))
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("0")

  const {
    register,
    control,
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
      features: product?.highlights ?? [],
      featureBanners: product?.featureBanners ?? [],
    },
  })

  const featureRows = useFieldArray({ control, name: "features" })
  const bannerRows = useFieldArray({ control, name: "featureBanners" })

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

      <div>
        <div className="flex items-center justify-between">
          <p className="label text-faint">
            Features
            <span className="ml-2 font-normal normal-case text-faint">shown on the PDP highlights tab</span>
          </p>
          <button
            type="button"
            onClick={() => featureRows.append({ term: "", detail: "" })}
            disabled={featureRows.fields.length >= 8}
            className="h-9 rounded-control border border-line px-3 text-sm font-medium text-faint transition hover:border-ink hover:text-ink disabled:opacity-40"
          >
            + Add feature
          </button>
        </div>
        {typeof errors.features?.message === "string" && (
          <p className="mt-1 text-xs text-bad">{errors.features.message}</p>
        )}
        {featureRows.fields.length > 0 && (
          <div className="mt-3 space-y-2">
            {featureRows.fields.map((row, i) => (
              <div key={row.id} className="flex items-start gap-2">
                <TextInput
                  aria-label={`Feature ${i + 1} term`}
                  placeholder="Term"
                  className="max-w-44"
                  {...register(`features.${i}.term`)}
                />
                <TextInput
                  aria-label={`Feature ${i + 1} detail`}
                  placeholder="Detail — what makes it good"
                  className="flex-1"
                  {...register(`features.${i}.detail`)}
                />
                <button
                  type="button"
                  aria-label={`Remove feature ${i + 1}`}
                  onClick={() => featureRows.remove(i)}
                  className="label mt-2.5 text-faint transition hover:text-bad"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Collection" htmlFor="collection" error={errors.collection?.message}>
          <SearchSelect
            id="collection"
            ariaLabel="Collection"
            value={watch("collection")}
            onChange={(v) =>
              setValue("collection", v as ProductFormValues["collection"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            options={[
              { value: "iphone", label: "iPhone" },
              { value: "samsung", label: "Samsung" },
              { value: "accessories", label: "Accessories" },
            ]}
          />
        </Field>
        <Field label="Brand" htmlFor="brand" error={errors.brand?.message}>
          <SearchSelect
            id="brand"
            ariaLabel="Brand"
            value={watch("brand")}
            onChange={(v) =>
              setValue("brand", v as ProductFormValues["brand"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            options={[
              { value: "apple", label: "Apple" },
              { value: "samsung", label: "Samsung" },
              { value: "accessory", label: "Accessory" },
            ]}
          />
        </Field>
        <Field label="Category" htmlFor="category_id" error={errors.category_id?.message}>
          <SearchSelect
            id="category_id"
            ariaLabel="Category"
            emptyOption="Uncategorised"
            value={watch("category_id")}
            onChange={(v) => setValue("category_id", v, { shouldDirty: true, shouldValidate: true })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
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

      <ProductCardPreview
        product={product}
        title={watch("title") ?? ""}
        badges={badgesCsv ?? ""}
        colors={watch("colorsText") ?? ""}
        price={product ? (product.variants?.[0]?.priceInr ?? 0) : Number(price) || 0}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tags" htmlFor="tagsText" hint="comma separated" error={errors.tagsText?.message}>
          <TextInput id="tagsText" {...register("tagsText")} placeholder="magsafe, clear, drop-tested" />
        </Field>
        <Field label="Colours" htmlFor="colorsText" hint="swatches on filter + PDP" error={errors.colorsText?.message}>
          <SwatchPicker
            value={watch("colorsText") ?? ""}
            onChange={(csv) => setValue("colorsText", csv, { shouldDirty: true, shouldValidate: true })}
          />
          <input type="hidden" id="colorsText" {...register("colorsText")} />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="label text-faint">
            Feature banners
            <span className="ml-2 font-normal normal-case text-faint">big image cards below the PDP hero</span>
          </p>
          <button
            type="button"
            onClick={() => bannerRows.append({ eyebrow: "", title: "", copy: "", image: "" })}
            disabled={bannerRows.fields.length >= 2}
            className="h-9 rounded-control border border-line px-3 text-sm font-medium text-faint transition hover:border-ink hover:text-ink disabled:opacity-40"
          >
            + Add banner
          </button>
        </div>
        {typeof errors.featureBanners?.message === "string" && (
          <p className="mt-1 text-xs text-bad">{errors.featureBanners.message}</p>
        )}
        {bannerRows.fields.length > 0 && (
          <div className="mt-3 space-y-3">
            {bannerRows.fields.map((row, i) => (
              <div key={row.id} className="rounded-card border border-line p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="label text-faint">Banner {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => bannerRows.remove(i)}
                    className="label text-faint transition hover:text-bad"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Eyebrow" htmlFor={`fb-${i}-eyebrow`}>
                    <TextInput
                      id={`fb-${i}-eyebrow`}
                      placeholder="Protection"
                      {...register(`featureBanners.${i}.eyebrow`)}
                    />
                  </Field>
                  <Field label="Title" htmlFor={`fb-${i}-title`}>
                    <TextInput
                      id={`fb-${i}-title`}
                      placeholder="Armour where it counts"
                      {...register(`featureBanners.${i}.title`)}
                    />
                  </Field>
                  <Field label="Copy" htmlFor={`fb-${i}-copy`} className="sm:col-span-2">
                    <TextInput
                      id={`fb-${i}-copy`}
                      placeholder="One-line supporting copy…"
                      {...register(`featureBanners.${i}.copy`)}
                    />
                  </Field>
                  <Field label="Image URL" htmlFor={`fb-${i}-image`} hint="upload in Images tab, paste URL here" className="sm:col-span-2">
                    <TextInput
                      id={`fb-${i}-image`}
                      placeholder="https://…"
                      {...register(`featureBanners.${i}.image`)}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
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
