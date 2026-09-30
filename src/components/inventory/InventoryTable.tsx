"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Download, SlidersHorizontal } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge, Modal, MoneyDisplay } from "@/components/display"
import { useToast } from "@/components/feedback"
import { Field, NumberInput } from "@/components/forms"
import { SearchSelect } from "@/components/ui/search-select"
import { DataTable } from "@/components/tables"
import { adjustStockAction, bulkAdjustAction } from "@/app/(app)/actions"
import { cn } from "@/lib/cn"
import type { InventoryRow, StockHistoryRow } from "@/lib/types"

const REASONS = ["Restock", "Correction", "Damage", "Return", "Shrinkage"]

function StockAdjust({ row }: { row: InventoryRow }) {
  const push = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [delta, setDelta] = useState("")
  const [reason, setReason] = useState(REASONS[0])

  async function save() {
    const d = Math.trunc(Number(delta))
    if (!d) {
      push(false, "Enter a non-zero amount")
      return
    }
    setPending(true)
    const res = await adjustStockAction(row.id, { delta: d, reason })
    setPending(false)
    if (res.ok) {
      push(true, `Stock updated · ${row.title} is now ${Math.max(0, row.qty + d)}`)
      setOpen(false)
      setDelta("")
      router.refresh()
    } else {
      push(false, res.error ?? "Couldn't update stock")
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Adjust stock for ${row.productTitle} ${row.title}`}
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-control border border-line text-faint transition hover:border-ink hover:text-ink"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <Modal title="Adjust stock" onClose={() => setOpen(false)}>
          <p className="text-sm text-faint">
            <span className="font-medium text-ink">{row.productTitle}</span>
            {" · "}
            {row.title}
            {row.sku && <> · SKU {row.sku}</>}
            <br />
            Currently in stock: <span className="font-medium text-ink tabular-nums">{row.qty}</span>
          </p>
          <div className="mt-4 grid gap-3">
            <Field label="Change by" htmlFor="adj-delta" required hint="Negative removes units">
              <NumberInput
                id="adj-delta"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="+5 or -2"
                min={-1_000_000}
                max={1_000_000}
                autoFocus
              />
            </Field>
            <Field label="Reason" htmlFor="adj-reason" required>
              <SearchSelect
                id="adj-reason"
                ariaLabel="Reason"
                value={reason}
                onChange={setReason}
                options={REASONS.map((r) => ({ value: r, label: r }))}
              />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="label h-10 rounded-control border border-line px-4 transition hover:border-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="label h-10 rounded-control bg-ink px-4 text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save adjustment"}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function BulkAdjust({ ids, done }: { ids: string[]; done: () => void }) {
  const push = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [delta, setDelta] = useState("")
  const [reason, setReason] = useState(REASONS[0])

  async function save() {
    const d = Math.trunc(Number(delta))
    if (!d) {
      push(false, "Enter a non-zero amount")
      return
    }
    setPending(true)
    const res = await bulkAdjustAction(ids, { delta: d, reason })
    setPending(false)
    if (res.ok) {
      push(true, `Adjusted ${ids.length} variant${ids.length === 1 ? "" : "s"} · ${d > 0 ? "+" : ""}${d} each`)
      setOpen(false)
      setDelta("")
      done()
      router.refresh()
    } else {
      push(false, res.error ?? "Couldn't adjust stock")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="label h-8 rounded-control bg-ink px-3 text-paper transition hover:opacity-90"
      >
        Adjust {ids.length} selected…
      </button>
      {open && (
        <Modal title={`Bulk adjust · ${ids.length} variants`} onClose={() => setOpen(false)}>
          <p className="text-sm text-faint">
            The same change is applied to every selected variant. Each one is recorded in stock history.
          </p>
          <div className="mt-4 grid gap-3">
            <Field label="Change by" htmlFor="bulk-delta" required hint="Negative removes units">
              <NumberInput
                id="bulk-delta"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="+5 or -2"
                min={-1_000_000}
                max={1_000_000}
                autoFocus
              />
            </Field>
            <Field label="Reason" htmlFor="bulk-reason" required>
              <SearchSelect
                id="bulk-reason"
                ariaLabel="Reason"
                value={reason}
                onChange={setReason}
                options={REASONS.map((r) => ({ value: r, label: r }))}
              />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="label h-10 rounded-control border border-line px-4 transition hover:border-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="label h-10 rounded-control bg-ink px-4 text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Applying…" : `Apply to ${ids.length} variant${ids.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

type Filter = "all" | "low" | "out" | "ok"

export function InventoryTable({
  rows,
  threshold,
  history,
}: {
  rows: InventoryRow[]
  threshold: number
  history: StockHistoryRow[]
}) {
  const [filter, setFilter] = useState<Filter>("all")
  const sp = useSearchParams()
  const q = sp.get("q") ?? ""

  const counts = useMemo(
    () => ({
      all: rows.length,
      out: rows.filter((r) => r.state === "out").length,
      low: rows.filter((r) => r.state === "low").length,
      ok: rows.filter((r) => r.state === "ok").length,
    }),
    [rows],
  )

  const filtered0 = filter === "all" ? rows : rows.filter((r) => r.state === filter)
  const qt = q.trim().toLowerCase()
  const inQuery = (r: InventoryRow) =>
    !qt || [r.productTitle, r.sku, r.title].some((k) => k.toLowerCase().includes(qt))
  const filtered = filtered0.filter(inQuery)
  const filteredUnits = filtered.reduce((s, r) => s + r.qty, 0)
  const filteredValue = filtered.reduce((s, r) => s + r.qty * r.price, 0)

  const exportHref = `/api/inventory/export?${new URLSearchParams({
    ...(filter !== "all" ? { state: filter } : {}),
    ...(q ? { q } : {}),
  }).toString()}`

  const columns: ColumnDef<InventoryRow, unknown>[] = [
    {
      id: "select",
      enableSorting: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          aria-label="Select all rows"
          className="size-4 accent-ink"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          aria-label={`Select ${row.original.productTitle} ${row.original.title}`}
          className="size-4 accent-ink"
        />
      ),
    },
    {
      accessorKey: "productTitle",
      header: "Product",
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link href={`/products/${row.original.productId}`} className="block truncate font-medium hover:underline">
            {row.original.productTitle}
          </Link>
          <span className="block truncate text-xs text-faint">
            {row.original.title}
            {Object.values(row.original.options).length > 0 && ` · ${Object.values(row.original.options).join(" · ")}`}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="text-faint">{row.original.sku || "—"}</span>,
    },
    {
      accessorKey: "qty",
      header: "Stock",
      cell: ({ row }) =>
        row.original.state === "out" ? (
          <Badge tone="bad">Out</Badge>
        ) : row.original.state === "low" ? (
          <Badge tone="warn">{row.original.qty} left</Badge>
        ) : (
          <span className="tabular-nums">{row.original.qty}</span>
        ),
    },
    {
      id: "value",
      enableSorting: false,
      header: "Value",
      cell: ({ row }) => (
        <span className="tabular-nums text-faint">
          <MoneyDisplay amount={row.original.qty * row.original.price} />
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => <StockAdjust row={row.original} />,
    },
  ]

  const chip = (value: Filter, label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={filter === value}
      onClick={() => setFilter(value)}
      className={`label rounded-full border px-3 py-1.5 transition ${
        filter === value ? "border-ink bg-ink text-paper" : "border-line text-faint hover:border-ink hover:text-ink"
      }`}
    >
      {label} <span className="tabular-nums">{counts[value]}</span>
    </button>
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by stock state">
        {chip("all", "All")}
        {chip("out", "Out")}
        {chip("low", `Low (<${threshold})`)}
        {chip("ok", "Healthy")}
        <a
          href={exportHref}
          className="label ml-auto inline-flex h-8 items-center gap-2 rounded-control border border-line px-3 text-faint transition hover:border-ink hover:text-ink"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export CSV
        </a>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-faint" aria-live="polite">
        <span>
          <span className="tabular-nums text-ink">{filteredUnits.toLocaleString("en-IN")}</span> units in view
        </span>
        <span>
          <span className="tabular-nums text-ink">
            <MoneyDisplay amount={filteredValue} />
          </span>{" "}
          stock value
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchKeys={["productTitle", "sku", "title"]}
        bulkActions={(ids, reset) => <BulkAdjust ids={ids} done={reset} />}
        emptyTitle="No variants match"
        emptyHint="Try another filter or clear the search."
      />

      <section aria-label="Stock history" className="mt-6 rounded-card border border-line bg-paper p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-bold">Stock history</h2>
          {history.length > 0 && <span className="label text-faint">latest {history.length}</span>}
        </div>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-faint">No adjustments recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{h.productTitle}</span>{" "}
                  <span className="text-faint">{h.variantTitle}</span>
                  <span className="block text-xs text-faint">
                    {h.reason} · {h.actor}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <time
                    suppressHydrationWarning
                    dateTime={h.createdAt}
                    className="text-xs tabular-nums text-faint"
                  >
                    {new Date(h.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                  <span
                    className={cn(
                      "w-12 text-right font-medium tabular-nums",
                      h.delta >= 0 ? "text-ok" : "text-bad",
                    )}
                  >
                    {h.delta >= 0 ? "+" : ""}
                    {h.delta}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
