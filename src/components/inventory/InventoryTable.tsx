"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SlidersHorizontal } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge, Modal } from "@/components/display"
import { useToast } from "@/components/feedback"
import { Field, NumberInput, Select } from "@/components/forms"
import { DataTable } from "@/components/tables"
import { adjustStockAction } from "@/app/(app)/actions"
import type { InventoryRow } from "@/lib/types"

const REASONS = ["Restock", "Correction", "Damage", "Return", "Shrinkage"]

function StockAdjust({ row }: { row: InventoryRow }) {
  const push = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [delta, setDelta] = useState("")
  const [reason, setReason] = useState(REASONS[0])

  const optionsStr = Object.values(row.options).join(" · ")

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
              <Select id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
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

type Filter = "all" | "low" | "out" | "ok"

export function InventoryTable({ rows, threshold }: { rows: InventoryRow[]; threshold: number }) {
  const [filter, setFilter] = useState<Filter>("all")

  const counts = useMemo(
    () => ({
      all: rows.length,
      out: rows.filter((r) => r.state === "out").length,
      low: rows.filter((r) => r.state === "low").length,
      ok: rows.filter((r) => r.state === "ok").length,
    }),
    [rows],
  )

  const filtered = filter === "all" ? rows : rows.filter((r) => r.state === filter)

  const columns: ColumnDef<InventoryRow, unknown>[] = [
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
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by stock state">
        {chip("all", "All")}
        {chip("out", "Out")}
        {chip("low", `Low (<${threshold})`)}
        {chip("ok", "Healthy")}
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchKeys={["productTitle", "sku", "title"]}
        emptyTitle="No variants match"
        emptyHint="Try another filter or clear the search."
      />
    </div>
  )
}
