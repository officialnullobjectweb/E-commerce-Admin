"use client"

import { CheckCircle2, XCircle } from "lucide-react"
import { Toaster, toast } from "sonner"
import { type ReactNode } from "react"
import { useTheme } from "@/components/theme"

/** push(ok, message) — same signature the app already uses. */
export type PushToast = (ok: boolean, message: string) => void

export const useToast: () => PushToast = () => (ok, message) => {
  if (ok) {
    toast.success(message, { icon: <CheckCircle2 className="h-4 w-4" /> })
  } else {
    toast.error(message, { icon: <XCircle className="h-4 w-4" /> })
  }
}

/**
 * Bottom-center toasts — stacked, pause on hover, theme-aware.
 * Mounted once per app group (inside ThemeProvider).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { mode } = useTheme()
  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        theme={mode}
        offset={28}
        gap={8}
        visibleToasts={4}
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--color-paper)",
            color: "var(--color-ink)",
            border: "1px solid var(--color-line)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-pop)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            fontWeight: 500,
            padding: "12px 16px",
            maxWidth: "24rem",
          },
        }}
      />
    </>
  )
}
