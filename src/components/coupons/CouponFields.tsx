"use client"

import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { Field, NumberInput, PriceInput, Switch, Textarea, TextInput } from "@/components/forms"
import { SearchSelect } from "@/components/ui/search-select"
import type { CouponFormValues } from "@/lib/schemas"

const TYPES: { value: CouponFormValues["type"]; label: string }[] = [
  { value: "percent", label: "Percent off" },
  { value: "fixed", label: "Fixed ₹ off" },
  { value: "bogo", label: "Buy X get Y" },
  { value: "free_shipping", label: "Free shipping" },
]

export function CouponFields({
  register,
  watch,
  errors,
  setValue,
  idPrefix = "cp-",
}: {
  register: UseFormRegister<CouponFormValues>
  watch: UseFormWatch<CouponFormValues>
  errors: FieldErrors<CouponFormValues>
  setValue: UseFormSetValue<CouponFormValues>
  idPrefix?: string
}) {
  const type = watch("type")
  const appliesTo = watch("applies_to")

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Code" htmlFor={`${idPrefix}code`} required error={errors.code?.message} className="lg:col-span-2">
          <TextInput id={`${idPrefix}code`} {...register("code")} placeholder="REUSE20" autoComplete="off" />
        </Field>
        <Field label="Type" htmlFor={`${idPrefix}type`} required error={errors.type?.message}>
          <SearchSelect
            id={`${idPrefix}type`}
            ariaLabel="Type"
            value={watch("type")}
            onChange={(v) => setValue("type", v as CouponFormValues["type"], { shouldDirty: true, shouldValidate: true })}
            options={TYPES}
          />
        </Field>
        <Field label="Active" htmlFor={`${idPrefix}active`}>
          <Switch checked={watch("active")} onChange={(v) => setValue("active", v)} label="Coupon active" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {type === "percent" && (
          <Field label="Percent off" htmlFor={`${idPrefix}percent`} required error={errors.percent?.message}>
            <NumberInput id={`${idPrefix}percent`} {...register("percent")} min={1} max={90} />
          </Field>
        )}
        {type === "fixed" && (
          <Field label="Amount off" htmlFor={`${idPrefix}amount`} required error={errors.amount?.message}>
            <PriceInput id={`${idPrefix}amount`} {...register("amount")} min={0} />
          </Field>
        )}
        {type === "bogo" && (
          <>
            <Field label="Buy qty" htmlFor={`${idPrefix}bogo-buy`} required error={errors.bogo_buy_qty?.message}>
              <NumberInput id={`${idPrefix}bogo-buy`} {...register("bogo_buy_qty")} min={2} max={20} />
            </Field>
            <Field label="Get qty" htmlFor={`${idPrefix}bogo-get`} required error={errors.bogo_get_qty?.message}>
              <NumberInput id={`${idPrefix}bogo-get`} {...register("bogo_get_qty")} min={1} max={20} />
            </Field>
          </>
        )}
        {type === "free_shipping" && (
          <p className="self-end pb-3 text-sm text-faint sm:col-span-2 lg:col-span-4">
            Shipping is discounted to ₹0 at checkout (still subject to the rules below).
          </p>
        )}

        <Field label="Min order" htmlFor={`${idPrefix}min`} error={errors.min_subtotal?.message} hint="0 = no minimum">
          <PriceInput id={`${idPrefix}min`} {...register("min_subtotal")} min={0} />
        </Field>
        <Field label="Max discount" htmlFor={`${idPrefix}maxdisc`} error={errors.max_discount?.message} hint="0 = no cap">
          <PriceInput id={`${idPrefix}maxdisc`} {...register("max_discount")} min={0} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Starts" htmlFor={`${idPrefix}starts`} error={errors.startsAt?.message} hint="blank = immediately">
          <TextInput id={`${idPrefix}starts`} type="datetime-local" {...register("startsAt")} />
        </Field>
        <Field label="Ends" htmlFor={`${idPrefix}ends`} error={errors.endsAt?.message} hint="blank = never">
          <TextInput id={`${idPrefix}ends`} type="datetime-local" {...register("endsAt")} />
        </Field>
        <Field label="Redemption cap" htmlFor={`${idPrefix}maxred`} error={errors.max_redemptions?.message} hint="0 = unlimited">
          <NumberInput id={`${idPrefix}maxred`} {...register("max_redemptions")} min={0} />
        </Field>
        <Field label="Per-customer limit" htmlFor={`${idPrefix}peruser`} error={errors.per_user_limit?.message} hint="0 = unlimited">
          <NumberInput id={`${idPrefix}peruser`} {...register("per_user_limit")} min={0} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Applies to" htmlFor={`${idPrefix}scope`} error={errors.applies_to?.message}>
          <SearchSelect
            id={`${idPrefix}scope`}
            ariaLabel="Applies to"
            value={watch("applies_to")}
            onChange={(v) => setValue("applies_to", v as CouponFormValues["applies_to"], { shouldDirty: true, shouldValidate: true })}
            options={[
              { value: "all", label: "Entire order" },
              { value: "products", label: "Specific products" },
              { value: "categories", label: "Specific categories" },
            ]}
          />
        </Field>
        <Field label="Allowed states" htmlFor={`${idPrefix}states`} error={errors.statesText?.message} hint="e.g. ka, mh, tn — blank = everywhere" className="sm:col-span-1 lg:col-span-3">
          <TextInput id={`${idPrefix}states`} {...register("statesText")} placeholder="ka, mh" />
        </Field>
        {appliesTo === "products" && (
          <Field label="Product IDs" htmlFor={`${idPrefix}products`} error={errors.productsText?.message} hint="Comma-separated UUIDs (from product URLs)" className="lg:col-span-4">
            <Textarea id={`${idPrefix}products`} rows={2} {...register("productsText")} />
          </Field>
        )}
        {appliesTo === "categories" && (
          <Field label="Category IDs" htmlFor={`${idPrefix}categories`} error={errors.categoriesText?.message} hint="Comma-separated UUIDs (from category edit URLs)" className="lg:col-span-4">
            <Textarea id={`${idPrefix}categories`} rows={2} {...register("categoriesText")} />
          </Field>
        )}
      </div>
    </div>
  )
}
