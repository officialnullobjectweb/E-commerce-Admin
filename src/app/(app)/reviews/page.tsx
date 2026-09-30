import Link from "next/link"
import { PageHeader, Disclosure } from "@/components/layout"
import { ReviewsTable } from "@/components/list-tables"
import { AddReview } from "@/components/reviews/AddReview"
import { listProducts, listReviews } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Product, Review } from "@/lib/types"

export const metadata = { title: "Reviews", robots: { index: false, follow: false } }

const STATUSES = ["", "pending", "approved", "hidden"] as const

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin()
  const { status: raw } = await searchParams
  const status = (STATUSES as readonly string[]).includes(raw ?? "") ? (raw ?? "") : ""
  const [allReviews, products] = await Promise.all([
    listReviews(200).catch(() => [] as Review[]),
    listProducts().catch(() => [] as Product[]),
  ])
  const reviews = status ? allReviews.filter((r) => r.status === status) : allReviews
  const avg =
    allReviews.length > 0
      ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
      : null
  const pending = allReviews.filter((r) => r.status === "pending").length

  const description = avg
    ? `Avg ${avg}★ · ${pending} pending · ${allReviews.length} total${status ? ` · ${status} only` : ""}`
    : "No reviews yet — customers and manual entries land here."

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description={description} />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = s === status
          return (
            <Link
              key={s || "all"}
              href={s ? `/reviews?status=${s}` : "/reviews"}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "label rounded-full bg-ink px-3.5 py-2 capitalize text-paper"
                  : "label rounded-full border border-line px-3.5 py-2 capitalize text-faint transition hover:border-ink hover:text-ink"
              }
            >
              {s || "all"}
              {s === "pending" && pending > 0 ? ` (${pending})` : ""}
            </Link>
          )
        })}
      </nav>

      <Disclosure title="Add a review manually" description="For offline feedback or test data." open={allReviews.length === 0}>
        <AddReview products={products.map((p) => ({ id: p.id, title: p.title }))} />
      </Disclosure>

      <ReviewsTable reviews={reviews} />
    </div>
  )
}
