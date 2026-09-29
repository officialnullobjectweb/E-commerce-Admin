import { z } from "zod"
import type { ProductInput } from "./api"

/* Shared validation — the server action is the trust boundary,
   the client form reuses the same schema for instant feedback. */

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only")

export const splitList = (text: string): string[] =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12)

export const productFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  handle: slug,
  description: z.string().max(2000),
  collection: z.enum(["iphone", "samsung", "accessories"]),
  brand: z.enum(["apple", "samsung", "accessory"]),
  badges: z.string().max(120),
  tagsText: z.string().max(300),
  colorsText: z.string().max(300),
  category_id: z.string().max(64),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export function toProductInput(v: ProductFormValues): ProductInput {
  return {
    title: v.title,
    handle: v.handle,
    description: v.description,
    collection: v.collection,
    brand: v.brand,
    badges: v.badges,
    tags: splitList(v.tagsText),
    colors: splitList(v.colorsText),
    category_id: v.category_id || null,
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

export const variantFormSchema = z.object({
  title: z.string().trim().min(1, "Name is required").max(60),
  sku: z.string().trim().max(120),
  price_inr: z.coerce.number().min(0, "Must be ≥ 0").max(10_000_000),
  price_usd: z.coerce.number().min(0, "Must be ≥ 0").max(1_000_000),
  inventory_qty: z.coerce.number().int("Whole units").min(0, "Must be ≥ 0").max(1_000_000),
})

export type VariantFormValues = z.infer<typeof variantFormSchema>

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  handle: slug,
  description: z.string().max(2000),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, ""))
      .pipe(z.string().min(2, "Too short").max(32, "Too long")),
    type: z.enum(["percent", "fixed", "bogo", "free_shipping"]).default("percent"),
    percent: z.coerce.number().int("Whole percent").min(0, "Min 0%").max(90, "Max 90%").default(0),
    amount: z.coerce.number().int("Whole ₹").min(0, "Min ₹0").max(1_000_000).default(0),
    active: z.boolean().default(true),
    min_subtotal: z.coerce.number().int().min(0).max(10_000_000).default(0),
    max_discount: z.coerce.number().int().min(0).max(1_000_000).default(0),
    applies_to: z.enum(["all", "products", "categories"]).default("all"),
    productsText: z.string().max(2000).default(""),
    categoriesText: z.string().max(2000).default(""),
    statesText: z.string().max(600).default(""),
    startsAt: z.string().default(""),
    endsAt: z.string().default(""),
    max_redemptions: z.coerce.number().int().min(0).max(1_000_000).default(0),
    per_user_limit: z.coerce.number().int().min(0).max(1000).default(0),
    bogo_buy_qty: z.coerce.number().int().min(2).max(20).default(2),
    bogo_get_qty: z.coerce.number().int().min(1).max(20).default(1),
  })
  .superRefine((v, ctx) => {
    if (v.type === "percent" && v.percent < 1)
      ctx.addIssue({ code: "custom", path: ["percent"], message: "Percent coupons need ≥ 1%" })
    if (v.type === "fixed" && v.amount < 1)
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Fixed coupons need an amount" })
    if (v.startsAt && v.endsAt && new Date(v.startsAt) >= new Date(v.endsAt))
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after start" })
  })

export type CouponFormValues = z.infer<typeof couponFormSchema>

const idList = (text: string): string[] =>
  splitList(text).filter((s) => /^[0-9a-f-]{36}$/i.test(s))

const iso = (s: string): string | null => (s ? new Date(s).toISOString() : null)

export function toCouponInput(v: CouponFormValues): import("./api").CouponInput {
  return {
    code: v.code,
    type: v.type,
    percent: v.type === "percent" ? v.percent : 0,
    amount: v.type === "fixed" ? v.amount : 0,
    active: v.active,
    min_subtotal: v.min_subtotal,
    max_discount: v.max_discount,
    applies_to: v.applies_to,
    product_ids: v.applies_to === "products" ? idList(v.productsText) : [],
    category_ids: v.applies_to === "categories" ? idList(v.categoriesText) : [],
    states: splitList(v.statesText).map((s) => s.toLowerCase()),
    starts_at: iso(v.startsAt),
    ends_at: iso(v.endsAt),
    max_redemptions: v.max_redemptions,
    per_user_limit: v.per_user_limit,
    bogo_buy_qty: v.bogo_buy_qty,
    bogo_get_qty: v.bogo_get_qty,
  }
}

export const orderStateSchema = z.enum(["new", "packing", "shipped", "delivered", "returned"])
export const orderStatusSchema = z.enum(["pending", "paid", "failed", "refunded", "cancelled"])
export const orderNotesSchema = z.string().max(2000, "Too long")
export const reviewReplySchema = z.string().trim().min(1, "Reply can't be empty").max(2000)
export const totpCodeSchema = z.string().trim().regex(/^[\d\w-]{6,10}$/, "6 digits or a backup code")

export const customerFormSchema = z.object({
  name: z.string().trim().max(120),
  phone: z.string().trim().max(20),
  notes: z.string().max(2000),
  tagsText: z.string().max(300),
  marketingOptIn: z.boolean(),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export const stockAdjustSchema = z.object({
  delta: z.coerce.number().int("Whole units").min(-1_000_000).max(1_000_000),
  reason: z.string().trim().max(200),
})

export const reviewFormSchema = z.object({
  product_id: z.string().uuid("Pick a product"),
  name: z.string().trim().min(1, "Name is required").max(60),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(160),
  body: z.string().trim().min(1, "Review text is required").max(2000),
})

export type ReviewFormValues = z.infer<typeof reviewFormSchema>

export const announcementFormSchema = z.object({
  enabled: z.boolean(),
  marquee: z.boolean(),
  speed: z.coerce.number().min(8).max(120),
  link: z.string().max(300),
  pages: z.array(z.string()).min(1, "Pick at least one page"),
  messages: z
    .array(
      z.object({
        text: z.string().trim().min(1, "Message can't be empty").max(200),
        link: z.string().max(300),
      })
    )
    .min(1, "Add at least one message"),
})

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>

export const promoFormSchema = z.object({
  enabled: z.boolean(),
  image: z.string().max(500),
  title: z.string().trim().min(1, "Title is required").max(160),
  body: z.string().max(500),
  cta_label: z.string().trim().min(1, "Button label required").max(60),
  cta_link: z.string().max(300),
  delay: z.coerce.number().min(0).max(60),
})

export type PromoFormValues = z.infer<typeof promoFormSchema>
