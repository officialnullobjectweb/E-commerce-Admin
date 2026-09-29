import { notFound } from "next/navigation"
import { Breadcrumbs, ContentSection, PageHeader } from "@/components/layout"
import { DeleteProductButton } from "@/components/products/DeleteProduct"
import { ImagesPanel } from "@/components/products/Images"
import { ProductForm } from "@/components/products/ProductForm"
import { VariantsPanel } from "@/components/products/Variants"
import { getProduct, listCategories } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Category, Product } from "@/lib/types"

export const metadata = { title: "Edit product", robots: { index: false, follow: false } }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const [product, categories] = await Promise.all([
    getProduct(id),
    listCategories().catch(() => [] as Category[]),
  ])
  if (!product) notFound()

  return (
    <div className="space-y-6">
      <Breadcrumbs trail={[{ label: "Products", href: "/products" }, { label: product.title }]} />
      <PageHeader
        title={product.title}
        description={`/${product.handle} · ${product.variants.length} variant${product.variants.length === 1 ? "" : "s"} · ${product.images.length} image${product.images.length === 1 ? "" : "s"}`}
        actions={<DeleteProductButton id={product.id} title={product.title} />}
      />

      <ContentSection title="Details" description="Catalogue fields — everything is editable.">
        <ProductForm product={product} categories={categories} />
      </ContentSection>

      <ContentSection
        title="Variants"
        description="Price (INR + USD) and stock per sellable option."
      >
        <VariantsPanel productId={product.id} variants={product.variants} />
      </ContentSection>

      <ContentSection title="Images" description="Gallery order is the storefront order.">
        <ImagesPanel product={product} />
      </ContentSection>
    </div>
  )
}
