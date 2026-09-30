import { PageHeader } from "@/components/layout"
import { InventoryTable } from "@/components/inventory/InventoryTable"
import { listInventory } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Inventory", robots: { index: false, follow: false } }

export default async function InventoryPage() {
  await requireAdmin()
  const { rows, threshold } = await listInventory().catch(() => ({ rows: [], threshold: 10 }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={
          rows.length > 0
            ? `${rows.length} variants · low-stock threshold is ${threshold}`
            : `Low-stock threshold is ${threshold}`
        }
      />
      <InventoryTable rows={rows} threshold={threshold} />
    </div>
  )
}
