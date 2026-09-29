import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Admin sessions — HMAC-signed tokens in an httpOnly cookie. No database,
 * no dependency. Server-only.
 */
const COOKIE = "fc_admin"
const TTL_MS = 12 * 60 * 60 * 1000

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set")
  return s
}

export const adminCookieName = COOKIE

export function signSession(now = Date.now()): string {
  const exp = now + TTL_MS
  const sig = createHmac("sha256", secret()).update(String(exp)).digest("base64url")
  return `${exp}.${sig}`
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false
  const [expStr, sig] = token.split(".")
  const exp = Number(expStr)
  if (!expStr || !sig || !Number.isFinite(exp) || exp < Date.now()) return false
  const want = createHmac("sha256", secret()).update(expStr).digest("base64url")
  if (sig.length !== want.length) return false
  return timingSafeEqual(Buffer.from(sig), Buffer.from(want))
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${TTL_MS / 1000}`
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

/** Constant-time compare for credentials. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/** Server components: full HMAC check of the session cookie, else → /login. */
export async function requireAdmin(): Promise<void> {
  const store = await cookies()
  if (!verifySession(store.get(COOKIE)?.value)) redirect("/login")
}
