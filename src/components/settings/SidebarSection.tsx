"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"
import { SIDEBAR_EVENT, type SidebarMode } from "@/components/layout"

const OPTIONS: { key: SidebarMode; title: string; note: string }[] = [
  {
    key: "hover",
    title: "Hover to expand",
    note: "Icons only by default — the full menu slides out when you point at it.",
  },
  {
    key: "resize",
    title: "Resizable",
    note: "Always visible — drag the edge to resize, or use the chevron to collapse.",
  },
]

function MiniDiagram({ active }: { active: boolean }) {
  return (
    <span aria-hidden className="mb-3 flex h-12 gap-1.5 rounded-control border border-line bg-wash p-1.5">
      <span className={cn("rounded-sm transition-colors", active ? "bg-ink" : "bg-ink/70")} style={{ width: 10 }} />
      <span className="flex-1 rounded-sm border border-dashed border-line bg-paper" />
    </span>
  )
}

export function SidebarSection() {
  const [mode, setMode] = useState<SidebarMode>("resize")

  useEffect(() => {
    try {
      if (localStorage.getItem("fc-sidebar-mode") === "hover") setMode("hover")
    } catch {
      /* ignore */
    }
  }, [])

  const pick = (key: SidebarMode) => {
    setMode(key)
    try {
      localStorage.setItem("fc-sidebar-mode", key)
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(SIDEBAR_EVENT))
  }

  return (
    <div role="radiogroup" aria-label="Sidebar behaviour" className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((o) => {
        const on = mode === o.key
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => pick(o.key)}
            className={cn(
              "rounded-card border p-4 text-left transition",
              on ? "border-ink bg-wash" : "border-line bg-paper hover:border-ink/40"
            )}
          >
            <MiniDiagram active={on} />
            <span className="block text-sm font-medium">{o.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-faint">{o.note}</span>
          </button>
        )
      })}
    </div>
  )
}
