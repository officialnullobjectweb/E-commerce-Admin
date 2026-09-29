"use client"

import * as RD from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown, MoreHorizontal } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/cn"

export const DropdownMenu = RD.Root
export const DropdownMenuTrigger = RD.Trigger

export function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  children,
}: {
  className?: string
  align?: "start" | "center" | "end"
  sideOffset?: number
  children: ReactNode
}) {
  return (
    <RD.Portal>
      <RD.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "fc-menu z-[95] min-w-[10rem] max-w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden",
          "rounded-card border border-line bg-paper p-1 shadow-pop focus:outline-none",
          className
        )}
      >
        {children}
      </RD.Content>
    </RD.Portal>
  )
}

export function DropdownMenuItem({
  className,
  danger,
  children,
  onSelect,
  disabled,
}: {
  className?: string
  danger?: boolean
  children: ReactNode
  onSelect?: () => void
  disabled?: boolean
}) {
  return (
    <RD.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-sm outline-none transition",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[highlighted]:bg-wash",
        danger
          ? "text-bad data-[highlighted]:bg-bad/10"
          : "text-ink",
        className
      )}
    >
      {children}
    </RD.Item>
  )
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <RD.Label className="label px-2.5 pb-1 pt-2 text-faint">{children}</RD.Label>
  )
}

export function DropdownMenuSeparator() {
  return <RD.Separator className="my-1 h-px bg-line" />
}

export interface MenuItemDef {
  label: string
  onSelect?: () => void
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
}

/** Overflow "⋯" action menu — the standard row/column action pattern. */
export function ActionMenu({
  items,
  label = "More actions",
  className,
}: {
  items: MenuItemDef[]
  label?: string
  className?: string
}) {
  return (
    <DropdownMenu>
      <RD.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-control text-faint transition hover:bg-wash hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-signal",
            className
          )}
        >
          <MoreHorizontal className="h-4.5 w-4.5" />
        </button>
      </RD.Trigger>
      <DropdownMenuContent>
        {items.map((it) => (
          <DropdownMenuItem
            key={it.label}
            danger={it.danger}
            disabled={it.disabled}
            onSelect={it.onSelect}
          >
            {it.icon}
            {it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Single-select dropdown (filters, status pickers) — Shopify-style. */
export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  label,
  triggerClassName,
  align = "start",
  disabled,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
  triggerClassName?: string
  align?: "start" | "center" | "end"
  disabled?: boolean
}) {
  const current = options.find((o) => o.value === value)
  return (
    <DropdownMenu>
      <RD.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-control border border-line px-3 text-sm transition",
            "hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:opacity-50",
            triggerClassName
          )}
        >
          <span className="text-faint">{label}:</span>
          <span className="font-medium">{current?.label ?? value}</span>
          <ChevronDown className="h-3.5 w-3.5 text-faint" />
        </button>
      </RD.Trigger>
      <DropdownMenuContent align={align} className="max-h-[min(20rem,60vh)] overflow-y-auto">
        <RD.RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as T)}
        >
          {options.map((o) => (
            <RD.RadioItem
              key={o.value}
              value={o.value}
              className="flex cursor-pointer select-none items-center justify-between gap-6 rounded-[8px] px-2.5 py-2 text-sm outline-none transition data-[highlighted]:bg-wash"
            >
              <span>{o.label}</span>
              <RD.ItemIndicator>
                <Check className="h-4 w-4 text-signal" />
              </RD.ItemIndicator>
            </RD.RadioItem>
          ))}
        </RD.RadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
