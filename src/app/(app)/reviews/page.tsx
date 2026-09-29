import { PageHeader, ContentSection } from "@/components/layout"
import { ReviewsTable } from "@/components/list-tables"
import { AddReview } from "@/components/reviews/AddReview"
import { listProducts, listReviews } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Product, Review } from "@/lib/types"

export const metadata = { title: "Reviews", robots: { index: false, follow: false } }

export default async function ReviewsPage() {
  await requireAdmin()
  const [reviews, products] = await Promise.all([
    listReviews(200).catch(() => [] as Review[]),
    listProducts().catch(() => [] as Product[]),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description={`${reviews.length} total`} />

      <ContentSection title="Add a review manually" description="For offline feedback or test data.">
        <AddReview products={products.map((p) => ({ id: p.id, title: p.title }))} />
      </ContentSection>

      <ReviewsTable reviews={reviews} />
    </div>
  )
}
