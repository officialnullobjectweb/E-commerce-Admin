"use client"

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"
import { useDebounce } from "@/hooks/useDebounce"

/**
 * DataTable — TanStack-powered: sorting (aria-sort), pagination,
 * row selection with bulk bar, empty state. Search / sort / page live
 * in the URL (?q=&sort=id.desc&page=2) so views survive refresh and
 * are shareable; row selection stays in-memory.
 */
export function DataTable<T extends { id: string }>({
  columns,
  data,
  searchKeys,
  bulkActions,
  pageSize = 15,
  emptyTitle,
  emptyHint,
  emptyAction,
}: {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  searchKeys?: (keyof T)[]
  bulkActions?: (ids: string[], reset: () => void) => React.ReactNode
  pageSize?: number
  emptyTitle: string
  emptyHint?: string
  emptyAction?: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const urlQ = sp.get("q") ?? ""
  const urlSort = sp.get("sort") ?? ""
  const urlPage = Math.max(1, Number(sp.get("page") || "1") || 1)

  const [query, setQuery] = useState(urlQ)
  const debounced = useDebounce(query, 300)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== "page") next.delete("page")
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // URL → input (back/forward, direct paste); input → URL (debounced)
  useEffect(() => setQuery(urlQ), [urlQ])
  useEffect(() => {
    if (debounced.trim() !== urlQ.trim()) setParam("q", debounced.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const sorting: SortingState = (() => {
    if (!urlSort) return []
    const [id, dir] = urlSort.split(".")
    return id ? [{ id, desc: dir === "desc" }] : []
  })()

  const query_trim = query.trim().toLowerCase()
  const filtered = query_trim
    ? data.filter((row) =>
        (searchKeys ?? []).some((k) => String(row[k] ?? "").toLowerCase().includes(query_trim))
      )
    : data

  const table = useReactTable({
    data: filtered,
    columns,
    state: {
      sorting,
      pagination: { pageIndex: urlPage - 1, pageSize },
      rowSelection,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      setParam("sort", next[0] ? `${next[0].id}.${next[0].desc ? "desc" : "asc"}` : "")
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex: urlPage - 1, pageSize }) : updater
      setParam("page", next.pageIndex > 0 ? String(next.pageIndex + 1) : "")
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  })

  const selected = table.getFilteredSelectedRowModel().rows.map((r) => r.original.id)
  const reset = () => table.resetRowSelection()

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this list…"
          aria-label="Search this list"
          className="h-11 w-full max-w-xs rounded-control border border-line bg-transparent px-3 text-sm placeholder:text-faint/70 focus:border-ink focus:outline-none"
        />
      </div>

      {selected.length > 0 && bulkActions && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-control border border-ink bg-wash px-4 py-2.5">
          <span className="text-sm font-medium">
            {selected.length} selected
          </span>
          {bulkActions(selected, reset)}
          <button type="button" onClick={reset} className="label ml-auto text-faint transition hover:text-ink">
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line bg-wash/60">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    aria-sort={
                      h.column.getIsSorted() === "asc"
                        ? "ascending"
                        : h.column.getIsSorted() === "desc"
                        ? "descending"
                        : undefined
                    }
                    className="px-4 py-3 text-left align-middle"
                  >
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="label inline-flex items-center gap-1 text-faint transition hover:text-ink"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <span aria-hidden="true">{h.column.getIsSorted() === "asc" ? "↑" : h.column.getIsSorted() === "desc" ? "↓" : "↕"}</span>
                      </button>
                    ) : (
                      <span className="label text-faint">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-line">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={cn("transition hover:bg-wash/70", row.getIsSelected() && "bg-wash")}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center">
                  <p className="font-medium">{emptyTitle}</p>
                  {emptyHint && <p className="mt-1 text-sm text-faint">{emptyHint}</p>}
                  {emptyAction && <div className="mt-4 flex justify-center">{emptyAction}</div>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="label text-faint" aria-live="polite">
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} ·{" "}
          {filtered.length} row{filtered.length === 1 ? "" : "s"}
        </p>
        {table.getPageCount() > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-10 rounded-control border border-line px-4 text-sm transition hover:border-ink disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-10 rounded-control border border-line px-4 text-sm transition hover:border-ink disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
