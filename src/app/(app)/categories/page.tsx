import { PageHeader, ContentSection } from "@/components/layout"
import { CategoriesTable } from "@/components/list-tables"
import { CategoryForm } from "@/components/categories/CategoryForm"
import { OptionAxes } from "@/components/categories/OptionAxes"
import { listCategories, listOptionAxes } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Category } from "@/lib/types"

export const metadata = { title: "Categories", robots: { index: false, follow: false } }

export default async function CategoriesPage() {
  await requireAdmin()
  const [categories, axes] = await Promise.all([
    listCategories().catch(() => [] as Category[]),
    listOptionAxes().catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description={`${categories.length} collections · ${axes.length} option axes`} />

      <ContentSection title="New category" description="Group products for the storefront.">
        <CategoryForm />
      </ContentSection>

      <CategoriesTable categories={categories} />

      <ContentSection
        title="Option axes"
        description="Size, Colour, Material… variants pick their values from these on each product."
      >
        <OptionAxes axes={axes} />
      </ContentSection>
    </div>
  )
}
