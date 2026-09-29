"use client"

import Image from "next/image"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge, MoneyDisplay } from "@/components/display"
import { DataTable } from "@/components/tables"
import { BulkDeleteButton } from "@/components/products/BulkDelete"
import { CategoryActions } from "@/components/categories/CategoryActions"
import { CouponActions } from "@/components/coupons/CouponActions"
import { ReviewActions } from "@/components/reviews/ReviewActions"
import { dateTime } from "@/lib/format"
import type { Category, Coupon, Customer, Order, Product, Review } from "@/lib/types"

/* Columns live client-side: render functions can't cross the RSC boundary. */

const stockOf = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0)
const priceOf = (p: Product) =>
  p.variants.length ? Math.min(...p.variants.map((v) => v.priceInr)) : null

export function ProductsTable({ products }: { products: Product[] }) {
  const columns: ColumnDef<Product, unknown>[] = [
    {
      id: "image",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.thumbnail ? (
          <Image
            src={row.original.thumbnail}
            alt=""
            width={40}
            height={52}
            className="h-13 w-10 rounded-md border border-line object-cover"
          />
        ) : (
          <span aria-hidden="true" className="grid h-13 w-10 place-items-center rounded-md border border-dashed border-line text-faint">—</span>
        ),
    },
    {
      accessorKey: "title",
      header: "Product",
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link href={`/products/${row.original.id}`} className="block truncate font-medium hover:underline">
            {row.original.title}
          </Link>
          <span className="block truncate text-xs text-faint">/{row.original.handle}</span>
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex flex-wrap gap-1">
          <Badge tone="neutral">{row.original.collection}</Badge>
          <Badge tone="ink">{row.original.brand}</Badge>
          {row.original.badges && <Badge tone="warn">{row.original.badges}</Badge>}
        </span>
      ),
    },
    {
      id: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const s = stockOf(row.original)
        return <Badge tone={s === 0 ? "bad" : s < 10 ? "warn" : "ok"}>{s}</Badge>
      },
    },
    {
      id: "price",
      header: "From",
      cell: ({ row }) => <MoneyDisplay amount={priceOf(row.original)} />,
    },
    {
      id: "variants",
      header: "Variants",
      cell: ({ row }) => <span className="tabular-nums">{row.original.variants.length}</span>,
    },
    {
      id: "edit",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Link href={`/products/${row.original.id}`} className="label text-faint transition hover:text-ink">
          Edit →
        </Link>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={products}
      searchKeys={["title", "handle", "collection", "brand"]}
      bulkActions={(ids, reset) => <BulkDeleteButton ids={ids} reset={reset} />}
      emptyTitle="No products yet"
      emptyHint="Create your first product to start selling."
      emptyAction={
        <Link
          href="/products/new"
          className="inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85"
        >
          + New product
        </Link>
      }
    />
  )
}

export function OrdersTable({ orders, status }: { orders: Order[]; status: string }) {
  const columns: ColumnDef<Order, unknown>[] = [
    {
      accessorKey: "id",
      header: "Order",
      cell: ({ row }) => (
        <Link href={`/orders/${row.original.id}`} className="font-mono text-xs hover:underline">
          {row.original.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{row.original.name || "—"}</span>
          <span className="block truncate text-xs text-faint">{row.original.email}</span>
        </div>
      ),
    },
    {
      id: "items",
      header: "Items",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {(row.original.items ?? []).reduce((s, i) => s + (i.qty ?? 0), 0)}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => <MoneyDisplay amount={row.original.total} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge tone={row.original.status === "paid" ? "ok" : row.original.status === "pending" ? "warn" : "bad"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Placed",
      cell: ({ row }) => <span className="whitespace-nowrap text-faint">{dateTime(row.original.createdAt)}</span>,
    },
    {
      id: "open",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Link href={`/orders/${row.original.id}`} className="label text-faint transition hover:text-ink">
          Open →
        </Link>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={orders}
      searchKeys={["id", "email", "name", "status"]}
      emptyTitle="No orders here"
      emptyHint={status ? "Try another status filter." : "Paid checkouts will appear here."}
      emptyAction={
        status ? (
          <Link href="/orders" className="label rounded-control border border-line px-4 py-2.5 transition hover:border-ink">
            Clear filter
          </Link>
        ) : undefined
      }
    />
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5 stars`} className="whitespace-nowrap text-amber-500">
      {"★".repeat(n)}
      <span className="text-faint">{"☆".repeat(5 - n)}</span>
    </span>
  )
}

export function ReviewsTable({ reviews }: { reviews: Review[] }) {
  const columns: ColumnDef<Review, unknown>[] = [
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => <Stars n={row.original.rating} />,
    },
    {
      id: "review",
      header: "Review",
      cell: ({ row }) => (
        <div className="min-w-0 max-w-md">
          {row.original.title && <p className="truncate font-medium">{row.original.title}</p>}
          <p className="line-clamp-2 text-xs text-faint">{row.original.body}</p>
          {row.original.reply && (
            <p className="mt-1 line-clamp-1 text-xs text-ok">
              <span className="label">replied:</span> {row.original.reply}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "productTitle",
      header: "Product",
      cell: ({ row }) => <span className="truncate text-faint">{row.original.productTitle ?? "—"}</span>,
    },
    {
      accessorKey: "name",
      header: "By",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          tone={
            row.original.status === "approved"
              ? "ok"
              : row.original.status === "pending"
                ? "warn"
                : "neutral"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => <span className="whitespace-nowrap text-faint">{dateTime(row.original.createdAt)}</span>,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => <ReviewActions review={row.original} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={reviews}
      searchKeys={["name", "title", "body", "productTitle"]}
      emptyTitle="No reviews yet"
      emptyHint="Customer reviews from the storefront land here."
    />
  )
}

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const columns: ColumnDef<Category, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "handle",
      header: "Handle",
      cell: ({ row }) => <span className="font-mono text-xs text-faint">/{row.original.handle}</span>,
    },
    {
      id: "count",
      header: "Products",
      cell: ({ row }) => <span className="tabular-nums">{row.original.productCount ?? 0}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-md text-faint">{row.original.description || "—"}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => <CategoryActions category={row.original} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={categories}
      searchKeys={["name", "handle", "description"]}
      emptyTitle="No categories yet"
      emptyHint="Create one above."
    />
  )
}

export function CouponsTable({ coupons }: { coupons: Coupon[] }) {
  const discountLabel = (c: Coupon) =>
    c.type === "percent"
      ? `${c.percent}%`
      : c.type === "fixed"
        ? `₹${c.amount}`
        : c.type === "bogo"
          ? `Buy ${c.bogoBuyQty} get ${c.bogoGetQty}`
          : "Free shipping"
  const columns: ColumnDef<Coupon, unknown>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span>,
    },
    {
      id: "discount",
      header: "Discount",
      cell: ({ row }) => <span className="tabular-nums whitespace-nowrap">{discountLabel(row.original)}</span>,
    },
    {
      id: "usage",
      header: "Usage",
      cell: ({ row }) => (
        <span className="tabular-nums whitespace-nowrap text-faint">
          {row.original.redemptionsUsed}
          {row.original.maxRedemptions > 0 ? ` / ${row.original.maxRedemptions}` : ""}
        </span>
      ),
    },
    {
      accessorKey: "active",
      header: "State",
      cell: ({ row }) =>
        row.original.active ? <Badge tone="ok">active</Badge> : <Badge tone="neutral">paused</Badge>,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => <span className="whitespace-nowrap text-faint">{dateTime(row.original.createdAt)}</span>,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => <CouponActions coupon={row.original} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={coupons}
      searchKeys={["code"]}
      emptyTitle="No coupons yet"
      emptyHint="Create one above — REUSE10 style codes."
    />
  )
}

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const data = customers
  const columns: ColumnDef<Customer, unknown>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <Link href={`/customers/${row.original.id}`} className="block min-w-0 hover:underline">
          <span className="block truncate font-medium">{row.original.name || row.original.email}</span>
          <span className="block truncate text-xs text-faint">{row.original.email}</span>
        </Link>
      ),
    },
    {
      accessorKey: "orders",
      header: "Orders",
      cell: ({ row }) => <span className="tabular-nums">{row.original.orders}</span>,
    },
    {
      accessorKey: "revenue",
      header: "Paid revenue",
      cell: ({ row }) => <MoneyDisplay amount={row.original.revenue} />,
    },
    {
      accessorKey: "lastOrderAt",
      header: "Last order",
      cell: ({ row }) => <span className="whitespace-nowrap text-faint">{dateTime(row.original.lastOrderAt)}</span>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKeys={["name", "email"]}
      emptyTitle="No customers yet"
      emptyHint="Anyone who orders shows up here automatically."
    />
  )
}
