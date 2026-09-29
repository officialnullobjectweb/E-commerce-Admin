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
      />
      <CustomersTable customers={customers} />
    </div>
  )
}
