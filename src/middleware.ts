import { NextResponse, type NextRequest } from "next/server"

/**
 * Gate every page + API route behind a valid session. Expiry is checked
 * here cheaply, then the HMAC signature is verified with Web Crypto so a
 * forged `exp.sig` cookie can never pass. Login stays public; all admin
 * traffic is noindex.
 */
async function sessionValid(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [expStr, sig] = token.split(".")
  const exp = Number(expStr)
  if (!expStr || !sig || !Number.isFinite(exp) || exp < Date.now()) return false

  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return false
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expStr))
    let bin = ""
    for (const b of new Uint8Array(mac)) bin += String.fromCharCode(b)
    const want = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    return sig.length === want.length && sig === want
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()
  res.headers.set("X-Robots-Tag", "noindex, nofollow")

  if (pathname === "/login" || pathname === "/api/auth/login") return res

  if (await sessionValid(req.cookies.get("fc_admin")?.value)) return res

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const url = req.nextUrl.clone()
  url.pathname = "/login"
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
