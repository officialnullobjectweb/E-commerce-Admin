import { createClient } from "@supabase/supabase-js"
import { decryptSecret, encryptSecret, generateSecret, hashBackup, newBackupCodes, otpauthUri, totpVerify } from "./totp"
import type {
  ArchiveItem,
  Category,
  Coupon,
  CouponType,
  Customer,
  DayPoint,
  DashboardStats,
  HomeSection,
  NotificationItem,
  OptionAxis,
  Order,
  OrderQuery,
  Product,
  Review,
  SiteSettings,
  Subscriber,
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

/** Low-stock alert threshold from site_settings['ops'] (default 10). */
async function lowStockThreshold(): Promise<number> {
  const { data } = await service().from("site_settings").select("value").eq("key", "ops").maybeSingle()
  const t = Number((data?.value as { low_stock_threshold?: number } | null)?.low_stock_threshold ?? 10)
  return Number.isFinite(t) && t >= 1 ? Math.min(t, 100) : 10
}

export async function getStats(): Promise<DashboardStats> {
  const threshold = await lowStockThreshold()
  const sb = service()
  const [{ data: orders, error: oe }, pc, rc, lc] = await Promise.all([
    sb.from("orders").select("total,status,state,payment_method,discount").limit(5000),
    sb.from("products").select("id", { count: "exact", head: true }),
    sb.from("reviews").select("id", { count: "exact", head: true }),
    sb.from("variants").select("id", { count: "exact", head: true }).lt("inventory_qty", threshold),
  ])
  if (oe) throw new Error(oe.message)
  const rows = (orders ?? []) as unknown as {
    total: number; status: string; state: string; payment_method: string; discount: number
  }[]
  const paid = rows.filter((o) => o.status === "paid")
  const tally = (key: (o: (typeof rows)[number]) => string) => {
    const m: Record<string, number> = {}
    for (const o of rows) m[key(o)] = (m[key(o)] ?? 0) + 1
    return m
  }
  return {
    products: pc.count ?? 0,
    orders: rows.length,
    paidOrders: paid.length,
    revenueInr: paid.reduce((s, o) => s + (o.total || 0), 0),
    reviews: rc.count ?? 0,
    lowStock: lc.count ?? 0,
    states: tally((o) => o.state || "new"),
    methods: tally((o) => o.payment_method || "razorpay"),
    couponDiscountInr: paid.reduce((s, o) => s + (o.discount || 0), 0),
  }
}

export async function getDaily(days = 14): Promise<DayPoint[]> {
  return callWorker<DayPoint[]>(`/v1/stats/daily?days=${days}`)
}

export async function getAlerts(): Promise<{
  lowStock: { id: string; title: string; inventory_qty: number; products: { title: string } | null }[]
  topProducts: { title: string; qty: number; revenue: number }[]
}> {
  const sb = service()
  const threshold = await lowStockThreshold()
  const [{ data: low }, { data: orders }] = await Promise.all([
    sb.from("variants")
      .select("id,title,inventory_qty,products(title)")
      .lt("inventory_qty", threshold)
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

const ORDER_COLS =
  "id,email,name,phone,address,items,subtotal,shipping,total,status,payment_method,state,coupon_code,discount,invoice_no,notes,razorpay_order_id,razorpay_payment_id,created_at"

function toOrder(o: Record<string, unknown>): Order {
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
    paymentMethod: (o.payment_method ?? "razorpay") as Order["paymentMethod"],
    state: (o.state ?? "") as Order["state"],
    couponCode: String(o.coupon_code ?? ""),
    discount: Number(o.discount ?? 0),
    invoiceNo: o.invoice_no == null ? null : Number(o.invoice_no),
    notes: String(o.notes ?? ""),
    razorpayOrderId: String(o.razorpay_order_id ?? ""),
    razorpayPaymentId: String(o.razorpay_payment_id ?? ""),
    createdAt: String(o.created_at ?? ""),
  }
}

export async function listOrders(opts: OrderQuery = {}): Promise<Order[]> {
  const { limit = 100, offset = 0, status, state, method, q, from, to } = opts
  const capped = Math.min(limit, 500)
  let query = service()
    .from("orders")
    .select(ORDER_COLS)
    .order("created_at", { ascending: false })
    .range(offset, offset + capped - 1)
  if (status) query = query.eq("status", status)
  if (state) query = query.eq("state", state)
  if (method) query = query.eq("payment_method", method)
  if (from) query = query.gte("created_at", from)
  if (to) query = query.lte("created_at", to)
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`
    const parts = [`email.ilike.${like}`, `name.ilike.${like}`, `phone.ilike.${like}`]
    if (/^\d+$/.test(q)) parts.push(`invoice_no.eq.${q}`)
    query = query.or(parts.join(","))
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(toOrder)
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await service()
    .from("orders")
    .select(ORDER_COLS)
    .eq("id", id)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toOrder(data as unknown as Record<string, unknown>) : null
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
    reply: r.reply == null ? null : String(r.reply),
    repliedAt: r.replied_at == null ? null : String(r.replied_at),
    status: (r.status ?? "approved") as Review["status"],
    createdAt: String(r.created_at ?? ""),
  }))
}

export async function listCoupons(): Promise<Coupon[]> {
  const { data, error } = await service()
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(toCoupon)
}

function toCoupon(c: Record<string, unknown>): Coupon {
  const date = (v: unknown) => (v ? String(v) : null)
  return {
    id: String(c.id),
    code: String(c.code ?? ""),
    type: (c.type ?? "percent") as CouponType,
    percent: Number(c.percent ?? 0),
    amount: Number(c.amount ?? 0),
    active: Boolean(c.active),
    minSubtotal: Number(c.min_subtotal ?? 0),
    maxDiscount: Number(c.max_discount ?? 0),
    appliesTo: (c.applies_to ?? "all") as Coupon["appliesTo"],
    productIds: (c.product_ids ?? []) as string[],
    categoryIds: (c.category_ids ?? []) as string[],
    states: (c.states ?? []) as string[],
    startsAt: date(c.starts_at),
    endsAt: date(c.ends_at),
    maxRedemptions: Number(c.max_redemptions ?? 0),
    perUserLimit: Number(c.per_user_limit ?? 0),
    redemptionsUsed: Number(c.redemptions_used ?? 0),
    bogoBuyQty: Number(c.bogo_buy_qty ?? 2),
    bogoGetQty: Number(c.bogo_get_qty ?? 1),
    createdAt: String(c.created_at ?? ""),
  }
}

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await anon().from("site_settings").select("key,value")
  if (error) throw new Error(error.message)
  const map = new Map(((data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value]))
  return {
    announcement: (map.get("announcement") as SiteSettings["announcement"]) ?? null,
    promo: (map.get("promo") as SiteSettings["promo"]) ?? null,
    social: (map.get("social") as SiteSettings["social"]) ?? null,
    billing: (map.get("billing") as SiteSettings["billing"]) ?? null,
    ops: (map.get("ops") as SiteSettings["ops"]) ?? null,
  }
}

export type SettingKey = "announcement" | "promo" | "social" | "billing" | "ops" | "admin_theme"

export async function saveSetting(key: SettingKey, value: unknown): Promise<void> {
  const { error } = await service()
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

/** Customers: editable records (checkout upserts; admin edits here). */
export async function listCustomers(): Promise<Customer[]> {
  const sb = service()
  const [{ data: rows }, { data: orders }] = await Promise.all([
    sb.from("customers").select("*").order("last_order_at", { ascending: false }).limit(1000),
    sb.from("orders").select("email,status,total,created_at").limit(2000),
  ])
  if (rows === null) throw new Error("customers load failed")
  const agg = new Map<string, { count: number; revenue: number }>()
  for (const o of (orders ?? []) as unknown as { email: string; status: string; total: number }[]) {
    const key = o.email.toLowerCase()
    const a = agg.get(key) ?? { count: 0, revenue: 0 }
    a.count += 1
    if (o.status === "paid") a.revenue += Number(o.total || 0)
    agg.set(key, a)
  }
  return ((rows ?? []) as unknown as Record<string, unknown>[]).map((r) => {
    const a = agg.get(String(r.email).toLowerCase()) ?? { count: 0, revenue: 0 }
    return {
      id: String(r.id),
      email: String(r.email ?? ""),
      name: String(r.name ?? ""),
      phone: String(r.phone ?? ""),
      tags: (r.tags ?? []) as string[],
      notes: String(r.notes ?? ""),
      marketingOptIn: Boolean(r.marketing_opt_in),
      orders: a.count,
      revenue: a.revenue,
      lastOrderAt: r.last_order_at ? String(r.last_order_at) : null,
      createdAt: String(r.created_at ?? ""),
    }
  })
}

export async function saveCustomer(
  id: string,
  patch: Partial<{ name: string; phone: string; notes: string; tags: string[]; marketing_opt_in: boolean }>
): Promise<void> {
  const { error } = await service().from("customers").update(patch).eq("id", id)
  if (error) err(error)
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

export interface CouponInput {
  code: string
  type: CouponType
  percent: number
  amount: number
  active: boolean
  min_subtotal: number
  max_discount: number
  applies_to: "all" | "products" | "categories"
  product_ids: string[]
  category_ids: string[]
  states: string[]
  starts_at: string | null
  ends_at: string | null
  max_redemptions: number
  per_user_limit: number
  bogo_buy_qty: number
  bogo_get_qty: number
}

export async function createCoupon(input: CouponInput): Promise<void> {
  const { error } = await service()
    .from("coupons")
    .insert({ ...input, code: input.code.toUpperCase().replace(/[^A-Z0-9]/g, "") })
  if (error) err(error)
}

export async function updateCoupon(id: string, patch: Partial<CouponInput>): Promise<void> {
  const { error } = await service().from("coupons").update(patch).eq("id", id)
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
  const { error } = await service().from("orders").update({ status }).eq("id", id)
  if (error) err(error)
}

export async function setOrderState(id: string, state: Order["state"]): Promise<void> {
  const { error } = await service().from("orders").update({ state }).eq("id", id)
  if (error) err(error)
}

export async function setOrderNotes(id: string, notes: string): Promise<void> {
  const { error } = await service().from("orders").update({ notes }).eq("id", id)
  if (error) err(error)
}

export async function replyToReview(id: string, reply: string): Promise<void> {
  const { error } = await service()
    .from("reviews")
    .update({ reply, replied_at: new Date().toISOString(), status: "approved" })
    .eq("id", id)
  if (error) err(error)
}

export async function setReviewStatus(id: string, status: Review["status"]): Promise<void> {
  const { error } = await service().from("reviews").update({ status }).eq("id", id)
  if (error) err(error)
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

/* ────────────────────────────────────────────────────────────────
 * P2 additions — subscribers, notifications, homepage sections,
 * option axes, stock audit, archive, TOTP 2FA.
 * ──────────────────────────────────────────────────────────────── */

export async function listSubscribers(): Promise<Subscriber[]> {
  const { data, error } = await service()
    .from("subscribers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((s) => ({
    id: String(s.id),
    email: String(s.email ?? ""),
    source: String(s.source ?? ""),
    tags: (s.tags ?? []) as string[],
    unsubscribed: Boolean(s.unsubscribed),
    createdAt: String(s.created_at ?? ""),
  }))
}

export async function deleteSubscriber(id: string): Promise<void> {
  const { error } = await service().from("subscribers").delete().eq("id", id)
  if (error) err(error)
}

export async function listNotifications(limit = 40): Promise<NotificationItem[]> {
  const { data, error } = await service()
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((n) => ({
    id: String(n.id),
    type: String(n.type ?? ""),
    title: String(n.title ?? ""),
    body: String(n.body ?? ""),
    href: String(n.href ?? ""),
    readAt: n.read_at ? String(n.read_at) : null,
    createdAt: String(n.created_at ?? ""),
  }))
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await service()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
  if (error) err(error)
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await service()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
  if (error) err(error)
}

export async function clearReadNotifications(): Promise<void> {
  const { error } = await service().from("notifications").delete().not("read_at", "is", null)
  if (error) err(error)
}

export async function listHomeSections(): Promise<HomeSection[]> {
  const { data, error } = await anon()
    .from("home_sections")
    .select("*")
    .order("position")
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(toHomeSection)
}

function toHomeSection(s: Record<string, unknown>): HomeSection {
  return {
    key: String(s.key),
    title: String(s.title ?? ""),
    enabled: Boolean(s.enabled),
    position: Number(s.position ?? 0),
    layout: (s.layout ?? "grid") as HomeSection["layout"],
    rule: (s.rule ?? "manual") as HomeSection["rule"],
    categoryHandle: String(s.category_handle ?? ""),
    productIds: (s.product_ids ?? []) as string[],
    limitCount: Number(s.limit_count ?? 8),
    updatedAt: String(s.updated_at ?? ""),
  }
}

export async function saveHomeSection(
  key: string,
  patch: Partial<Omit<HomeSection, "key" | "updatedAt">>
): Promise<void> {
  const row: Record<string, unknown> = { key, updated_at: new Date().toISOString() }
  if (patch.title !== undefined) row.title = patch.title
  if (patch.enabled !== undefined) row.enabled = patch.enabled
  if (patch.position !== undefined) row.position = patch.position
  if (patch.layout !== undefined) row.layout = patch.layout
  if (patch.rule !== undefined) row.rule = patch.rule
  if (patch.categoryHandle !== undefined) row.category_handle = patch.categoryHandle
  if (patch.productIds !== undefined) row.product_ids = patch.productIds
  if (patch.limitCount !== undefined) row.limit_count = patch.limitCount
  const { error } = await service().from("home_sections").upsert(row)
  if (error) err(error)
}

export async function listOptionAxes(): Promise<OptionAxis[]> {
  const { data, error } = await anon()
    .from("option_library")
    .select("*")
    .order("position")
    .order("name")
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((o) => ({
    id: String(o.id),
    name: String(o.name ?? ""),
    values: (o.values ?? []) as string[],
    position: Number(o.position ?? 0),
  }))
}

export async function saveOptionAxis(input: { id?: string; name: string; values: string[]; position: number }): Promise<void> {
  const row: Record<string, unknown> = { name: input.name, values: input.values, position: input.position }
  if (input.id) row.id = input.id
  const { error } = await service().from("option_library").upsert(row)
  if (error) err(error)
}

export async function deleteOptionAxis(id: string): Promise<void> {
  const { error } = await service().from("option_library").delete().eq("id", id)
  if (error) err(error)
}

/** Stock change + audit row (single service-role transaction-ish sequence). */
export async function adjustStock(variantId: string, delta: number, reason: string): Promise<void> {
  const sb = service()
  const { data: v, error: vErr } = await sb
    .from("variants")
    .select("inventory_qty")
    .eq("id", variantId)
    .single()
  if (vErr) err(vErr)
  const next = Math.max(0, Number((v as { inventory_qty: number }).inventory_qty) + delta)
  const { error } = await sb.from("variants").update({ inventory_qty: next }).eq("id", variantId)
  if (error) err(error)
  const { error: aErr } = await sb.from("stock_adjustments").insert({
    variant_id: variantId,
    delta,
    reason,
  })
  if (aErr) err(aErr)
}

/* ── archive: copy-then-delete, 7-day retention, restore re-inserts ids ── */

export async function listArchive(): Promise<ArchiveItem[]> {
  const { data, error } = await service()
    .from("archive")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((a) => ({
    id: String(a.id),
    entityType: a.entity_type as ArchiveItem["entityType"],
    entityId: String(a.entity_id),
    payload: (a.payload ?? {}) as Record<string, unknown>,
    purgeAt: String(a.purge_at ?? ""),
    createdAt: String(a.created_at ?? ""),
  }))
}

export async function archiveDelete(entityType: ArchiveItem["entityType"], id: string): Promise<void> {
  const sb = service()
  const put = async (payload: Record<string, unknown>) => {
    const { error } = await sb.from("archive").insert({ entity_type: entityType, entity_id: id, payload })
    if (error) err(error)
  }
  const drop = async (table: string, undo?: Record<string, unknown>) => {
    const { error } = await sb.from(table).delete().eq("id", id)
    if (error) {
      await sb.from("archive").delete().eq("entity_id", id).eq("entity_type", entityType)
      if (undo) await sb.from(table).upsert(undo).select()
      err(error)
    }
  }
  if (entityType === "product") {
    const [{ data: product }, { data: images }, { data: variants }] = await Promise.all([
      sb.from("products").select("*").eq("id", id).maybeSingle(),
      sb.from("product_images").select("*").eq("product_id", id).order("position"),
      sb.from("variants").select("*").eq("product_id", id),
    ])
    if (!product) return
    await put({ product, images: images ?? [], variants: variants ?? [] })
    await drop("products", product as Record<string, unknown>)
  } else if (entityType === "category") {
    const [{ data: category }, { data: prods }] = await Promise.all([
      sb.from("categories").select("*").eq("id", id).maybeSingle(),
      sb.from("products").select("id").eq("category_id", id),
    ])
    if (!category) return
    await put({ category, productIds: ((prods ?? []) as { id: string }[]).map((p) => p.id) })
    await drop("categories", category as Record<string, unknown>)
  } else {
    const table = entityType === "coupon" ? "coupons" : "reviews"
    const { data: row } = await sb.from(table).select("*").eq("id", id).maybeSingle()
    if (!row) return
    await put({ [entityType]: row })
    await drop(table, row as Record<string, unknown>)
  }
}

export async function archiveRestore(archiveId: string): Promise<void> {
  const sb = service()
  const { data: item, error } = await sb.from("archive").select("*").eq("id", archiveId).maybeSingle()
  if (error) err(error)
  if (!item) throw new Error("Archive item not found")
  const { entity_type: type, entity_id: id, payload } = item as unknown as {
    entity_type: ArchiveItem["entityType"]
    entity_id: string
    payload: Record<string, unknown>
  }
  const ins = async (table: string, row: Record<string, unknown> | Record<string, unknown>[]) => {
    // upsert so a retry after a partial restore converges instead of 23505-ing
    const { error } = await sb.from(table).upsert(row)
    if (error) err(error)
  }
  if (type === "product") {
    await ins("products", payload.product as Record<string, unknown>)
    const variants = (payload.variants ?? []) as Record<string, unknown>[]
    const images = (payload.images ?? []) as Record<string, unknown>[]
    if (variants.length) await ins("variants", variants)
    if (images.length) await ins("product_images", images)
  } else if (type === "category") {
    await ins("categories", payload.category as Record<string, unknown>)
    const productIds = (payload.productIds ?? []) as string[]
    if (productIds.length) {
      const { error } = await sb.from("products").update({ category_id: id }).in("id", productIds)
      if (error) err(error)
    }
  } else {
    await ins(type === "coupon" ? "coupons" : "reviews", payload[type] as Record<string, unknown>)
  }
  await sb.from("archive").delete().eq("id", archiveId)
}

export async function purgeExpiredArchive(): Promise<void> {
  const { error } = await service()
    .from("archive")
    .delete()
    .lt("purge_at", new Date().toISOString())
  if (error) err(error)
}

/* ── TOTP 2FA ── */

export async function getTotpState(): Promise<{ confirmed: boolean }> {
  const { data, error } = await service()
    .from("admin_totp")
    .select("confirmed")
    .eq("id", 1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return { confirmed: Boolean(data?.confirmed) }
}

export async function setupTotp(): Promise<{ secret: string; uri: string }> {
  const sb = service()
  const { data: row, error } = await sb.from("admin_totp").select("confirmed").eq("id", 1).maybeSingle()
  if (error) err(error)
  if (row?.confirmed) throw new Error("2FA already enabled — disable it first")
  const secret = generateSecret()
  const account = (process.env.ADMIN_EMAIL ?? "admin").trim().toLowerCase()
  const { error: upErr } = await sb
    .from("admin_totp")
    .update({ secret_encrypted: encryptSecret(secret), confirmed: false, updated_at: new Date().toISOString() })
    .eq("id", 1)
  if (upErr) err(upErr)
  return { secret, uri: otpauthUri(account, secret) }
}

export async function confirmTotp(code: string): Promise<string[]> {
  const sb = service()
  const { data: row, error } = await sb
    .from("admin_totp")
    .select("secret_encrypted,confirmed")
    .eq("id", 1)
    .maybeSingle()
  if (error) err(error)
  if (!row?.secret_encrypted || row.confirmed) throw new Error("Run setup first")
  const secret = decryptSecret(String(row.secret_encrypted))
  if (!totpVerify(secret, code)) throw new Error("Wrong code — try again")
  const { plain, hashed } = newBackupCodes()
  const { error: upErr } = await sb
    .from("admin_totp")
    .update({ confirmed: true, backup_codes: hashed, updated_at: new Date().toISOString() })
    .eq("id", 1)
  if (upErr) err(upErr)
  return plain
}

export async function disableTotp(code: string): Promise<void> {
  const ok = await verifyTotpCode(code, { consume: false })
  if (!ok) throw new Error("Wrong code")
  const { error } = await service()
    .from("admin_totp")
    .update({ secret_encrypted: "", confirmed: false, backup_codes: [], updated_at: new Date().toISOString() })
    .eq("id", 1)
  if (error) err(error)
}

/** Login gate: verifies a TOTP code or a backup code (backups are consumed). */
export async function verifyTotpCode(code: string, opts: { consume?: boolean } = {}): Promise<boolean> {
  const sb = service()
  const { data: row, error } = await sb
    .from("admin_totp")
    .select("secret_encrypted,confirmed,backup_codes")
    .eq("id", 1)
    .maybeSingle()
  if (error || !row?.confirmed) return false
  try {
    const secret = decryptSecret(String(row.secret_encrypted))
    if (totpVerify(secret, code)) return true
  } catch {
    return false
  }
  const hashed = hashBackup(code)
  const codes = (row.backup_codes ?? []) as string[]
  if (!codes.includes(hashed)) return false
  if (opts.consume !== false) {
    const rest = codes.filter((c) => c !== hashed)
    await sb.from("admin_totp").update({ backup_codes: rest }).eq("id", 1)
  }
  return true
}
