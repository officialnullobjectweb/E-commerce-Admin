import Link from "next/link"
import { Download } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { CustomersTable } from "@/components/list-tables"
import { listCustomers } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Customer } from "@/lib/types"

export const metadata = { title: "Customers", robots: { index: false, follow: false } }

export default async function CustomersPage() {
  await requireAdmin()
  const customers = await listCustomers().catch(() => [] as Customer[])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Derived from order history · sorted by paid revenue"
        actions={
          <Link
            href="/api/customers/export"
            className="label inline-flex h-10 items-center gap-2 rounded-control border border-line px-3.5 transition hover:border-ink"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </Link>
        }
      />
      <CustomersTable customers={customers} />
    </div>
  )
}
