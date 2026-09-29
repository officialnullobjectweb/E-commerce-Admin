"use client"

import * as RD from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/cn"

export const Dialog = RD.Root
export const DialogTrigger = RD.Trigger

export function DialogContent({
  className,
  children,
  onClose,
}: {
  className?: string
  children: ReactNode
  onClose?: () => void
}) {
  return (
    <RD.Portal>
      <RD.Overlay className="fc-overlay fixed inset-0 z-[90] bg-ink/50 backdrop-blur-[2px]" />
      <RD.Content
        className={cn(
          "fc-panel fixed left-1/2 top-1/2 z-[95] w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2",
          "overflow-y-auto rounded-card border border-line bg-paper p-6 shadow-pop focus:outline-none",
          className ?? "max-w-md"
        )}
      >
        {children}
        {onClose !== undefined && (
          <RD.Close asChild>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-control text-faint transition hover:bg-wash hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </RD.Close>
        )}
      </RD.Content>
    </RD.Portal>
  )
}

/** Modal dialog with title/description header + optional footer actions. */
export function Modal({
  title,
  description,
  open,
  onOpenChange,
  footer,
  children,
  className,
}: {
  title: string
  description?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <RD.Title className="font-display pr-8 text-lg font-bold">{title}</RD.Title>
        {description && (
          <RD.Description className="mt-1 text-sm text-faint">{description}</RD.Description>
        )}
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </DialogContent>
    </RD.Root>
  )
}

/** Destructive confirmation — used for every delete in the admin. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  what,
  confirmLabel = "Delete",
  pending,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  what: string
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
  children?: ReactNode
}) {
  return (
    <Modal
      title={title ?? "Delete this?"}
      open={open}
      onOpenChange={onOpenChange}
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="h-11 rounded-control border border-line px-5 text-sm transition hover:border-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="h-11 rounded-control bg-bad px-5 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-50"
          >
            {pending ? "Deleting…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-faint">
        <span className="font-medium text-ink">{what}</span> will be permanently removed. This
        cannot be undone.
      </p>
      {children}
    </Modal>
  )
}
