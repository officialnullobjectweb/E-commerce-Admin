import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { clearSessionCookie, safeEqual, sessionCookie, signSession } from "@/lib/auth"

const ipOf = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip")?.trim() ||
  "unknown"

function anon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(req: Request) {
  const sb = anon()
  const ip = ipOf(req)

  const { data: gate } = await sb.rpc("check_login_throttle", { p_ip: ip })
  if (!gate || (gate as { allowed?: boolean }).allowed !== true) {
    return NextResponse.json({ error: "locked_out" }, { status: 429 })
  }

  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string
    password?: string
  }
  // Password is the secret (matches storefront legacy envs). Email is an
  // extra gate only when ADMIN_EMAIL is configured.
  const wantEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase()
  const wantPassword = process.env.ADMIN_PASSWORD ?? ""
  const emailOk = !wantEmail || String(email ?? "").trim().toLowerCase() === wantEmail
  const ok =
    !!wantPassword &&
    !!password &&
    emailOk &&
    safeEqual(password, wantPassword)
  if (!ok) {
    const remaining = (gate as { remaining?: number }).remaining ?? 0
    return NextResponse.json({ error: "bad_credentials", remaining }, { status: 401 })
  }

  await sb.rpc("clear_login_throttle", { p_ip: ip })
  const res = NextResponse.json({ ok: true })
  res.headers.set("Set-Cookie", sessionCookie(signSession()))
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.headers.set("Set-Cookie", clearSessionCookie())
  return res
}
