"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge, ConfirmDelete, EmptyState } from "@/components/display"
import { useToast } from "@/components/feedback"
import { purgeArchiveAction, restoreArchiveAction } from "@/app/(app)/actions"
import { dateTime } from "@/lib/format"
import type { ArchiveItem } from "@/lib/types"

const label = (it: ArchiveItem): string => {
  const p = it.payload as Record<string, Record<string, unknown> | undefined>
  const text = (v: unknown) => (typeof v === "string" ? v : "")
  return (
    text(p.product?.title) ||
    text(p.category?.name) ||
    text(p.coupon?.code) ||
    (p.review ? `review ${String(p.review.id ?? "").slice(0, 8)}` : it.entityId.slice(0, 8))
  )
}

export function ArchiveSection({ items }: { items: ArchiveItem[] }) {
  const push = useToast()
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [confirmPurge, setConfirmPurge] = useState(false)

  const run = async (
    id: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
    after?: () => void,
  ) => {
    setPending(id)
    const res = await fn()
    setPending(null)
    push(res.ok, res.ok ? okMsg : (res.error ?? "Couldn't do that"))
    if (res.ok) router.refresh()
    after?.()
  }

  if (!items.length) {
    return <EmptyState title="Archive is empty" hint="Deleted products, categories, coupons and reviews wait here for 7 days before purging." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-faint">
          {items.length} item{items.length === 1 ? "" : "s"} · restore within 7 days
        </p>
        <button
          type="button"
          onClick={() => setConfirmPurge(true)}
          className="inline-flex h-9 items-center rounded-control border border-line px-3 text-sm transition hover:border-ink"
        >
          Purge expired
        </button>
      </div>

      <ul className="divide-y divide-line rounded-card border border-line">
        {items.map((it) => (
          <li key={it.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <Badge tone="neutral">{it.entityType}</Badge>
            <span className="min-w-40 flex-1 truncate text-sm font-medium">{label(it)}</span>
            <span className="whitespace-nowrap text-xs text-faint">deleted {dateTime(it.createdAt)}</span>
            <span className="whitespace-nowrap text-xs text-faint">purges {dateTime(it.purgeAt)}</span>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => run(it.id, () => restoreArchiveAction(it.id), "Restored ✓")}
              className="inline-flex h-8 items-center rounded-control border border-line px-3 text-sm transition hover:border-ink disabled:opacity-50"
            >
              {pending === it.id ? "Restoring…" : "Restore"}
            </button>
          </li>
        ))}
      </ul>

      {confirmPurge && (
        <ConfirmDelete
          what="expired archive items"
          pending={pending === "purge"}
          onClose={() => setConfirmPurge(false)}
          onConfirm={() =>
            run("purge", () => purgeArchiveAction(), "Expired items purged", () => setConfirmPurge(false))
          }
        />
      )}
    </div>
  )
}
