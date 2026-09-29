import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge, MoneyDisplay } from "@/components/display"
import { PrintButton } from "@/components/orders/PrintButton"
import { getOrder } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { dateTime } from "@/lib/format"
import type { Order } from "@/lib/types"

export const metadata = { title: "Invoice", robots: { index: false, follow: false } }

const METHOD_LABEL: Record<Order["paymentMethod"], string> = {
  razorpay: "Razorpay (online)",
  cod: "Cash on delivery",
  manual: "Manual / bank transfer",
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()

  const items = order.items ?? []
  const address = Object.entries(order.address ?? {}).filter(([, v]) => String(v ?? "").trim())
  const paid = order.status === "paid"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/orders/${order.id}`} className="label text-faint transition hover:text-ink">
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <article className="invoice-sheet mx-auto max-w-3xl rounded-card border border-line bg-paper p-6 sm:p-10 print:max-w-none print:rounded-none print:border-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="font-display text-2xl font-extrabold tracking-tight">Flowcase.</p>
            <p className="label mt-1 text-faint">Go with flow</p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-xl font-bold">Invoice</h1>
            <p className="mt-1 font-mono text-sm">
              {order.invoiceNo ? `#${String(order.invoiceNo).padStart(6, "0")}` : "Draft (unnumbered)"}
            </p>
            <p className="label mt-1 text-faint">{dateTime(order.createdAt)}</p>
          </div>
        </header>

        <div className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          <div>
            <p className="label text-faint">Billed to</p>
            <div className="mt-2 space-y-0.5 text-sm">
              <p className="font-medium">{order.name || "—"}</p>
              {order.email && <p className="break-all">{order.email}</p>}
              {order.phone && <p>{order.phone}</p>}
              {address.map(([k, v]) => (
                <p key={k}>
                  <span className="label mr-2 text-faint">{k}</span>
                  {String(v)}
                </p>
              ))}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="label text-faint">Payment</p>
            <div className="mt-2 space-y-1 text-sm">
              <p>{METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
              <p>
                Status:{" "}
                <Badge tone={paid ? "ok" : order.status === "pending" ? "warn" : "bad"}>{order.status}</Badge>
              </p>
              <p className="font-mono text-xs text-faint">{order.id}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto py-6">
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

        <div className="ml-auto max-w-sm space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-faint">Subtotal</span>
            <MoneyDisplay amount={order.subtotal} />
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-faint">
                Discount{order.couponCode ? ` (${order.couponCode})` : ""}
              </span>
              <span className="tabular-nums text-ok">− <MoneyDisplay amount={order.discount} /></span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-faint">Shipping</span>
            <MoneyDisplay amount={order.shipping} />
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <span>Total</span>
            <MoneyDisplay amount={order.total} />
          </div>
        </div>

        <footer className="mt-8 border-t border-line pt-4 text-xs text-faint">
          <p>This is a computer-generated invoice from Flowcase.</p>
          {order.notes && <p className="mt-1">Note: {order.notes}</p>}
        </footer>
      </article>
    </div>
  )
}
