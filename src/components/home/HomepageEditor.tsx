"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { saveHomeSectionAction } from "@/app/(app)/actions"
import { useToast } from "@/components/feedback"
import { Switch, TextInput } from "@/components/forms"
import type { HomeSection } from "@/lib/types"

/** Section keys whose limit_count the storefront actually honours. */
const LIMIT_KEYS = new Set(["best_sellers", "just_landed", "best_rated", "categories", "models"])

type Patch = Parameters<typeof saveHomeSectionAction>[1]

export function HomepageEditor({ sections }: { sections: HomeSection[] }) {
  const [rows, setRows] = useState<HomeSection[]>(() =>
    [...sections].sort((a, b) => a.position - b.position)
  )
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const persist = async (key: string, patch: Patch) => {
    const res = await saveHomeSectionAction(key, patch)
    if (!res.ok) toast(false, res.error ?? "Could not save section")
    return res.ok
  }

  const patchRow = (key: string, patch: Partial<HomeSection>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const toggle = (row: HomeSection) => {
    const enabled = !row.enabled
    patchRow(row.key, { enabled })
    void persist(row.key, { enabled }).then(
      (ok) => ok && toast(true, `${row.title} ${enabled ? "enabled" : "hidden"}`)
    )
  }

  const saveTitle = async (row: HomeSection) => {
    const raw = drafts[row.key] ?? row.title
    const title = raw.trim()
    setDrafts((d) => {
      const { [row.key]: _, ...rest } = d
      return rest
    })
    if (!title || title === row.title) return
    setBusy(true)
    const ok = await persist(row.key, { title })
    if (ok) {
      patchRow(row.key, { title })
      toast(true, "Title saved")
    }
    setBusy(false)
  }

  const saveLimit = async (row: HomeSection, raw: string) => {
    const limitCount = Math.max(1, Math.min(24, Number(raw) || row.limitCount))
    if (limitCount === row.limitCount) return
    setBusy(true)
    const ok = await persist(row.key, { limitCount })
    if (ok) {
      patchRow(row.key, { limitCount })
      toast(true, "Limit saved")
    }
    setBusy(false)
  }

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= rows.length || busy) return
    setBusy(true)
    const a = rows[i]
    const b = rows[j]
    const next = rows.map((r, k) =>
      k === i ? { ...r, position: b.position } : k === j ? { ...r, position: a.position } : r
    )
    next.sort((x, y) => x.position - y.position)
    setRows(next)
    const [ra, rb] = await Promise.all([
      persist(a.key, { position: b.position }),
      persist(b.key, { position: a.position }),
    ])
    if (ra && rb) toast(true, "Order saved")
    setBusy(false)
  }

  if (!rows.length)
    return (
      <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No homepage sections found — run supabase/schema-11.sql.
      </p>
    )

  return (
    <ul className="divide-y divide-border border border-border">
      {rows.map((row, i) => (
        <li
          key={row.key}
          className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:px-4"
        >
          <span className="label w-6 shrink-0 text-muted-foreground">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="label w-36 shrink-0 truncate text-foreground" title={row.key}>
            {row.key}
          </span>
          <TextInput
            aria-label={`Title for ${row.key}`}
            value={drafts[row.key] ?? row.title}
            onChange={(e) => setDrafts((d) => ({ ...d, [row.key]: e.target.value }))}
            onBlur={() => void saveTitle(row)}
            disabled={busy}
            className="h-9 min-w-0 flex-1"
          />
          {LIMIT_KEYS.has(row.key) && (
            <TextInput
              type="number"
              min={1}
              max={24}
              aria-label={`Item limit for ${row.key}`}
              defaultValue={row.limitCount}
              key={`${row.key}-${row.limitCount}`}
              onBlur={(e) => void saveLimit(row, e.target.value)}
              disabled={busy}
              className="h-9 w-16 shrink-0 text-center"
            />
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void move(i, -1)}
              disabled={busy || i === 0}
              aria-label={`Move ${row.title} up`}
              className="grid h-8 w-8 place-items-center border border-border transition hover:bg-muted disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => void move(i, 1)}
              disabled={busy || i === rows.length - 1}
              aria-label={`Move ${row.title} down`}
              className="grid h-8 w-8 place-items-center border border-border transition hover:bg-muted disabled:opacity-40"
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <Switch
              checked={row.enabled}
              onChange={() => toggle(row)}
              label={row.enabled ? "Hide" : "Show"}
            />
          </span>
        </li>
      ))}
    </ul>
  )
}
