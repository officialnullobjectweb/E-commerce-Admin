"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/cn"

/* ---------- badges ---------- */

const badgeTones: Record<string, string> = {
  ok: "border-ok/30 bg-ok/10 text-ok",
  warn: "border-warn/30 bg-warn/10 text-warn",
  bad: "border-bad/30 bg-bad/10 text-bad",
  neutral: "border-line bg-wash text-faint",
  ink: "border-ink bg-ink text-paper",
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof badgeTones
  children: ReactNode
}) {
  return (
    <span className={cn("label inline-flex items-center rounded-full border px-2.5 py-1", badgeTones[tone])}>
      {children}
    </span>
  )
}

const orderTones: Record<string, keyof typeof badgeTones> = {
  paid: "ok",
  pending: "warn",
  failed: "bad",
  refunded: "neutral",
  cancelled: "neutral",
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={orderTones[status] ?? "neutral"}>{status}</Badge>
}

/* ---------- avatar (initials, never stock photos) ---------- */

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-ink font-medium text-paper",
        size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs"
      )}
    >
      {initials || "?"}
    </span>
  )
}

/* ---------- money ---------- */

export function MoneyDisplay({ amount, currency = "inr" }: { amount: number | null | undefined; currency?: string }) {
  if (amount == null) return <span className="text-faint">—</span>
  const text = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount)
  return <span className="font-medium tabular-nums">{text}</span>
}

/* ---------- loading / empty / error ---------- */

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-ink" />
  )
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-control bg-wash", className)} />
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-card border border-dashed border-line p-10 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-md text-sm text-faint">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

/* ---------- modal + destructive confirm ---------- */

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-ink/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-card bg-paper p-6 shadow-pop"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-10 w-10 items-center justify-center rounded-control text-xl transition hover:bg-wash"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDelete({
  what,
  onClose,
  onConfirm,
  pending,
}: {
  what: string
  onClose: () => void
  onConfirm: () => void
  pending?: boolean
}) {
  return (
    <Modal title="Delete this?" onClose={onClose}>
      <p className="text-sm leading-relaxed text-faint">
        <span className="font-medium text-ink">{what}</span> will be permanently
        removed. This cannot be undone.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-control border border-line px-5 text-sm transition hover:border-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="h-11 rounded-control bg-bad px-5 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  )
}

/* ---------- tabs ---------- */

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-control border border-line p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "label rounded-[8px] px-3 py-2 transition",
            value === o.value ? "bg-ink text-paper" : "text-faint hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- copy button ---------- */

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={label ?? `Copy ${text}`}
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {})
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
      className="label text-faint transition hover:text-ink"
    >
      {done ? "Copied ✓" : (label ?? "Copy")}
    </button>
  )
}
