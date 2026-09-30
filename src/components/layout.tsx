"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown, LogOut, MoonStar, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/cn"
import { useTheme } from "@/components/theme"
import { Avatar } from "@/components/display"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/* ---------- sidebar preferences (persisted, shared with Settings) ---------- */

export type SidebarMode = "hover" | "resize"
export const SIDEBAR_EVENT = "fc-sidebar-change"
const SB_MIN = 64
const SB_COLLAPSE_AT = 140
const SB_MAX = 420
const SB_DEFAULT = 248

function readSidebarPrefs() {
  let mode: SidebarMode = "resize"
  let w = SB_DEFAULT
  let collapsed = false
  try {
    if (localStorage.getItem("fc-sidebar-mode") === "hover") mode = "hover"
    const stored = Number(localStorage.getItem("fc-sidebar-w"))
    if (Number.isFinite(stored) && stored >= SB_COLLAPSE_AT && stored <= SB_MAX) w = stored
    collapsed = localStorage.getItem("fc-sidebar-collapsed") === "1"
  } catch {
    /* private mode */
  }
  return { mode, w, collapsed }
}

/* ---------- navigation definition (single source) ---------- */

export interface NavEntry {
  href: string
  label: string
  icon: ReactNode
}

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const NAV_DASHBOARD: NavEntry = { href: "/", label: "Dashboard", icon: <Icon d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" /> }
const NAV_SETTINGS: NavEntry = { href: "/settings", label: "Settings", icon: <Icon d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /> }

export const NAV_GROUPS: { label?: string; items: NavEntry[] }[] = [
  { items: [NAV_DASHBOARD] },
  {
    label: "Catalog",
    items: [
      { href: "/products", label: "Products", icon: <Icon d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" /> },
      { href: "/inventory", label: "Inventory", icon: <Icon d="M3 21V9l9-6 9 6v12M7 21v-8h10v8M7 17h10" /> },
      { href: "/categories", label: "Categories", icon: <Icon d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" /> },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/orders", label: "Orders", icon: <Icon d="M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z" /> },
      { href: "/customers", label: "Customers", icon: <Icon d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /> },
      { href: "/reviews", label: "Reviews", icon: <Icon d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" /> },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/coupons", label: "Coupons", icon: <Icon d="M3 9V7a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 6v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-6zM13 5v2M13 11v2M13 17v2" /> },
      { href: "/homepage", label: "Homepage", icon: <Icon d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /> },
      { href: "/reports", label: "Reports", icon: <Icon d="M4 20V10M10 20V4M16 20v-7M3 20h18" /> },
    ],
  },
  { items: [NAV_SETTINGS] },
]

export const NAV: NavEntry[] = NAV_GROUPS.flatMap((g) => g.items)

/* ---------- shell ---------- */

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        fetch("/api/auth/login", { method: "DELETE" }).then(() => {
          window.location.href = "/login"
        })
      }}
      className="label w-full px-3 py-2.5 text-left text-faint transition hover:bg-wash hover:text-ink"
    >
      Sign out
    </button>
  )
}

export function ThemeToggle() {
  const { mode, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
      aria-pressed={mode === "dark"}
      title="Toggle theme (T)"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line text-faint transition hover:border-ink hover:text-ink"
    >
      <Icon
        d={
          mode === "dark"
            ? "M12 3a6 6 0 009 9 9 9 0 11-9-9z"
            : "M12 7a5 5 0 100 10 5 5 0 000-10M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        }
        className="h-4.5 w-4.5"
      />
    </button>
  )
}

/** Sidebar footer: account menu (theme + sign out) — Shopify-style. */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { mode, toggle } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={compact ? "Account menu" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition hover:bg-wash focus:outline-none focus-visible:ring-2 focus-visible:ring-signal",
            compact && "justify-center px-0"
          )}
        >
          <Avatar name="Admin" size="sm" />
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">Administrator</span>
                <span className="label block text-faint">Store admin</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-faint" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[236px]">
        <DropdownMenuLabel>Signed in as Admin</DropdownMenuLabel>
        <DropdownMenuItem onSelect={toggle}>
          <MoonStar className="h-4 w-4" />
          {mode === "dark" ? "Light theme" : "Dark theme"}
          <span className="label ml-auto text-faint">T</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          danger
          onSelect={() => {
            fetch("/api/auth/login", { method: "DELETE" }).then(() => {
              window.location.href = "/login"
            })
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NavList({ onNavigate, rail = false }: { onNavigate?: () => void; rail?: boolean }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin" className="flex flex-col">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label ?? gi} className={gi > 0 ? "mt-5" : undefined}>
          {group.label && (
            <p className={cn("label mb-1.5 px-3 text-faint", rail && "sr-only")}>{group.label}</p>
          )}
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  title={rail ? item.label : undefined}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition",
                    rail && "justify-center px-0",
                    active ? "bg-ink text-paper" : "text-faint hover:bg-wash hover:text-ink"
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className={cn("truncate", rail && "sr-only")}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<SidebarMode>("resize")
  const [w, setW] = useState(SB_DEFAULT)
  const [collapsed, setCollapsed] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)
  const lastW = useRef(SB_DEFAULT)
  const wRef = useRef(SB_DEFAULT)
  const cRef = useRef(false)

  useEffect(() => {
    const apply = () => {
      const p = readSidebarPrefs()
      setMode(p.mode)
      setW(p.w)
      setCollapsed(p.collapsed)
      lastW.current = p.w
      wRef.current = p.w
      cRef.current = p.collapsed
    }
    apply()
    window.addEventListener(SIDEBAR_EVENT, apply)
    return () => window.removeEventListener(SIDEBAR_EVENT, apply)
  }, [])

  const hoverMode = mode === "hover"
  const railMode = hoverMode ? !hoverOpen : collapsed
  const railW = railMode ? SB_MIN : hoverMode ? SB_DEFAULT : w
  const colW = hoverMode ? SB_MIN : railW
  const persist = (nextW: number, nextCollapsed: boolean) => {
    try {
      if (nextW >= SB_COLLAPSE_AT) localStorage.setItem("fc-sidebar-w", String(Math.round(nextW)))
      localStorage.setItem("fc-sidebar-collapsed", nextCollapsed ? "1" : "0")
    } catch {
      /* ignore */
    }
  }
  const applyWidth = (target: number) => {
    if (target < SB_COLLAPSE_AT) {
      setCollapsed(true)
      cRef.current = true
    } else {
      setCollapsed(false)
      cRef.current = false
      setW(target)
      wRef.current = target
      lastW.current = target
    }
  }

  const startDrag = (e: React.PointerEvent) => {
    if (hoverMode) return
    e.preventDefault()
    const handle = e.currentTarget as HTMLElement
    const startX = e.clientX
    const startW = railW
    handle.setPointerCapture(e.pointerId)
    document.body.style.userSelect = "none"
    const move = (ev: PointerEvent) => {
      applyWidth(Math.min(SB_MAX, Math.max(SB_MIN, startW + ev.clientX - startX)))
    }
    const up = () => {
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", up)
      document.body.style.userSelect = ""
      persist(lastW.current, cRef.current)
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", up)
  }

  const toggleCollapsed = () => {
    const next = !cRef.current
    cRef.current = next
    setCollapsed(next)
    persist(lastW.current, next)
  }

  const sidebarBody = (isRail: boolean) => (
    <>
      <div className={cn("flex items-center justify-between gap-2 px-1", isRail && "flex-col gap-1.5 px-0")}>
        <Link
          href="/"
          className="font-display min-w-0 truncate px-2 text-xl font-extrabold tracking-tight"
          aria-label="Flowcase admin home"
        >
          {isRail ? "F." : "Flowcase."}
        </Link>
        {!hoverMode && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-faint transition hover:bg-wash hover:text-ink"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>
      <p className={cn("label mt-1 px-3 text-faint", isRail && "sr-only")}>Admin · Go with flow</p>
      <div className="mt-6 min-h-0 flex-1">
        <NavList rail={isRail} />
      </div>
      <div className="border-t border-line pt-3">
        <AccountMenu compact={isRail} />
      </div>
    </>
  )

  return (
    <div
      className="app-shell relative lg:grid lg:h-dvh"
      style={{ gridTemplateColumns: `${colW}px minmax(0, 1fr)` }}
    >
      {/* desktop sidebar */}
      <aside
        className={cn(
          "app-side hidden border-r border-line lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto print:hidden",
          railMode ? "lg:px-1.5 lg:py-5" : "lg:p-5",
          hoverMode
            ? "absolute left-0 top-0 z-40 bg-paper shadow-[8px_0_28px_-12px_rgba(0,0,0,0.25)] transition-[width] duration-200 ease-out"
            : "relative"
        )}
        style={{ width: railW }}
        onPointerEnter={() => hoverMode && setHoverOpen(true)}
        onPointerLeave={() => {
          if (!hoverMode) return
          requestAnimationFrame(() => {
            if (!document.querySelector(".app-side:hover")) setHoverOpen(false)
          })
        }}
        onFocus={() => hoverMode && setHoverOpen(true)}
        onBlur={(e) => {
          if (!hoverMode) return
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHoverOpen(false)
        }}
      >
        {sidebarBody(railMode)}
        {!hoverMode && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            tabIndex={0}
            title="Drag or use arrow keys to resize"
            onPointerDown={startDrag}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault()
                applyWidth(Math.min(SB_MAX, Math.max(SB_MIN, railW + (e.key === "ArrowRight" ? 16 : -16))))
                persist(lastW.current, cRef.current)
              }
            }}
            className="absolute right-0 top-0 hidden h-full w-2 cursor-col-resize lg:block"
          >
            <div className="mx-auto h-full w-px transition-colors hover:bg-signal" />
          </div>
        )}
      </aside>
      <div className="app-col min-w-0 lg:col-start-2 lg:h-dvh lg:overflow-y-auto">
        {/* mobile topbar */}
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3 lg:hidden print:hidden">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight" aria-label="Flowcase admin home">
            Flowcase.
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-11 w-11 items-center justify-center rounded-control border border-line"
          >
            <span aria-hidden="true" className="text-lg">{open ? "×" : "☰"}</span>
          </button>
        </div>
        {open && (
          <div className="border-b border-line bg-paper px-4 py-3 lg:hidden print:hidden">
            <NavList onNavigate={() => setOpen(false)} />
          <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
            <div className="flex-1">
              <SignOutButton />
            </div>
            <ThemeToggle />
          </div>
        </div>
        )}
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  )
}

/* ---------- page furniture ---------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-faint">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((t, i) => (
          <li key={t.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-faint">/</span>}
            {t.href ? (
              <Link href={t.href} className="label text-faint transition hover:text-ink">
                {t.label}
              </Link>
            ) : (
              <span aria-current="page" className="label text-ink">{t.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function ContentSection({
  title,
  description,
  className,
  children,
}: {
  title: string
  description?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("rounded-card border border-line bg-paper p-5 sm:p-6", className)}>
      <h2 className="font-display text-base font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-faint">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Collapsible section — keeps secondary forms out of the scan path. */
export function Disclosure({
  title,
  description,
  open = false,
  children,
}: {
  title: string
  description?: string
  open?: boolean
  children: ReactNode
}) {
  return (
    <details open={open} className="group rounded-card border border-line bg-paper">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker:hidden]">
        <span className="min-w-0">
          <span className="text-sm font-medium">{title}</span>
          {description && <span className="ml-2 text-sm font-normal text-faint">{description}</span>}
        </span>
        <span aria-hidden="true" className="label shrink-0 text-faint transition-transform duration-200 group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="border-t border-line px-5 pt-5 pb-5">{children}</div>
    </details>
  )
}
