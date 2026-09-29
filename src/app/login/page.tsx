"use client"

import { useState, type FormEvent } from "react"
import { Field, TextInput } from "@/components/forms"

type Phase = "form" | "checking" | "success" | "denied"

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
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      setPhase("success")
      setTimeout(() => {
        window.location.href = "/"
      }, 1100)
      return
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    setError(data.error === "locked_out" ? "Too many attempts — try again in 10 minutes." : "Wrong email or password.")
    setPassword("")
    setPhase("denied")
    setTimeout(() => setPhase("form"), 1600)
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* brand panel */}
      <div className="order-2 flex flex-col items-center justify-center bg-ink px-8 py-14 text-center text-paper lg:order-1 lg:w-1/2">
        <p className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Flowcase.</p>
        <p className="label mt-3 text-paper/60">Go with flow · Admin</p>
        <p className="mt-5 max-w-xs text-sm leading-relaxed text-paper/60">
          Drop-tested cases, audio and charging — managed in one calm place.
        </p>
      </div>
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
              <button
                type="submit"
                disabled={phase !== "form"}
                className="inline-flex h-11 w-full items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
              >
                {phase === "checking" ? "Checking…" : "Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
