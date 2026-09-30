# Flowcase Admin

An open-source admin panel (back office) for an online store. It lets one person run the whole business: products, orders, customers, reviews, coupons, and reports — without touching code.

Built with **Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase**. It talks to your storefront and payment worker through one small API layer.

## What it can do

- **Dashboard** — revenue/orders/AOV with 7-day deltas, trend chart (7/30/90 days), fulfilment and payment breakdowns, low-stock and top-seller alerts, recent orders.
- **Products** — create, edit, and delete products. Variants (size/colour), collections, brands, categories, images, stock, badges (%-off, Featured, Best Seller…), search and bulk actions on the list.
- **Orders** — search, filter by status/state/method/date, full order details (items, address, payment IDs), status & notes editing, printable invoice, CSV export (from Reports).
- **Inventory** — every variant in one table with low/out-of-stock filters, search, and stock adjustments (+/− with reason, audited into `stock_adjustments`).
- **Customers** — every customer derived from real orders, with spend, order history, tags/notes editing, CSV export.
- **Reviews** — moderation (pending/approved/hidden), reply to reviews, add manually for offline feedback.
- **Categories** — manage storefront categories plus variation axes (option sets) reused across products.
- **Coupons** — percentage, fixed, free-shipping, and BOGO codes with min subtotal, max discount, per-product/category/state targeting, usage limits, windows, and one-click enable.
- **Homepage** — reorder, retitle, limit, and toggle storefront home sections (hero, best sellers, just landed, sustainability…) live.
- **Reports** — 7/30/90-day revenue, orders, and AOV; 30-day top sellers with share bars; orders CSV export.
- **Settings** — announcement bar, promo banner, ops thresholds (low stock), two-factor auth (TOTP + backup codes), archive browser (restore/purge), system health checks.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 (design tokens: ink/paper palette, signal blue `#0700ff`) |
| Forms | react-hook-form + zod validation |
| Tables | TanStack Table (URL-driven search/sort/pagination) |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) — anon key for reads, service-role key for writes (server only) |
| API | Small Cloudflare Worker proxy for order/stats mutations |

## Quick start

```bash
git clone https://github.com/officialnullobjectweb/E-commerce-Admin.git
cd E-commerce-Admin
cp .env.example .env    # then fill in real values (see table below)
npm install
npm run dev             # http://localhost:3002
```

Production build: `npm run build && npm start`.

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key — safe for the browser, used for public reads |
| `SUPABASE_URL` | Same project URL, used on the server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key with full database access — **never** expose it to the browser |
| `ADMIN_PASSWORD` | The password used to log in to this admin |
| `ADMIN_SESSION_SECRET` | Long random string that signs login cookies (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` | Optional — when set, login also requires this email |
| `ADMIN_API_TOKEN` | Shared token your API worker expects |
| `WORKER_URL` | Base URL of your API worker (e.g. `https://your-api.workers.dev`) |

**Never commit `.env`.** It is git-ignored on purpose.

## How it connects to your store

```
[ This admin ] --server-side--> [ Supabase database ] <-- [ Your storefront ]
        |
        +----server-side------> [ API worker ] (orders, stats, uploads)
```

- The browser only ever talks to this Next.js app. Database keys stay on the server.
- Your storefront reads the same Supabase tables (products, categories, coupons…) with the anon key.
- Point your storefront at the same `SUPABASE_URL`/`ANON_KEY` and the same worker, and both apps stay in sync.

## Security notes

- Login is protected by a signed, time-limited cookie (`HMAC`, 12 hours, `HttpOnly` + `SameSite=Lax`).
- Write operations go through server actions that re-check the session on every call (39 guarded actions; every page calls `requireAdmin`).
- The service-role key and admin password live only in server environment variables.
- Rate limiting on login attempts is enforced in the database; optional second factor (TOTP) with backup codes.
- Security headers on every response (`nosniff`, `X-Frame-Options: DENY`, referrer/permissions policies).

## License

[MIT](./LICENSE) — free to use, modify, and ship.
