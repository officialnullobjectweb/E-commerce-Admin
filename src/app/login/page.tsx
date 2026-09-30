"use client"

import { useRef, useState, type FormEvent } from "react"
import { Field, TextInput } from "@/components/forms"

type Phase = "form" | "checking" | "success" | "denied"

const SHOWCASE = [
  { n: "01", label: "Catalog", note: "Products, variants, badges" },
  { n: "02", label: "Orders & shipping", note: "Fulfil, track, resolve" },
  { n: "03", label: "Inventory", note: "Stock levels & adjustments" },
  { n: "04", label: "Reports & GST", note: "Revenue, tax, reconciliations" },
]

function Showcase() {
  const panelRef = useRef<HTMLDivElement>(null)

  const track = (e: React.PointerEvent) => {
    const el = panelRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
    el.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
    el.style.setProperty("--spot", "1")
  }
  const leave = () => panelRef.current?.style.setProperty("--spot", "0")

  return (
    <div
      ref={panelRef}
      onPointerMove={track}
      onPointerLeave={leave}
      className="login-showcase relative order-2 flex flex-col items-center justify-center overflow-hidden bg-ink px-8 py-14 text-center text-paper lg:order-1 lg:w-1/2"
    >
      {/* dot grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.16]" aria-hidden
        style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
      {/* cursor spotlight */}
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-500 opacity-[var(--spot,0)]" aria-hidden
        style={{ background: "radial-gradient(420px circle at var(--mx,50%) var(--my,50%), rgba(245,243,238,0.10), transparent 65%)" }} />
      {/* slow orbit ring */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-paper/[0.07]" aria-hidden>
        <div className="login-orbit absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper/50" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <p className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl" aria-label="Flowcase.">
          {"Flowcase.".split("").map((ch, i) => (
            <span key={i} className="login-letter inline-block" style={{ animationDelay: `${i * 45}ms` }} aria-hidden>
              {ch}
            </span>
          ))}
        </p>
        <p className="label mt-3 text-paper/60">Go with flow · Admin</p>
        <p className="mt-5 max-w-xs text-sm leading-relaxed text-paper/60">
          Drop-tested cases, audio and charging — managed in one calm place.
        </p>

        <ul className="mt-10 w-full space-y-1 text-left">
          {SHOWCASE.map((item) => (
            <li key={item.n} className="login-row group flex items-center gap-4 rounded-control border border-transparent px-4 py-3 transition-colors duration-200 hover:border-paper/15 hover:bg-paper/[0.06]">
              <span className="label w-6 text-paper/40 transition-colors duration-200 group-hover:text-paper">{item.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block truncate text-xs text-paper/45 transition-colors duration-200 group-hover:text-paper/70">{item.note}</span>
              </span>
              <span className="translate-x-0 text-paper/30 transition-all duration-200 group-hover:translate-x-1 group-hover:text-paper" aria-hidden>→</span>
            </li>
          ))}
        </ul>

        <p className="label mt-10 text-paper/35">Secure access · session-bound</p>
      </div>

      <style>{`
        .login-letter { animation: login-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes login-rise { from { opacity: 0; transform: translateY(0.55em); } to { opacity: 1; transform: none; } }
        .login-orbit { animation: login-orbit 7s linear infinite; }
        @keyframes login-orbit { from { transform: translate(-50%, -50%) rotate(0deg) translateY(-280px); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateY(-280px); } }
        .login-row { opacity: 0; animation: login-fade 0.5s ease-out both; }
        .login-row:nth-child(1) { animation-delay: 0.35s; }
        .login-row:nth-child(2) { animation-delay: 0.45s; }
        .login-row:nth-child(3) { animation-delay: 0.55s; }
        .login-row:nth-child(4) { animation-delay: 0.65s; }
        @keyframes login-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .login-letter, .login-orbit, .login-row { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function SuccessMark() {
  return (
    <svg viewBox="0 0 72 72" className="h-20 w-20" role="img" aria-label="Signed in">
      <circle cx="36" cy="36" r="33" fill="none" strokeWidth="3" stroke="currentColor" strokeDasharray="208" strokeDashoffset="208" className="login-draw" />
      <path d="M22 37.5 32 47l18-21" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeDasharray="60" strokeDashoffset="60" className="login-draw-late" />
      <style>{`
        .login-draw { animation: login-draw 0.7s ease-out forwards; }
        .login-draw-late { animation: login-draw 0.45s ease-out 0.5s forwards; }
        @keyframes login-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .login-draw, .login-draw-late { animation-duration: 0.01ms; } }
      `}</style>
    </svg>
  )
}

function DeniedMark() {
  return (
    <svg viewBox="0 0 72 72" className="h-20 w-20 login-shake" role="img" aria-label="Access denied">
      <circle cx="36" cy="36" r="33" fill="none" strokeWidth="3" className="stroke-bad" />
      <path d="M26 26l20 20M46 26L26 46" strokeWidth="4" strokeLinecap="round" className="stroke-bad" />
      <style>{`
        .login-shake { animation: login-shake 0.45s ease-out; }
        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-7px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(3px); }
        }
        @media (prefers-reduced-motion: reduce) { .login-shake { animation: none; } }
      `}</style>
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [totp, setTotp] = useState("")
  const [needTotp, setNeedTotp] = useState(false)
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [phase, setPhase] = useState<Phase>("form")

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (phase !== "form") return
    setPhase("checking")
    setError("")
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, totp }),
    })
    if (res.ok) {
      setPhase("success")
      setTimeout(() => {
        window.location.href = "/"
      }, 1100)
      return
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (data.error === "totp_required") {
      setNeedTotp(true)
      setPhase("form")
      setError("")
      document.getElementById("totp")?.focus()
      return
    }
    if (data.error === "bad_totp") {
      setError("That code didn't match. Try the current code.")
      setTotp("")
      setPhase("form")
      setTimeout(() => document.getElementById("totp")?.focus(), 0)
      return
    }
    setError(data.error === "locked_out" ? "Too many attempts — try again in 10 minutes." : "Wrong email or password.")
    setPassword("")
    setPhase("denied")
    setTimeout(() => setPhase("form"), 1600)
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* brand panel */}
      <Showcase />
      {/* form */}
      <div className="order-1 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-14 sm:px-6 lg:order-2">
        {phase === "success" ? (
          <div className="flex flex-col items-center text-center" role="status">
            <SuccessMark />
            <h1 className="font-display mt-6 text-2xl font-bold">Welcome back.</h1>
            <p className="label mt-2 text-faint">Taking you to your dashboard…</p>
          </div>
        ) : phase === "denied" ? (
          <div className="rounded-card border border-bad/40 p-8 text-center" role="alert">
            <DeniedMark />
            <h1 className="font-display mt-4 text-xl font-bold">Access denied</h1>
            <p className="mt-2 text-sm text-faint">{error}</p>
          </div>
        ) : (
          <>
            <p className="font-display text-2xl font-bold lg:hidden">Flowcase.</p>
            <h1 className="font-display mt-3 text-3xl font-bold lg:mt-0">Sign in</h1>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <Field label="Email" htmlFor="email" hint="leave blank if not configured">
                <TextInput
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@flowcase.in"
                />
              </Field>
              <Field label="Password" htmlFor="password" required>
                <div className="relative">
                  <TextInput
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                    aria-pressed={show}
                    className="label absolute right-1 top-1/2 -translate-y-1/2 px-3 py-2 text-faint transition hover:text-ink"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </Field>
              {needTotp && (
                <Field label="Authentication code" htmlFor="totp" required hint="6 digits from your authenticator, or a backup code">
                  <TextInput
                    id="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    placeholder="123456"
                  />
                </Field>
              )}
              {error && phase === "form" && (
                <p role="alert" className="text-sm text-bad">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={phase !== "form"}
                className="inline-flex h-11 w-full items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
              >
                {phase === "checking" ? "Checking…" : needTotp ? "Verify & sign in" : "Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
