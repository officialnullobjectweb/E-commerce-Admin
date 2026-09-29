"use client"

import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="label inline-flex items-center gap-2 rounded-control bg-ink px-3.5 py-2 text-paper transition hover:opacity-80 print:hidden"
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      Print / PDF
    </button>
  )
}
