"use server"

import { revalidatePath } from "next/cache"
import QRCode from "qrcode"
import { z } from "zod"
import * as api from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Order } from "@/lib/types"
import {
  announcementFormSchema,
  categoryFormSchema,
  couponFormSchema,
  customerFormSchema,
  orderNotesSchema,
  orderStateSchema,
  productFormSchema,
  promoFormSchema,
  reviewFormSchema,
  reviewReplySchema,
  stockAdjustSchema,
  toProductInput,
  toCouponInput,
  totpCodeSchema,
  variantFormSchema,
} from "@/lib/schemas"

export interface ActionResult {
  ok: boolean
  error?: string
  id?: string
  data?: unknown
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
    await api.archiveDelete("product", id)
    invalidate(["/products", "/settings", "/"])
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
    await api.archiveDelete("category", id)
    invalidate(["/categories", "/products", "/settings"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/* ── coupons ── */

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

/** Full-form save (create or edit) — the P10 coupon engine form. */
export async function saveCouponAction(id: string | null, input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(couponFormSchema, input)
  if ("ok" in v) return v
  try {
    const payload = toCouponInput(v.data)
    if (id) {
      await api.updateCoupon(id, payload)
      invalidate(["/coupons"])
      return { ok: true }
    }
    await api.createCoupon(payload)
    invalidate(["/coupons"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.archiveDelete("coupon", id)
    invalidate(["/coupons", "/settings"])
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
    await api.archiveDelete("review", id)
    invalidate(["/reviews", "/settings", "/"])
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

/* ── P2: orders fulfilment, review replies, customers, subscribers,
      notifications, homepage sections, options, archive, 2FA, stock ── */

export async function setOrderStateAction(id: string, state: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = orderStateSchema.safeParse(state)
  if (!parsed.success) return { ok: false, error: "Bad state" }
  try {
    await api.setOrderState(id, parsed.data)
    invalidate(["/orders", `/orders/${id}`, "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function saveOrderNotesAction(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = orderNotesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the notes" }
  try {
    await api.setOrderNotes(id, parsed.data)
    invalidate([`/orders/${id}`])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function replyReviewAction(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = reviewReplySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Write a reply" }
  try {
    await api.replyToReview(id, parsed.data)
    invalidate(["/reviews", "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

const reviewStatusSchema = z.enum(["pending", "approved", "hidden"])

export async function setReviewStatusAction(id: string, status: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = reviewStatusSchema.safeParse(status)
  if (!parsed.success) return { ok: false, error: "Bad status" }
  try {
    await api.setReviewStatus(id, parsed.data)
    invalidate(["/reviews", "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function saveCustomerAction(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(customerFormSchema, input)
  if ("ok" in v) return v
  try {
    await api.saveCustomer(id, {
      name: v.data.name,
      phone: v.data.phone,
      notes: v.data.notes,
      tags: v.data.tagsText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
      marketing_opt_in: v.data.marketingOptIn,
    })
    invalidate(["/customers"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteSubscriberAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.deleteSubscriber(id)
    invalidate(["/customers"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.markNotificationRead(id)
    invalidate(["/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.markAllNotificationsRead()
    invalidate(["/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function clearNotificationsAction(): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.clearReadNotifications()
    invalidate(["/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function saveHomeSectionAction(
  key: string,
  patch: { title?: string; enabled?: boolean; position?: number; layout?: string; rule?: string; limitCount?: number; categoryHandle?: string; productIds?: string[] }
): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.saveHomeSection(key, patch as never)
    invalidate(["/settings", "/homepage"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function saveOptionAxisAction(input: { id?: string; name: string; values: string[]; position: number }): Promise<ActionResult> {
  await requireAdmin()
  if (!input.name.trim()) return { ok: false, error: "Name is required" }
  try {
    await api.saveOptionAxis({ ...input, name: input.name.trim() })
    invalidate(["/categories", "/products"])
    revalidatePath("/products/[id]", "page")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteOptionAxisAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.deleteOptionAxis(id)
    invalidate(["/categories", "/products"])
    revalidatePath("/products/[id]", "page")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function restoreArchiveAction(archiveId: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.archiveRestore(archiveId)
    invalidate(["/products", "/coupons", "/categories", "/reviews", "/settings"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function purgeArchiveAction(): Promise<ActionResult> {
  await requireAdmin()
  try {
    await api.purgeExpiredArchive()
    invalidate(["/settings"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function healthAction(): Promise<ActionResult> {
  await requireAdmin()
  return { ok: true, data: await api.healthCheck() }
}

export async function startTotpAction(): Promise<ActionResult> {
  await requireAdmin()
  try {
    const setup = await api.setupTotp()
    const qr = await QRCode.toDataURL(setup.uri, { margin: 1, width: 240 })
    return { ok: true, data: { ...setup, qr } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't start setup" }
  }
}

export async function confirmTotpAction(input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = totpCodeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Enter the 6-digit code" }
  try {
    const backupCodes = await api.confirmTotp(parsed.data)
    invalidate(["/settings"])
    return { ok: true, data: { backupCodes } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't confirm" }
  }
}

export async function disableTotpAction(input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = totpCodeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Enter a code to confirm" }
  try {
    await api.disableTotp(parsed.data)
    invalidate(["/settings"])
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't disable" }
  }
}

export async function adjustStockAction(variantId: string, input: unknown): Promise<ActionResult> {
  await requireAdmin()
  const v = parse(stockAdjustSchema, input)
  if ("ok" in v) return v
  if (v.data.delta === 0) return { ok: false, error: "Adjustment can't be 0" }
  try {
    await api.adjustStock(variantId, v.data.delta, v.data.reason)
    invalidate(["/products", "/inventory", "/"])
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
