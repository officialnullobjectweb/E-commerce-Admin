# Flowcase Admin — Design System

> This document is the single source of truth for how the admin looks and behaves.
> Version: v1 final — component reference and layout sections reflect the shipped
> system after the P14 polish pass (a11y fixes, token contrast, all modules live).

## 1. Brand

- **Name:** Flowcase.
- **Voice:** calm, direct, operational. Short labels ("Save", "Refund", "Low stock").
  Numbers always in ₹ with Indian digit grouping (₹1,23,456 style via `Intl.NumberFormat("en-IN")`).
- **Personality:** precise tool, not a marketing page. Density over decoration.

## 2. Color tokens (`src/app/globals.css`, Tailwind v4 `@theme`)

| Token | Light | Dark (`.dark` override) | Usage |
|---|---|---|---|
| `--color-paper` | `#ffffff` | `#09090b` | page canvas |
| `--color-ink` | `#0a0a0a` | `#fafafa` | primary text |
| `--color-wash` | `#f4f4f5` | `#131316` | secondary surfaces, inputs |
| `--color-line` | `#e5e5e5` | `#26262b` | 1px rules, borders |
| `--color-faint` | `#52525b` | `#a1a1aa` | helper text, meta |
| `--color-signal` | `#0700ff` | `#0700ff` | primary buttons, links, focus |
| `--color-signal-ink` | `#ffffff` | `#ffffff` | text on signal |
| `--color-ok` / `--color-warn` / `--color-bad` | `#166534` / `#92400e` / `#991b1b` | same | status text/badges |

Rules:
- Signal blue is **reserved** for primary actions and interactive focus — never decorative.
- Status colors always paired with text (never color alone).

## 3. Typography

- **Display:** Archivo (`next/font`, var `--font-archivo`) — page titles, big numbers, wordmark, extra-bold tracking-tight.
- **Body:** `system-ui` stack (the `--font-inter` var is wired as drop-in hook, Inter not loaded — zero network cost by design).
- **Label style** (`.label` utility): mono (`ui-monospace`), 11px (`0.6875rem`), letter-spacing `0.08em` — field labels, table headers, meta rows.
- Scale: page title ~24/700 display · section 16/600 · body 14/400 · small 13.

## 4. Shape, elevation, motion

- Radius: `--radius-card: 1rem` (cards), `--radius-control: 0.625rem` (buttons/inputs), pills for badges.
- Elevation: borders first. `--shadow-lift` (subtle) for cards on hover/popovers; `--shadow-pop` (stronger, dark-tuned) for modals/menus.
- Motion: `--dur-fast: 150ms`, `--dur-med: 250ms`, `--ease-out: cubic-bezier(0.22,1,0.36,1)`; skeleton **shine sweep** for loading; respect `prefers-reduced-motion`.

## 5. Core components (inventory)

Buttons (primary/secondary/ghost/destructive, sizes sm/md) · Inputs (text, number w/ ₹ prefix, select, textarea, checkbox, switch) · **FilterBar** (chips + clear-all, URL-synced) · **ListTable** (client columns, sort, pagination, row selection) · Cards · StatusBadge · EmptyState · Skeleton (+shine) · Modal/Dialog · Toast (bottom-center, stacking, hover-pause, `role="status"`) · Tabs · Avatar · SearchInput · PriceInput · ActionMenu (⋯) · ConfirmDialog (destructive).

**States — every component must handle:** default, hover, focus-visible (2px signal ring), disabled, loading, empty, error, dark-mode.

## 6. Layout

- App shell: `h-dvh` CSS grid — **sidebar (own scroll)** + right column (sticky **topbar** + main with its own scroll).
- Sidebar variants (user setting): **Full** (248px icon+label) · **Rail** (72px icons, hover overlay showing icon+name) · **Overlay** (off-canvas, ☰ toggle).
- Topbar: page title/breadcrumbs · ⌘K quick search · notifications bell · profile menu (theme, settings, sign out).
- Content width: tables full-bleed, forms capped ~720px, dashboard = 12-col card grid.
- Page rhythm: every list page = title + FilterBar + table + bulk-action bar; every detail = header + tabs/sections; every form = label-above inputs, sticky footer actions.

## 7. Accessibility

- All interactive elements keyboard-reachable with visible focus ring; ⌘K and "T" (theme) shortcuts.
- Contrast AA in both themes; badges pair color with text; icon buttons carry `aria-label`.
- Tables use semantic markup; modals trap focus; toasts `role="status"`.

## 8. Do / Don't

- DO reuse the components above before inventing new ones.
- DO keep lists URL-driven (shareable, back-button works).
- DON'T add a second accent color or decorative gradients.
- DON'T nest cards or show the same data twice on one screen.

## 9. Extending this system

1. Add the token (color/space/radius) to `globals.css` first.
2. Build the component in `src/components/ui/` with all states + dark mode.
3. Wire it into a page with URL state for anything filterable.
4. Update this file.
