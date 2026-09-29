/** Domain types — backend-agnostic (Supabase today, any API via lib/api). */

export interface Product {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string | null
  brand: "apple" | "samsung" | "accessory"
  collection: "iphone" | "samsung" | "accessories"
  tags: string[]
  colors: string[]
  badges: string
  rating: number
  reviewCount: number
  categoryId: string | null
  categoryHandle: string
  images: { id: string; url: string; position: number }[]
  variants: Variant[]
}

export interface Variant {
  id: string
  title: string
  sku: string
  priceInr: number
  priceUsd: number
  stock: number
  options: Record<string, string>
}

export interface OrderItem {
  title?: string
  variant?: string
  variant_id?: string
  qty?: number
  price?: number
}

export type OrderState = "new" | "packing" | "shipped" | "delivered" | "returned"

export interface Order {
  id: string
  email: string
  name: string
  phone: string
  address: Record<string, string>
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
  paymentMethod: "razorpay" | "cod" | "manual"
  state: OrderState | ""
  couponCode: string
  discount: number
  invoiceNo: number | null
  notes: string
  razorpayOrderId: string
  razorpayPaymentId: string
  createdAt: string
}

export interface OrderQuery {
  status?: string
  state?: string
  method?: string
  q?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface Review {
  id: string
  productId: string
  productTitle?: string
  name: string
  rating: number
  title: string
  body: string
  reply: string | null
  repliedAt: string | null
  status: "pending" | "approved" | "hidden"
  createdAt: string
}

export interface Category {
  id: string
  name: string
  handle: string
  description: string
  productCount?: number
}

export type CouponType = "percent" | "fixed" | "bogo" | "free_shipping"

export interface Coupon {
  id: string
  code: string
  type: CouponType
  percent: number
  amount: number
  active: boolean
  minSubtotal: number
  maxDiscount: number
  appliesTo: "all" | "products" | "categories"
  productIds: string[]
  categoryIds: string[]
  states: string[]
  startsAt: string | null
  endsAt: string | null
  maxRedemptions: number
  perUserLimit: number
  redemptionsUsed: number
  bogoBuyQty: number
  bogoGetQty: number
  createdAt: string
}

export interface Customer {
  id: string
  email: string
  name: string
  phone: string
  tags: string[]
  notes: string
  marketingOptIn: boolean
  orders: number
  revenue: number
  lastOrderAt: string | null
  createdAt: string
}

export interface Subscriber {
  id: string
  email: string
  source: string
  tags: string[]
  unsubscribed: boolean
  createdAt: string
}

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  href: string
  readAt: string | null
  createdAt: string
}

export interface HomeSection {
  key: string
  title: string
  enabled: boolean
  position: number
  layout: "grid" | "rail" | "banner"
  rule: "manual" | "newest" | "best_seller" | "top_rated" | "category"
  categoryHandle: string
  productIds: string[]
  limitCount: number
  updatedAt: string
}

export interface OptionAxis {
  id: string
  name: string
  values: string[]
  position: number
}

export interface ArchiveItem {
  id: string
  entityType: "product" | "category" | "coupon" | "review"
  entityId: string
  payload: Record<string, unknown>
  purgeAt: string
  createdAt: string
}

export interface DayPoint {
  date: string
  revenue: number
  orders: number
}

export interface DashboardStats {
  products: number
  orders: number
  paidOrders: number
  revenueInr: number
  reviews: number
  /* additive (worker /v1/stats extension) */
  lowStock?: number
  states?: Record<string, number>
  methods?: Record<string, number>
  couponDiscountInr?: number
}

/* site_settings payloads (public read, service-role write) */
export interface AnnouncementMessage {
  text: string
  link?: string
}

export interface AnnouncementSettings {
  enabled: boolean
  pages: string[]
  marquee: boolean
  speed: number
  link: string
  messages: AnnouncementMessage[]
}

export interface PromoSettings {
  enabled: boolean
  image: string
  title: string
  body: string
  cta_label: string
  cta_link: string
  delay: number
}

export interface SocialSettings {
  instagram: string
  x: string
  youtube: string
  linkedin: string
}

export interface BillingProfile {
  legal_name: string
  address_line: string
  city: string
  pincode: string
  gstin: string
  email: string
  phone: string
}

export interface OpsSettings {
  low_stock_threshold: number
}

export interface SiteSettings {
  announcement: AnnouncementSettings | null
  promo: PromoSettings | null
  social: SocialSettings | null
  billing: BillingProfile | null
  ops: OpsSettings | null
}
