"use client"

import { useActionState, useEffect, type ReactNode } from "react"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { useToast } from "./feedback"
import { cn } from "@/lib/cn"

/* ---------- field wrapper: label + control + error in one place ---------- */

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  const id = htmlFor
  return (
    <div className={className}>
      <label htmlFor={id} className="label text-faint">
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-faint">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  )
}

const controlCls =
  "h-11 w-full rounded-control border border-line bg-transparent px-3 text-sm text-ink placeholder:text-faint/70 focus:border-ink focus:outline-none disabled:opacity-50"

/* ---------- inputs (all labelled via Field, 44px touch targets) ---------- */

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlCls, props.className)} />
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="search"
      className={cn(controlCls, "max-w-xs", props.className)}
    />
  )
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} type="number" inputMode="decimal" className={cn(controlCls, props.className)} />
}

export function PriceInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative block">
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">
        ₹
      </span>
      <input {...props} type="number" min={0} inputMode="decimal" className={cn(controlCls, "pl-7", props.className)} />
    </span>
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlCls, "h-auto min-h-24 py-2.5", props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlCls, "pr-8", props.className)} />
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition",
        checked ? "border-ink bg-ink" : "border-line bg-wash"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all",
          checked ? "left-[22px] bg-paper" : "left-[3px] bg-faint"
        )}
      />
    </button>
  )
}

/* ---------- submit with toast feedback (redirects pass through) ---------- */

export function ActionButton({
  action,
  children,
  className = "",
}: {
  action: (form: FormData) => Promise<void>
  children: ReactNode
  className?: string
}) {
  const push = useToast()
  const [, formAction, pending] = useActionState(
    async (_prev: null, form: FormData) => {
      try {
        await action(form)
        push(true, "Saved ✓")
        return null
      } catch (e) {
        if (isRedirectError(e)) throw e
        push(false, "Couldn't save — try again")
        return null
      }
    },
    null
  )

  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50",
        className
      )}
    >
      {pending ? "Saving…" : children}
    </button>
  )
}
