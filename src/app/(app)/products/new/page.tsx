import { ContentSection, PageHeader } from "@/components/layout"
import { ProductForm } from "@/components/products/ProductForm"
import { listCategories } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Category } from "@/lib/types"

export const metadata = { title: "New product", robots: { index: false, follow: false } }

export default async function NewProductPage() {
  await requireAdmin()
  const categories = await listCategories().catch(() => [] as Category[])

  return (
    <div className="space-y-6">
      <PageHeader title="New product" description="Catalogue entry — variants and images come next." />
      <ContentSection title="Details" description="Name it, place it, describe it.">
        <ProductForm categories={categories} />
      </ContentSection>
    </div>
  )
}
