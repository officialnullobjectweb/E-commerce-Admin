"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

interface Toast {
  id: number
  ok: boolean
  message: string
}

const ToastCtx = createContext<(ok: boolean, message: string) => void>(() => {})

export const useToast = () => useContext(ToastCtx)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((ok: boolean, message: string) => {
    const id = nextId++
    setToasts((prev) => [...prev.slice(-2), { id, ok, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <p
            key={t.id}
            className={`w-full rounded-card border px-4 py-3 text-center text-sm font-medium shadow-pop ${
              t.ok ? "border-ink bg-ink text-paper" : "border-bad bg-paper text-bad"
            }`}
          >
            {t.message}
          </p>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
