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
}

export interface OrderItem {
  title?: string
  variant?: string
  variant_id?: string
  qty?: number
  price?: number
}

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
  razorpayOrderId: string
  razorpayPaymentId: string
  createdAt: string
}

export interface Review {
  id: string
  productId: string
  productTitle?: string
  name: string
  rating: number
  title: string
  body: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  handle: string
  description: string
  productCount?: number
}

export interface Coupon {
  id: string
  code: string
  percent: number
  active: boolean
  createdAt: string
}

export interface Customer {
  email: string
  name: string
  orders: number
  revenue: number
  lastOrderAt: string
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

export interface SiteSettings {
  announcement: AnnouncementSettings | null
  promo: PromoSettings | null
}
