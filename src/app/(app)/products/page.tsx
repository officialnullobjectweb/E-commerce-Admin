import Link from "next/link"
import { PageHeader } from "@/components/layout"
import { ProductsTable } from "@/components/list-tables"
import { listProducts } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Product } from "@/lib/types"

export const metadata = { title: "Products", robots: { index: false, follow: false } }

export default async function ProductsPage() {
  await requireAdmin()
  const products = await listProducts().catch(() => [] as Product[])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${products.length} in catalog`}
        actions={
          <Link
            href="/products/new"
            className="inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85"
          >
            + New product
          </Link>
        }
      />
      <ProductsTable products={products} />
    </div>
  )
}
