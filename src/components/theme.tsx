"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

type Mode = "light" | "dark"

const ThemeCtx = createContext<{ mode: Mode; toggle: () => void }>({ mode: "light", toggle: () => {} })

export const useTheme = () => useContext(ThemeCtx)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("light")

  useEffect(() => {
    const saved = localStorage.getItem("fc-theme") as Mode | null
    const initial =
      saved === "dark" || saved === "light"
        ? saved
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
    setMode(initial)
    document.documentElement.classList.toggle("dark", initial === "dark")
  }, [])

  const toggle = useCallback(() => {
    setMode((m) => {
      const next = m === "dark" ? "light" : "dark"
      localStorage.setItem("fc-theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
      return next
    })
  }, [])

  // keyboard: T toggles (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "t" || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return
      e.preventDefault()
      toggle()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [toggle])

  return <ThemeCtx.Provider value={{ mode, toggle }}>{children}</ThemeCtx.Provider>
}
