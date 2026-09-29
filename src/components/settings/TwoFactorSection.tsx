"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge, CopyButton } from "@/components/display"
import { useToast } from "@/components/feedback"
import { Field, TextInput } from "@/components/forms"
import { confirmTotpAction, disableTotpAction, startTotpAction } from "@/app/(app)/actions"

type Setup = { secret: string; uri: string; qr: string }

const btn =
  "inline-flex h-10 items-center justify-center rounded-control bg-ink px-4 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
const btnGhost =
  "inline-flex h-10 items-center justify-center rounded-control border border-line px-4 text-sm transition hover:border-ink disabled:opacity-50"
const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-control border border-bad/40 px-4 text-sm text-bad transition hover:bg-bad/10 disabled:opacity-50"

export function TwoFactorSection({ confirmed }: { confirmed: boolean }) {
  const push = useToast()
  const router = useRouter()
  const [enabled, setEnabled] = useState(confirmed)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [backup, setBackup] = useState<string[] | null>(null)
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  const busy = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setPending(true)
    setError("")
    try {
      return await fn()
    } finally {
      setPending(false)
    }
  }

  const start = async () => {
    const res = await busy(() => startTotpAction())
    if (res?.ok) setSetup(res.data as Setup)
    else if (res) push(false, res.error ?? "Couldn't start setup")
  }

  const confirm = async () => {
    if (!code.trim()) return setError("Enter the 6-digit code")
    const res = await busy(() => confirmTotpAction(code.trim()))
    if (res?.ok) {
      setBackup((res.data as { backupCodes: string[] }).backupCodes)
      setEnabled(true)
      setSetup(null)
      setCode("")
      push(true, "Two-factor authentication enabled ✓")
    } else if (res) {
      setError(res.error ?? "Wrong code")
    }
  }

  const disable = async () => {
    if (!code.trim()) return setError("Enter the 6-digit code")
    const res = await busy(() => disableTotpAction(code.trim()))
    if (res?.ok) {
      setEnabled(false)
      setCode("")
      push(true, "Two-factor authentication disabled")
      router.refresh()
    } else if (res) {
      setError(res.error ?? "Wrong code")
    }
  }

  if (backup) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">
          <strong>Save these backup codes now.</strong> Each works once if you lose your
          authenticator — they won&apos;t be shown again.
        </p>
        <div className="grid max-w-md grid-cols-2 gap-2 rounded-card border border-line bg-wash p-4 font-mono text-sm">
          {backup.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <CopyButton text={backup.join("\n")} label="Copy all codes" />
          <button
            type="button"
            className={btn}
            onClick={() => {
              setBackup(null)
              router.refresh()
            }}
          >
            I&apos;ve saved them
          </button>
        </div>
      </div>
    )
  }

  if (setup) {
    return (
      <div className="space-y-5">
        <p className="max-w-lg text-sm text-faint">
          Scan this QR with Google Authenticator, 1Password, Authy, or any TOTP app — then enter
          the 6-digit code it shows to activate.
        </p>
        <div className="flex flex-wrap items-start gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="2FA setup QR code" className="rounded-card border border-line" width={168} height={168} />
          <div className="space-y-3">
            <div>
              <p className="label text-faint">Manual entry key</p>
              <div className="mt-1 flex items-center gap-3">
                <code className="font-mono text-sm tracking-widest">{setup.secret}</code>
                <CopyButton text={setup.secret} label="Copy key" />
              </div>
            </div>
            <Field label="Authentication code" htmlFor="twofa-confirm" required error={error || undefined}>
              <TextInput
                id="twofa-confirm"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="max-w-[10rem]"
              />
            </Field>
            <div className="flex gap-2">
              <button type="button" className={btn} disabled={pending} onClick={confirm}>
                {pending ? "Checking…" : "Confirm & activate"}
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={pending}
                onClick={() => {
                  setSetup(null)
                  setCode("")
                  setError("")
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge tone="ok">enabled</Badge>
          <p className="text-sm text-faint">
            A 6-digit authenticator code (or backup code) is required at every login.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Current code" htmlFor="twofa-disable" hint="Confirm to turn 2FA off">
            <TextInput
              id="twofa-disable"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="max-w-[10rem]"
            />
          </Field>
          <button type="button" className={btnDanger} disabled={pending} onClick={disable}>
            {pending ? "Disabling…" : "Disable 2FA"}
          </button>
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Badge tone="neutral">off</Badge>
      <p className="min-w-64 flex-1 text-sm text-faint">
        Adds a rotating 6-digit code from your phone on top of the password.
      </p>
      <button type="button" className={btn} disabled={pending} onClick={start}>
        {pending ? "Starting…" : "Enable 2FA"}
      </button>
    </div>
  )
}
