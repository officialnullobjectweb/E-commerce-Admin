"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"
import { ChevronDown, LogOut, MoonStar } from "lucide-react"
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

export const NAV: NavEntry[] = [
  { href: "/", label: "Dashboard", icon: <Icon d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" /> },
  { href: "/products", label: "Products", icon: <Icon d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" /> },
  { href: "/orders", label: "Orders", icon: <Icon d="M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z" /> },
  { href: "/customers", label: "Customers", icon: <Icon d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /> },
  { href: "/reviews", label: "Reviews", icon: <Icon d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" /> },
  { href: "/categories", label: "Categories", icon: <Icon d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" /> },
  { href: "/coupons", label: "Coupons", icon: <Icon d="M3 9V7a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 6v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-6zM13 5v2M13 11v2M13 17v2" /> },
  { href: "/homepage", label: "Homepage", icon: <Icon d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /> },
  { href: "/settings", label: "Settings", icon: <Icon d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /> },
]

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
export function AccountMenu() {
  const { mode, toggle } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition hover:bg-wash focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <Avatar name="Admin" size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">Administrator</span>
            <span className="label block text-faint">Store admin</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-faint" />
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

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-ink text-paper" : "text-faint hover:bg-wash hover:text-ink"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* desktop sidebar */}
      <aside className="hidden border-r border-line lg:flex lg:flex-col lg:p-5 print:hidden">
        <Link href="/" className="font-display px-3 text-xl font-extrabold tracking-tight" aria-label="Flowcase admin home">
          Flowcase.
        </Link>
        <p className="label mt-1 px-3 text-faint">Admin · Go with flow</p>
        <div className="mt-6 flex-1">
          <NavList />
        </div>
        <div className="border-t border-line pt-3">
          <AccountMenu />
        </div>
      </aside>
      <div className="min-w-0">
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
        {description && <p className="label mt-2 text-faint">{description}</p>}
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
