"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import * as api from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Order } from "@/lib/types"
import {
  announcementFormSchema,
  categoryFormSchema,
  couponFormSchema,
  productFormSchema,
  promoFormSchema,
  reviewFormSchema,
  toProductInput,
  variantFormSchema,
} from "@/lib/schemas"

export interface ActionResult {
  ok: boolean
  error?: string
  id?: string
}

function fail(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : String(e)
  if (/duplicate|unique|23505/i.test(msg)) return { ok: false, error: "That handle/code already exists" }
  if (/row-level security|42501/i.test(msg)) return { ok: false, error: "Permission denied — check env keys" }
  return { ok: false, error: "Couldn't save — try again" }
}

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): { data: z.infer<T> } | ActionResult {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" }
  return { data: parsed.data }
}

function invalidate(paths: string[]) {
  for (const p of paths) revalidatePath(p)
}

/* ── products ── */

export async function saveProductAction(id: string | null, input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(productFormSchema, input)
  if ("ok" in v) return v
  try {
    const payload = toProductInput(v.data)
    if (id) {
      await api.updateProduct(id, payload)
      invalidate(["/products", `/products/${id}`, "/"])
      return { ok: true }
    }
    const newId = await api.createProduct(payload)
    invalidate(["/products", "/"])
    return { ok: true, id: newId }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.deleteProduct(id)
    invalidate(["/products", "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/* ── variants ── */

export async function createVariantAction(productId: string, input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(variantFormSchema, input)
  if ("ok" in v) return v
  try {
    const id = await api.createVariant({ product_id: productId, ...v.data })
    invalidate([`/products/${productId}`, "/products", "/"])
    return { ok: true, id }
  } catch (e) {
    return fail(e)
  }
}

export async function updateVariantAction(
  variantId: string,
  productId: string,
  input: unknown
): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(variantFormSchema, input)
  if ("ok" in v) return v
  try {
    await api.updateVariant(variantId, v.data)
    invalidate([`/products/${productId}`, "/products", "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteVariantAction(variantId: string, productId: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.deleteVariant(variantId)
    invalidate([`/products/${productId}`, "/products", "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/* ── images ── */

export async function addImageAction(productId: string, url: string): Promise<ActionResult> {
  await requireAdmin()
  if (!/^https:\/\//.test(url)) return { ok: false, error: "Need an https:// URL" }
  try {
    await api.addImage(productId, url)
    invalidate([`/products/${productId}`])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function uploadImageAction(productId: string, form: FormData): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.uploadImage(form)
    invalidate([`/products/${productId}`])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteImageAction(imageId: string, productId: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.deleteImage(imageId)
    invalidate([`/products/${productId}`])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function swapImageAction(
  productId: string,
  a: { id: string; position: number },
  b: { id: string; position: number }
): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.swapImages(a, b)
    invalidate([`/products/${productId}`])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/* ── categories ── */

export async function createCategoryAction(input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(categoryFormSchema, input)
  if ("ok" in v) return v
  try {
    const id = await api.createCategory(v.data)
    invalidate(["/categories", "/products"])
    return { ok: true, id }
  } catch (e) {
    return fail(e)
  }
}

export async function updateCategoryAction(
  id: string,
  input: Partial<{ name: string; description: string }>
): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.updateCategory(id, input)
    invalidate(["/categories", "/products"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.deleteCategory(id)
    invalidate(["/categories", "/products"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/* ── coupons ── */

export async function createCouponAction(input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(couponFormSchema, input)
  if ("ok" in v) return v
  try {
    await api.createCoupon(v.data.code, v.data.percent)
    invalidate(["/coupons"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateCouponAction(
  id: string,
  patch: Partial<{ percent: number; active: boolean }>
): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.updateCoupon(id, patch)
    invalidate(["/coupons"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.deleteCoupon(id)
    invalidate(["/coupons"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/* ── orders / reviews ── */

export async function setOrderStatusAction(id: string, status: Order["status"]): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.setOrderStatus(id, status)
    invalidate(["/orders", `/orders/${id}`, "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.deleteReview(id)
    invalidate(["/reviews", "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function createReviewAction(input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(reviewFormSchema, input)
  if ("ok" in v) return v
  try {
    await api.createReview(v.data)
    invalidate(["/reviews", "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/* ── settings ── */

export async function saveAnnouncementAction(input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(announcementFormSchema, input)
  if ("ok" in v) return v
  try {
    await api.saveSetting("announcement", v.data)
    invalidate(["/settings"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function savePromoAction(input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(promoFormSchema, input)
  if ("ok" in v) return v
  try {
    await api.saveSetting("promo", v.data)
    invalidate(["/settings"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
