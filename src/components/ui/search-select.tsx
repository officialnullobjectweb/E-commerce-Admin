"use client"

import * as RD from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/cn"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"

export interface SearchOption {
  value: string
  label: string
  hint?: string
  swatch?: string
}

/**
 * Searchable select — the standard form dropdown. Type to filter,
 * arrow keys + Enter to pick, swatch dot for colour options.
 */
export function SearchSelect({
  value,
  options,
  onChange,
  placeholder = "Select…",
  ariaLabel,
  id,
  disabled,
  className,
  emptyOption,
}: {
  value: string
  options: SearchOption[]
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel?: string
  id?: string
  disabled?: boolean
  className?: string
  emptyOption?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const all = useMemo(
    () => (emptyOption ? [{ value: "", label: emptyOption }, ...options] : options),
    [options, emptyOption]
  )
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return all
    return all.filter(
      (o) => o.label.toLowerCase().includes(needle) || o.hint?.toLowerCase().includes(needle)
    )
  }, [all, q])

  const current = all.find((o) => o.value === value)

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setQ("")
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault()
      const first = filtered[0]
      if (e.key === "Enter") {
        if (first) pick(first.value)
        return
      }
      const el = listRef.current?.querySelector<HTMLElement>("[role='menuitemradio']")
      el?.focus()
    }
  }

  return (
    <RD.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ("") }}>
      <RD.Trigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            "flex h-11 w-full items-center gap-2 rounded-control border border-line bg-paper px-3 text-sm text-left transition",
            "hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:opacity-50",
            className
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {current ? (
              <>
                {current.swatch && (
                  <span
                    aria-hidden
                    className="mr-2 inline-block h-3 w-3 -translate-y-px rounded-full border border-line align-middle"
                    style={{ background: current.swatch }}
                  />
                )}
                <span className="font-medium">{current.label}</span>
              </>
            ) : (
              <span className="text-faint">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-faint" />
        </button>
      </RD.Trigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] p-0"
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search…"
            aria-label={ariaLabel ? `${ariaLabel} — search` : "Search options"}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </div>
        <div ref={listRef} className="max-h-[min(16rem,50vh)] overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-2.5 py-3 text-sm text-faint">No matches.</p>
          )}
          <RD.RadioGroup value={value} onValueChange={pick}>
            {filtered.map((o) => (
              <RD.RadioItem
                key={o.value || "__none"}
                value={o.value}
                className="flex cursor-pointer select-none items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-sm outline-none transition data-[highlighted]:bg-wash"
              >
                {o.swatch && (
                  <span
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-line"
                    style={{ background: o.swatch }}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="label block text-faint">{o.hint}</span>}
                </span>
                <RD.ItemIndicator>
                  <Check className="h-4 w-4 shrink-0 text-signal" />
                </RD.ItemIndicator>
              </RD.RadioItem>
            ))}
          </RD.RadioGroup>
        </div>
      </DropdownMenuContent>
    </RD.Root>
  )
}
