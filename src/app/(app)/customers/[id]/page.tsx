import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge, MoneyDisplay } from "@/components/display"
import { CustomerForm } from "@/components/customers/CustomerForm"
import { Breadcrumbs, ContentSection, PageHeader } from "@/components/layout"
import { dateTime } from "@/lib/format"
import { getCustomer, listOrdersForCustomer } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Customer", robots: { index: false, follow: false } }

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()
  const orders = await listOrdersForCustomer(customer.email).catch(() => [])

  const stats: { label: string; value: React.ReactNode }[] = [
    { label: "Orders", value: customer.orders },
    { label: "Paid revenue", value: <MoneyDisplay amount={customer.revenue} /> },
    { label: "Last order", value: dateTime(customer.lastOrderAt) },
    { label: "Customer since", value: dateTime(customer.createdAt) },
  ]

  return (
    <div className="space-y-6">
      <Breadcrumbs trail={[{ label: "Customers", href: "/customers" }, { label: customer.email }]} />
      <PageHeader
        title={customer.name || customer.email}
        description={customer.name ? customer.email : "No name recorded"}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            {customer.tags.map((t) => (
              <span key={t} className="label rounded-full border border-line px-3 py-1.5 text-faint">
                {t}
              </span>
            ))}
            <Badge tone={customer.marketingOptIn ? "ok" : "neutral"}>
              {customer.marketingOptIn ? "marketing: on" : "marketing: off"}
            </Badge>
            <a
              href={`mailto:${customer.email}`}
              className="label inline-flex h-9 items-center rounded-control border border-line px-3.5 transition hover:border-ink"
            >
              Email
            </a>
          </span>
        }
      />

      <ContentSection title="Overview">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="label text-faint">{s.label}</dt>
              <dd className="mt-1 font-medium tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        {customer.phone && (
          <p className="mt-4 text-sm text-faint">
            <span className="label mr-2">Phone</span>
            {customer.phone}
          </p>
        )}
      </ContentSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <ContentSection title={`Order history (${orders.length})`}>
          {orders.length === 0 ? (
            <p className="text-sm text-faint">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/orders/${o.id}`} className="font-mono text-xs hover:underline">
                      {o.id.slice(0, 8)}
                    </Link>
                    <span className="ml-2 text-faint">{dateTime(o.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <Badge tone={o.status === "paid" ? "ok" : o.status === "pending" ? "warn" : "bad"}>
                      {o.status}
                    </Badge>
                    <MoneyDisplay amount={o.total} />
                    <Link href={`/orders/${o.id}`} className="label text-faint transition hover:text-ink">
                      View →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ContentSection>

        <ContentSection title="Edit profile">
          <CustomerForm
            key={`${customer.name}|${customer.phone}|${customer.tags.join(",")}|${customer.notes}|${customer.marketingOptIn}`}
            customer={customer}
          />
        </ContentSection>
      </div>
    </div>
  )
}
