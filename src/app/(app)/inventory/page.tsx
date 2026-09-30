import { PageHeader } from "@/components/layout"
import { InventoryTable } from "@/components/inventory/InventoryTable"
import { listInventory, listStockHistory } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Inventory", robots: { index: false, follow: false } }

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export default async function InventoryPage() {
  await requireAdmin()
  const [{ rows, threshold }, history] = await Promise.all([
    listInventory().catch(() => ({ rows: [], threshold: 10 })),
    listStockHistory(50).catch(() => []),
  ])
  const units = rows.reduce((s, r) => s + r.qty, 0)
  const value = rows.reduce((s, r) => s + r.qty * r.price, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={
          rows.length > 0
            ? `${rows.length} variants · ${units.toLocaleString("en-IN")} units · ${inr.format(value)} stock value · low below ${threshold}`
            : `Low-stock threshold is ${threshold}`
        }
      />
      <InventoryTable rows={rows} threshold={threshold} history={history} />
    </div>
  )
}
