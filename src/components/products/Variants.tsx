"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDelete } from "@/components/display"
import { useToast } from "@/components/feedback"
import { Field, NumberInput, TextInput } from "@/components/forms"
import { SearchSelect } from "@/components/ui/search-select"
import { createVariantAction, deleteVariantAction, updateVariantAction } from "@/app/(app)/actions"
import { variantFormSchema, type VariantFormValues } from "@/lib/schemas"
import { cn } from "@/lib/cn"
import type { OptionAxis, Variant } from "@/lib/types"

const MAX_COMBOS = 48

const keyOf = (opts: Record<string, string>) =>
  Object.entries(opts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|")

/** Cartesian product of the selected axes — skips option sets that already exist. */
function GenerateMatrix({
  productId,
  variants,
  axes,
}: {
  productId: string
  variants: Variant[]
  axes: OptionAxis[]
}) {
  const push = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(() => new Set(axes.map((a) => a.name)))
  const [priceInr, setPriceInr] = useState(() => String(variants[0]?.priceInr ?? ""))
  const [stock, setStock] = useState("10")
  const [skuPrefix, setSkuPrefix] = useState("fc")
  const [busy, setBusy] = useState(false)

  const active = axes.filter((a) => picked.has(a.name) && a.values.length > 0)
  const combos = useMemo(() => {
    let list: Record<string, string>[] = [{}]
    for (const a of active) {
      const next: Record<string, string>[] = []
      for (const base of list) for (const v of a.values) next.push({ ...base, [a.name]: v })
      list = next
      if (list.length > MAX_COMBOS) {
        list = list.slice(0, MAX_COMBOS)
        break
      }
    }
    return active.length ? list : []
  }, [active])

  const existing = new Set(variants.map((v) => keyOf(v.options ?? {})))
  const pending = combos.filter((c) => !existing.has(keyOf(c)))

  const generate = async () => {
    const price = Number(priceInr)
    const qty = Number(stock)
    if (!pending.length) return
    if (!Number.isFinite(price) || price <= 0) return push(false, "Set a valid selling price")
    if (!Number.isInteger(qty) || qty < 0) return push(false, "Stock must be a whole number")
    setBusy(true)
    let ok = 0
    let fail = 0
    for (const c of pending) {
      const vals = Object.values(c)
      const title = vals.join(" / ")
      const sku = [skuPrefix, ...vals]
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
      const res = await createVariantAction(productId, {
        title,
        sku,
        price_inr: price,
        price_usd: 0,
        inventory_qty: qty,
        options: c,
      })
      res.ok ? ok++ : fail++
    }
    setBusy(false)
    push(fail === 0, fail === 0 ? `${ok} variants generated ✓` : `${ok} added, ${fail} failed`)
    if (ok) router.refresh()
  }

  if (axes.length === 0) return null

  return (
    <div className="rounded-card border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label text-faint">Auto-generate</p>
          <p className="text-sm text-muted-foreground">
            {pending.length > 0
              ? `${pending.length} new variant${pending.length === 1 ? "" : "s"} from ${active.map((a) => a.name).join(" × ") || "no axes"}`
              : "Combine option axes into variants in one click"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="h-9 rounded-control border border-ink px-4 text-sm font-medium transition hover:bg-ink hover:text-paper"
        >
          {open ? "Close" : "Generate combinations"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <fieldset>
            <legend className="label mb-2 text-faint">Axes to combine</legend>
            <div className="flex flex-wrap gap-2">
              {axes.map((a) => {
                const on = picked.has(a.name)
                return (
                  <label
                    key={a.id}
                    className={cn(
                      "label inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 transition",
                      on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-faint hover:border-ink hover:text-ink"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => {
                        const next = new Set(picked)
                        next.has(a.name) ? next.delete(a.name) : next.add(a.name)
                        setPicked(next)
                      }}
                    />
                    {a.name} · {a.values.length}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Field label="Price ₹" htmlFor="gen-price">
              <NumberInput id="gen-price" value={priceInr} onChange={(e) => setPriceInr(e.target.value)} min={0} />
            </Field>
            <Field label="Stock each" htmlFor="gen-stock">
              <NumberInput id="gen-stock" value={stock} onChange={(e) => setStock(e.target.value)} min={0} />
            </Field>
            <Field label="SKU prefix" htmlFor="gen-prefix">
              <TextInput id="gen-prefix" value={skuPrefix} onChange={(e) => setSkuPrefix(e.target.value)} placeholder="fc" />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-faint">
              {combos.length} combination{combos.length === 1 ? "" : "s"}
              {combos.length > pending.length ? ` · ${combos.length - pending.length} already exist` : ""}
            </p>
            <button
              type="button"
              onClick={generate}
              disabled={busy || pending.length === 0}
              className="h-9 rounded-control bg-ink px-4 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-40"
            >
              {busy ? "Generating…" : `Generate ${pending.length || ""} variant${pending.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type Draft = VariantFormValues

const toDraft = (v: Variant): Draft => ({
  title: v.title,
  sku: v.sku,
  price_inr: v.priceInr,
  price_usd: v.priceUsd,
  inventory_qty: v.stock,
  options: { ...(v.options ?? {}) },
})

function OptionSelects({
  axes,
  options,
  onChange,
  idFor,
}: {
  axes: OptionAxis[]
  options: Record<string, string>
  onChange: (axis: string, value: string) => void
  idFor: (axis: OptionAxis) => string
}) {
  if (axes.length === 0) return null
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {axes.map((axis) => (
        <Field key={axis.id} label={axis.name} htmlFor={idFor(axis)}>
          <SearchSelect
            id={idFor(axis)}
            ariaLabel={axis.name}
            emptyOption="— none —"
            value={options[axis.name] ?? ""}
            onChange={(v) => onChange(axis.name, v)}
            options={axis.values.map((v) => ({ value: v, label: v }))}
          />
        </Field>
      ))}
    </div>
  )
}

function VariantRow({ variant, productId, axes }: { variant: Variant; productId: string; axes: OptionAxis[] }) {
  const push = useToast()
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(toDraft(variant))
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(variant))
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [k]: e.target.value as never })

  const setOption = (axis: string, value: string) => {
    const options = { ...draft.options }
    if (value) options[axis] = value
    else delete options[axis]
    setDraft({ ...draft, options })
  }

  const save = async () => {
    const parsed = variantFormSchema.safeParse(draft)
    if (!parsed.success) {
      push(false, parsed.error.issues[0]?.message ?? "Check the values")
      return
    }
    setSaving(true)
    const res = await updateVariantAction(variant.id, productId, parsed.data)
    setSaving(false)
    push(res.ok, res.ok ? "Variant saved ✓" : (res.error ?? "Couldn't save"))
    if (res.ok) router.refresh()
  }

  return (
    <div className="rounded-control border border-line p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Field label="Name" htmlFor={`${variant.id}-title`} className="lg:col-span-2">
          <TextInput id={`${variant.id}-title`} value={draft.title} onChange={set("title")} />
        </Field>
        <Field label="SKU" htmlFor={`${variant.id}-sku`}>
          <TextInput id={`${variant.id}-sku`} value={draft.sku} onChange={set("sku")} />
        </Field>
        <Field label="Price ₹" htmlFor={`${variant.id}-inr`}>
          <NumberInput id={`${variant.id}-inr`} value={draft.price_inr} onChange={set("price_inr")} min={0} />
        </Field>
        <Field label="Price $" htmlFor={`${variant.id}-usd`}>
          <NumberInput id={`${variant.id}-usd`} value={draft.price_usd} onChange={set("price_usd")} min={0} />
        </Field>
        <Field label="Stock" htmlFor={`${variant.id}-qty`}>
          <NumberInput id={`${variant.id}-qty`} value={draft.inventory_qty} onChange={set("inventory_qty")} min={0} />
        </Field>
      </div>
      <OptionSelects
        axes={axes}
        options={draft.options}
        onChange={setOption}
        idFor={(axis) => `${variant.id}-${axis.id}`}
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="label text-faint transition hover:text-bad"
        >
          Remove
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="h-9 rounded-control bg-ink px-4 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {confirm && (
        <ConfirmDelete
          what={`${variant.title} variant`}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            const res = await deleteVariantAction(variant.id, productId)
            push(res.ok, res.ok ? "Variant removed" : (res.error ?? "Couldn't remove"))
            if (res.ok) router.refresh()
            setConfirm(false)
          }}
        />
      )}
    </div>
  )
}

const EMPTY: Draft = { title: "", sku: "", price_inr: 0, price_usd: 0, inventory_qty: 10, options: {} }

export function VariantsPanel({
  productId,
  variants,
  axes,
}: {
  productId: string
  variants: Variant[]
  axes: OptionAxis[]
}) {
  const push = useToast()
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [adding, setAdding] = useState(false)

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [k]: e.target.value as never })

  const setOption = (axis: string, value: string) => {
    const options = { ...draft.options }
    if (value) options[axis] = value
    else delete options[axis]
    setDraft({ ...draft, options })
  }

  const add = async () => {
    const parsed = variantFormSchema.safeParse(draft)
    if (!parsed.success) {
      push(false, parsed.error.issues[0]?.message ?? "Check the values")
      return
    }
    setAdding(true)
    const res = await createVariantAction(productId, parsed.data)
    setAdding(false)
    push(res.ok, res.ok ? "Variant added ✓" : (res.error ?? "Couldn't add"))
    if (res.ok) {
      setDraft(EMPTY)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <GenerateMatrix productId={productId} variants={variants} axes={axes} />
      {variants.length === 0 && (
        <p className="text-sm text-faint">No variants yet — add the first one below.</p>
      )}
      {variants.map((v) => (
        <VariantRow key={v.id} variant={v} productId={productId} axes={axes} />
      ))}

      <div className="rounded-card border border-dashed border-line p-4">
        <p className="label mb-3 text-faint">Add variant</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Name" htmlFor="new-v-title" className="lg:col-span-2">
            <TextInput id="new-v-title" value={draft.title} onChange={set("title")} placeholder="Black / 1 pack" />
          </Field>
          <Field label="SKU" htmlFor="new-v-sku">
            <TextInput id="new-v-sku" value={draft.sku} onChange={set("sku")} placeholder="fc-black-1" />
          </Field>
          <Field label="Price ₹" htmlFor="new-v-inr">
            <NumberInput id="new-v-inr" value={draft.price_inr} onChange={set("price_inr")} min={0} />
          </Field>
          <Field label="Price $" htmlFor="new-v-usd">
            <NumberInput id="new-v-usd" value={draft.price_usd} onChange={set("price_usd")} min={0} />
          </Field>
          <Field label="Stock" htmlFor="new-v-qty">
            <NumberInput id="new-v-qty" value={draft.inventory_qty} onChange={set("inventory_qty")} min={0} />
          </Field>
        </div>
        <OptionSelects
          axes={axes}
          options={draft.options}
          onChange={setOption}
          idFor={(axis) => `new-v-${axis.id}`}
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={add}
            disabled={adding || !draft.title.trim()}
            className="h-9 rounded-control border border-ink px-4 text-sm font-medium transition hover:bg-ink hover:text-paper disabled:opacity-40"
          >
            {adding ? "Adding…" : "+ Add variant"}
          </button>
        </div>
      </div>
    </div>
  )
}
