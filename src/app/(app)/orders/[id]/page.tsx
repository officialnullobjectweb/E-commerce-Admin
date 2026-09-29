import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge, CopyButton, MoneyDisplay } from "@/components/display"
import { Breadcrumbs, ContentSection, PageHeader } from "@/components/layout"
import { StatusSelect } from "@/components/orders/StatusSelect"
import { getOrder } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { dateTime } from "@/lib/format"
import type { Order } from "@/lib/types"

export const metadata = { title: "Order", robots: { index: false, follow: false } }

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()

  const items = order.items ?? []
  const address = Object.entries(order.address ?? {}).filter(([, v]) => String(v ?? "").trim())

  return (
    <div className="space-y-6">
      <Breadcrumbs trail={[{ label: "Orders", href: "/orders" }, { label: order.id.slice(0, 8) }]} />
      <PageHeader
        title={`Order ${order.id.slice(0, 8)}…`}
        description={`Placed ${dateTime(order.createdAt)}`}
        actions={
          <span className="flex items-center gap-3">
            <Badge tone={order.status === "paid" ? "ok" : order.status === "pending" ? "warn" : "bad"}>
              {order.status}
            </Badge>
            <StatusSelect order={order} />
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentSection title="Customer">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="label text-faint">Name</dt>
              <dd className="mt-0.5 font-medium">{order.name || "—"}</dd>
            </div>
            <div>
              <dt className="label text-faint">Email</dt>
              <dd className="mt-0.5 break-all">{order.email || "—"}</dd>
            </div>
            <div>
              <dt className="label text-faint">Phone</dt>
              <dd className="mt-0.5">{order.phone || "—"}</dd>
            </div>
          </dl>
        </ContentSection>

        <ContentSection title="Ship to" className="lg:col-span-2">
          {address.length === 0 ? (
            <p className="text-sm text-faint">No address recorded.</p>
          ) : (
            <address className="not-italic text-sm leading-relaxed">
              {address.map(([k, v]) => (
                <span key={k} className="block">
                  <span className="label mr-2 text-faint">{k}</span>
                  {String(v)}
                </span>
              ))}
            </address>
          )}
        </ContentSection>
      </div>

      <ContentSection title={`Items (${items.length})`}>
        {items.length === 0 ? (
          <p className="text-sm text-faint">No line items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="label py-2 text-left text-faint">Item</th>
                  <th className="label py-2 text-left text-faint">Variant</th>
                  <th className="label py-2 text-right text-faint">Qty</th>
                  <th className="label py-2 text-right text-faint">Price</th>
                  <th className="label py-2 text-right text-faint">Line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((it, i) => (
                  <tr key={`${it.variant_id ?? it.title}-${i}`}>
                    <td className="py-2.5 font-medium">{it.title ?? "—"}</td>
                    <td className="py-2.5 text-faint">{it.variant ?? "—"}</td>
                    <td className="py-2.5 text-right tabular-nums">{it.qty ?? 1}</td>
                    <td className="py-2.5 text-right">
                      <MoneyDisplay amount={it.price ?? 0} />
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      <MoneyDisplay amount={(it.price ?? 0) * (it.qty ?? 1)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-faint">Subtotal</span>
            <MoneyDisplay amount={order.subtotal} />
          </div>
          <div className="flex justify-between">
            <span className="text-faint">Shipping</span>
            <MoneyDisplay amount={order.shipping} />
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <MoneyDisplay amount={order.total} />
          </div>
        </div>
      </ContentSection>

      <ContentSection title="Payment">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="label text-faint">Razorpay order</dt>
            <dd className="flex items-center gap-2 font-mono text-xs">
              <span className="truncate">{order.razorpayOrderId || "—"}</span>
              {order.razorpayOrderId && <CopyButton text={order.razorpayOrderId} label="Copy" />}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="label text-faint">Payment id</dt>
            <dd className="flex items-center gap-2 font-mono text-xs">
              <span className="truncate">{order.razorpayPaymentId || "—"}</span>
              {order.razorpayPaymentId && <CopyButton text={order.razorpayPaymentId} label="Copy" />}
            </dd>
          </div>
        </dl>
        <p className="mt-4">
          <Link href="/orders" className="label text-faint transition hover:text-ink">
            ← Back to orders
          </Link>
        </p>
      </ContentSection>
    </div>
  )
}
