import { PageHeader, ContentSection } from "@/components/layout"
import { CategoriesTable } from "@/components/list-tables"
import { CategoryForm } from "@/components/categories/CategoryForm"
import { listCategories } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Category } from "@/lib/types"

export const metadata = { title: "Categories", robots: { index: false, follow: false } }

export default async function CategoriesPage() {
  await requireAdmin()
  const categories = await listCategories().catch(() => [] as Category[])

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description={`${categories.length} collections`} />

      <ContentSection title="New category" description="Group products for the storefront.">
        <CategoryForm />
      </ContentSection>

      <CategoriesTable categories={categories} />
    </div>
  )
}
