import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto"

/**
 * TOTP (RFC 6238) + secret-at-rest encryption. node:crypto only, no deps.
 * Server-only — never import from a client component.
 */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ""
  for (const b of buf) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[\s=]/g, "")
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = B32.indexOf(ch)
    if (idx < 0) throw new Error("bad base32")
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

function hotp(secretB32: string, counter: number): string {
  const key = base32Decode(secretB32)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const mac = createHmac("sha1", key).update(buf).digest()
  const off = mac[mac.length - 1] & 15
  const code =
    (((mac[off] & 127) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3]) % 1_000_000
  return String(code).padStart(6, "0")
}

/** Current 6-digit code for a base32 secret. */
export function totpNow(secret: string, at = Date.now()): string {
  return hotp(secret, Math.floor(at / 1000 / 30))
}

/** Accept codes from ±window steps (clock drift; default ±1 = ±30s). */
export function totpVerify(secret: string, code: string, at = Date.now(), window = 1): boolean {
  const clean = code.replace(/\D/g, "")
  if (clean.length !== 6) return false
  const now = Math.floor(at / 1000 / 30)
  const given = Buffer.from(clean)
  for (let w = -window; w <= window; w++) {
    if (timingSafeEqual(Buffer.from(hotp(secret, now + w)), given)) return true
  }
  return false
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20))
}

export function otpauthUri(account: string, secret: string, issuer = "Flowcase Admin"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

/* ── secret at rest (AES-256-GCM, key derived from the session secret) ── */

function encKey(): Buffer {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set")
  return scryptSync(s, "fc-totp-enc", 32)
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv)
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return `${iv.toString("base64url")}.${ct.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`
}

export function decryptSecret(token: string): string {
  const [ivs, cts, tags] = token.split(".")
  if (!ivs || !cts || !tags) throw new Error("bad token")
  const d = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivs, "base64url"))
  d.setAuthTag(Buffer.from(tags, "base64url"))
  return Buffer.concat([d.update(Buffer.from(cts, "base64url")), d.final()]).toString("utf8")
}

/* ── backup codes (one-time, stored hashed) ── */

export function newBackupCodes(n = 10): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: n }, () => {
    const h = randomBytes(5).toString("hex").toUpperCase()
    return `${h.slice(0, 4)}-${h.slice(4, 10)}`
  })
  return { plain, hashed: plain.map(hashBackup) }
}

function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function hashBackup(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex")
}

/* ── self-check: node --experimental-strip-types src/lib/totp.ts ── */

function selfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`FAIL ${msg}`)
  }
  const round = base32Decode(base32Encode(Buffer.from("hello world")))
  assert(round.toString() === "hello world", "base32 roundtrip")
  // RFC 4226 appendix D: secret "12345678901234567890", counter 0 → 755224
  const rfcSecret = base32Encode(Buffer.from("12345678901234567890"))
  const step = Math.floor(Date.now() / 30000)
  assert(hotp(rfcSecret, 0) === "755224", "RFC4226 vector 0")
  assert(hotp(rfcSecret, 1) === "287082", "RFC4226 vector 1")
  const code = totpNow(rfcSecret)
  assert(totpVerify(rfcSecret, code), "verify current")
  assert(totpVerify(rfcSecret, totpNow(rfcSecret, (step + 1) * 30000), Date.now(), 1), "verify +1 step")
  assert(!totpVerify(rfcSecret, "000000", Date.now(), 0) || totpNow(rfcSecret) === "000000", "reject wrong")
  assert(!totpVerify(rfcSecret, "12345"), "reject 5 digits")
  process.env.ADMIN_SESSION_SECRET ??= "test-secret"
  const enc = encryptSecret(rfcSecret)
  assert(decryptSecret(enc) === rfcSecret, "encrypt/decrypt roundtrip")
  const { plain, hashed } = newBackupCodes(4)
  assert(plain.length === 4 && hashed.every((h) => h.length === 64), "backup codes hashed")
  assert(hashBackup(plain[0]) === hashed[0], "backup hash matches")
  console.log("totp self-check OK")
}

if (process.argv[1]?.endsWith("totp.ts")) selfCheck()
