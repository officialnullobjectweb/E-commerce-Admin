import { createClient } from "@supabase/supabase-js"
import type {
  Category,
  Coupon,
  Customer,
  DayPoint,
  DashboardStats,
  Order,
  Product,
  Review,
  SiteSettings,
} from "./types"

/**
 * Adapter layer — UI never touches backends directly.
 * Reads: Supabase PostgREST (anon key, public catalog only).
 * Writes + secrets: Cloudflare Worker (ADMIN_API_TOKEN, server-side).
 * Gaps the deployed Worker doesn't cover yet (coupons, settings,
 * categories create/delete, full product/variant edits, alerts) go
 * through a server-only service-role client in the same adapter.
 * NEVER import this module from a client component.
 */

function anon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function service() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not set")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function workerBase(): string {
  const url = process.env.WORKER_URL
  if (!url) throw new Error("WORKER_URL is not set")
  return url.replace(/\/$/, "")
}

async function callWorker<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.ADMIN_API_TOKEN
  if (!token) throw new Error("ADMIN_API_TOKEN is not set")
  const res = await fetch(`${workerBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`worker ${res.status}`)
  return res.json() as Promise<T>
}

interface ProductRow {
  id: string
  title: string
  handle: string
  description: string | null
  thumbnail_webp: string | null
  brand: string
  collection: string
  tags: string[]
  colors: string[]
  badges: string | null
  rating: number | null
  review_count: number | null
  category_id: string | null
  product_images: { url: string; position: number }[]
  variants: { id: string; title: string; sku: string; price_inr: number; price_usd: number; inventory_qty: number }[]
}

function toProduct(r: ProductRow): Product {
  const gallery = [...(r.product_images ?? [])].sort((a, b) => a.position - b.position)
  return {
    id: r.id,
    title: r.title,
    handle: r.handle,
    description: r.description ?? "",
    thumbnail: r.thumbnail_webp ?? gallery[0]?.url ?? null,
    brand: (r.brand === "apple" || r.brand === "samsung" ? r.brand : "accessory") as Product["brand"],
    collection: (["iphone", "samsung"].includes(r.collection) ? r.collection : "accessories") as Product["collection"],
    tags: r.tags ?? [],
    colors: r.colors ?? [],
    badges: r.badges ?? "",
    rating: Number(r.rating ?? 0),
    reviewCount: Number(r.review_count ?? 0),
    categoryHandle: "",
    categoryId: r.category_id ?? null,
    images: gallery.map((g, i) => ({ id: `${r.id}-img-${i}`, url: g.url, position: g.position })),
    variants: (r.variants ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      priceInr: v.price_inr,
      priceUsd: v.price_usd,
      stock: v.inventory_qty,
    })),
  }
}

const POOL = "*, product_images(url,position), variants(id,title,sku,price_inr,price_usd,inventory_qty)"

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await anon().from("products").select(POOL).order("created_at", { ascending: false }).limit(200)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as ProductRow[]).map(toProduct)
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await anon().from("products").select(POOL).eq("id", id).limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toProduct(data as unknown as ProductRow) : null
}

export async function listCategories(): Promise<Category[]> {
  const sb = anon()
  const [{ data }, { data: joined }] = await Promise.all([
    sb.from("categories").select("id,name,handle,description").order("name"),
    sb.from("products").select("id,categories!inner(handle)").limit(500),
  ])
  const byHandle = new Map<string, number>()
  for (const p of (joined ?? []) as unknown as { categories: { handle: string } | null }[]) {
    const h = p.categories?.handle
    if (h) byHandle.set(h, (byHandle.get(h) ?? 0) + 1)
  }
  return ((data ?? []) as Category[]).map((c) => ({ ...c, productCount: byHandle.get(c.handle) ?? 0 }))
}

export async function getStats(): Promise<DashboardStats> {
  return callWorker<DashboardStats>("/v1/stats")
}

export async function getDaily(days = 14): Promise<DayPoint[]> {
  return callWorker<DayPoint[]>(`/v1/stats/daily?days=${days}`)
}

export async function getAlerts(): Promise<{
  lowStock: { id: string; title: string; inventory_qty: number; products: { title: string } | null }[]
  topProducts: { title: string; qty: number; revenue: number }[]
}> {
  const sb = service()
  const [{ data: low }, { data: orders }] = await Promise.all([
    sb.from("variants")
      .select("id,title,inventory_qty,products(title)")
      .lt("inventory_qty", 10)
      .order("inventory_qty")
      .limit(20),
    sb.from("orders").select("items").eq("status", "paid").limit(1000),
  ])
  const sales = new Map<string, { title: string; qty: number; revenue: number }>()
  for (const o of (orders ?? []) as unknown as { items: Order["items"] | null }[]) {
    for (const i of o.items ?? []) {
      if (!i.title) continue
      const s = sales.get(i.title) ?? { title: i.title, qty: 0, revenue: 0 }
      s.qty += i.qty ?? 1
      s.revenue += (i.price ?? 0) * (i.qty ?? 1)
      sales.set(i.title, s)
    }
  }
  return {
    lowStock: (low ?? []) as unknown as {
      id: string
      title: string
      inventory_qty: number
      products: { title: string } | null
    }[],
    topProducts: [...sales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  }
}

export async function listOrders(limit = 100, status?: Order["status"] | ""): Promise<Order[]> {
  const qs = new URLSearchParams({ limit: String(limit) })
  if (status) qs.set("status", status)
  const rows = await callWorker<Record<string, unknown>[]>(`/v1/orders?${qs}`)
  return rows.map((o) => ({
    id: String(o.id),
    email: String(o.email ?? ""),
    name: String(o.name ?? ""),
    phone: String(o.phone ?? ""),
    address: (o.address ?? {}) as Record<string, string>,
    items: (o.items ?? []) as Order["items"],
    subtotal: Number(o.subtotal ?? 0),
    shipping: Number(o.shipping ?? 0),
    total: Number(o.total ?? 0),
    status: o.status as Order["status"],
    razorpayOrderId: String(o.razorpay_order_id ?? ""),
    razorpayPaymentId: String(o.razorpay_payment_id ?? ""),
    createdAt: String(o.created_at ?? ""),
  }))
}

export async function getOrder(id: string): Promise<Order | null> {
  try {
    const o = await callWorker<Record<string, unknown>>(`/v1/orders/${id}`)
    return {
      id: String(o.id),
      email: String(o.email ?? ""),
      name: String(o.name ?? ""),
      phone: String(o.phone ?? ""),
      address: (o.address ?? {}) as Record<string, string>,
      items: (o.items ?? []) as Order["items"],
      subtotal: Number(o.subtotal ?? 0),
      shipping: Number(o.shipping ?? 0),
      total: Number(o.total ?? 0),
      status: o.status as Order["status"],
      razorpayOrderId: String(o.razorpay_order_id ?? ""),
      razorpayPaymentId: String(o.razorpay_payment_id ?? ""),
      createdAt: String(o.created_at ?? ""),
    }
  } catch {
    return null
  }
}

export async function listReviews(limit = 100): Promise<Review[]> {
  const rows = await callWorker<Record<string, unknown>[]>(`/v1/reviews?limit=${limit}`)
  const { data: products } = await anon().from("products").select("id,title")
  const titles = new Map(
    ((products ?? []) as unknown as { id: string; title: string }[]).map((p) => [p.id, p.title])
  )
  return rows.map((r) => ({
    id: String(r.id),
    productId: String(r.product_id ?? ""),
    productTitle: titles.get(String(r.product_id ?? "")),
    name: String(r.name ?? ""),
    rating: Number(r.rating ?? 0),
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    createdAt: String(r.created_at ?? ""),
  }))
}

export async function listCoupons(): Promise<Coupon[]> {
  const { data, error } = await service()
    .from("coupons")
    .select("id,code,percent,active,created_at")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []).map((c) => ({
    id: String(c.id),
    code: String(c.code ?? ""),
    percent: Number(c.percent ?? 0),
    active: Boolean(c.active),
    createdAt: String(c.created_at ?? ""),
  }))
}

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await anon().from("site_settings").select("key,value")
  if (error) throw new Error(error.message)
  const map = new Map(((data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value]))
  return {
    announcement: (map.get("announcement") as SiteSettings["announcement"]) ?? null,
    promo: (map.get("promo") as SiteSettings["promo"]) ?? null,
  }
}

export async function saveSetting(key: "announcement" | "promo", value: unknown): Promise<void> {
  const { error } = await service()
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

/** Customers derived from order history (no separate table needed). */
export async function listCustomers(): Promise<Customer[]> {
  const orders = await listOrders(1000)
  const map = new Map<string, Customer>()
  for (const o of orders) {
    const key = o.email.toLowerCase()
    if (!key) continue
    const c = map.get(key) ?? { email: o.email, name: o.name, orders: 0, revenue: 0, lastOrderAt: o.createdAt }
    c.orders += 1
    if (o.status === "paid") c.revenue += o.total
    if (o.name && !c.name) c.name = o.name
    if (o.createdAt > c.lastOrderAt) c.lastOrderAt = o.createdAt
    map.set(key, c)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}

/* ────────────────────────────────────────────────────────────────
 * Mutations (server-only). One write path per entity:
 *  - service-role: products, variants, categories, coupons, settings
 *    (full field access, no Worker deploys required)
 *  - Worker: orders status, reviews, images, uploads (deployed routes)
 * ──────────────────────────────────────────────────────────────── */

function err(e: { message: string }): never {
  throw new Error(e.message)
}

export interface ProductInput {
  title: string
  handle: string
  description: string
  collection: "iphone" | "samsung" | "accessories"
  brand: "apple" | "samsung" | "accessory"
  tags: string[]
  colors: string[]
  badges: string
  category_id: string | null
}

export async function createProduct(input: ProductInput): Promise<string> {
  const { data, error } = await service()
    .from("products")
    .insert(input)
    .select("id")
    .single()
  if (error) err(error)
  return String(data!.id)
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const { error } = await service().from("products").update(input).eq("id", id)
  if (error) err(error)
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await service().from("products").delete().eq("id", id)
  if (error) err(error)
}

export interface VariantInput {
  product_id: string
  title: string
  sku: string
  price_inr: number
  price_usd: number
  inventory_qty: number
}

export async function createVariant(input: VariantInput): Promise<string> {
  const { data, error } = await service().from("variants").insert(input).select("id").single()
  if (error) err(error)
  return String(data!.id)
}

export async function updateVariant(
  id: string,
  patch: Partial<Omit<VariantInput, "product_id">>
): Promise<void> {
  const { error } = await service().from("variants").update(patch).eq("id", id)
  if (error) err(error)
}

export async function deleteVariant(id: string): Promise<void> {
  const { error } = await service().from("variants").delete().eq("id", id)
  if (error) err(error)
}

export async function createCategory(input: { name: string; handle: string; description: string }): Promise<string> {
  const { data, error } = await service().from("categories").insert(input).select("id").single()
  if (error) err(error)
  return String(data!.id)
}

export async function updateCategory(id: string, patch: Partial<{ name: string; description: string }>): Promise<void> {
  const { error } = await service().from("categories").update(patch).eq("id", id)
  if (error) err(error)
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await service().from("categories").delete().eq("id", id)
  if (error) err(error)
}

export async function createCoupon(code: string, percent: number): Promise<void> {
  const { error } = await service().from("coupons").insert({
    code: code.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    percent,
  })
  if (error) err(error)
}

export async function updateCoupon(id: string, patch: Partial<{ percent: number; active: boolean }>): Promise<void> {
  const { error } = await service().from("coupons").update(patch).eq("id", id)
  if (error) err(error)
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await service().from("coupons").delete().eq("id", id)
  if (error) err(error)
}

export async function addImage(product_id: string, url: string): Promise<void> {
  await callWorker("/v1/images", { method: "POST", body: JSON.stringify({ product_id, url }) })
}

export async function deleteImage(id: string): Promise<void> {
  await callWorker(`/v1/images/${id}`, { method: "DELETE" })
}

export async function uploadImage(form: FormData): Promise<string> {
  const token = process.env.ADMIN_API_TOKEN
  const base = workerBase()
  const res = await fetch(`${base}/v1/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(`upload ${res.status}`)
  const json = (await res.json()) as { ok?: boolean; url?: string }
  if (!json.ok || !json.url) throw new Error("upload failed")
  return json.url
}

export async function setOrderStatus(id: string, status: Order["status"]): Promise<void> {
  await callWorker(`/v1/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) })
}

export async function deleteReview(id: string): Promise<void> {
  await callWorker(`/v1/reviews/${id}`, { method: "DELETE" })
}

export async function createReview(input: {
  product_id: string
  name: string
  rating: number
  title: string
  body: string
}): Promise<void> {
  await callWorker("/v1/reviews", { method: "POST", body: JSON.stringify(input) })
}

/** Swap two image positions (unique constraint needs a temp slot). */
export async function swapImages(
  a: { id: string; position: number },
  b: { id: string; position: number }
): Promise<void> {
  const sb = service()
  let { error } = await sb.from("product_images").update({ position: -9999 }).eq("id", a.id)
  if (error) err(error)
  ;({ error } = await sb.from("product_images").update({ position: a.position }).eq("id", b.id))
  if (error) err(error)
  ;({ error } = await sb.from("product_images").update({ position: b.position }).eq("id", a.id))
  if (error) err(error)
}
