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

export const couponFormSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .pipe(z.string().min(2, "Too short").max(32, "Too long")),
  percent: z.coerce.number().int("Whole percent").min(1, "Min 1%").max(90, "Max 90%"),
})

export type CouponFormValues = z.infer<typeof couponFormSchema>

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
