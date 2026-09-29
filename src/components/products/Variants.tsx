"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDelete } from "@/components/display"
import { useToast } from "@/components/feedback"
import { Field, NumberInput, Select, TextInput } from "@/components/forms"
import { createVariantAction, deleteVariantAction, updateVariantAction } from "@/app/(app)/actions"
import { variantFormSchema, type VariantFormValues } from "@/lib/schemas"
import type { OptionAxis, Variant } from "@/lib/types"

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
          <Select id={idFor(axis)} value={options[axis.name] ?? ""} onChange={(e) => onChange(axis.name, e.target.value)}>
            <option value="">— none —</option>
            {axis.values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
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
