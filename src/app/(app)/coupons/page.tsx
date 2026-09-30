import { PageHeader, Disclosure } from "@/components/layout"
import { CouponsTable } from "@/components/list-tables"
import { CouponForm } from "@/components/coupons/CouponForm"
import { listCoupons } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { Coupon } from "@/lib/types"

export const metadata = { title: "Coupons", robots: { index: false, follow: false } }

export default async function CouponsPage() {
  await requireAdmin()
  const coupons = await listCoupons().catch(() => [] as Coupon[])

  return (
    <div className="space-y-6">
      <PageHeader title="Coupons" description={`${coupons.length} total · validated at checkout`} />

      <Disclosure title="New coupon" description="Codes are letters + digits, applied at checkout." open={coupons.length === 0}>
        <CouponForm />
      </Disclosure>

      <CouponsTable coupons={coupons} />
    </div>
  )
}
