"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ConfirmDelete } from "@/components/display"
import { useToast } from "@/components/feedback"
import { Field, TextInput } from "@/components/forms"
import { addImageAction, deleteImageAction, swapImageAction, uploadImageAction } from "@/app/(app)/actions"
import type { Product } from "@/lib/types"

export function ImagesPanel({ product }: { product: Product }) {
  const push = useToast()
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const images = [...product.images].sort((a, b) => a.position - b.position)

  const run = async (ok: boolean, message: string) => {
    push(ok, message)
    if (ok) router.refresh()
    return ok
  }

  const addUrl = async () => {
    if (!/^https:\/\//.test(url)) {
      push(false, "Need an https:// URL")
      return
    }
    setBusy(true)
    const res = await addImageAction(product.id, url)
    setBusy(false)
    if (await run(res.ok, res.ok ? "Image added ✓" : (res.error ?? "Couldn't add"))) setUrl("")
  }

  const upload = async (file: File) => {
    const form = new FormData()
    form.set("file", file)
    setBusy(true)
    const res = await uploadImageAction(product.id, form)
    setBusy(false)
    await run(res.ok, res.ok ? "Uploaded ✓" : (res.error ?? "Upload failed"))
    if (fileRef.current) fileRef.current.value = ""
  }

  const move = async (index: number, dir: -1 | 1) => {
    const target = images[index + dir]
    const current = images[index]
    if (!target) return
    const res = await swapImageAction(
      product.id,
      { id: current.id, position: current.position },
      { id: target.id, position: target.position }
    )
    await run(res.ok, res.ok ? "Order updated" : (res.error ?? "Couldn't reorder"))
  }

  return (
    <div className="space-y-5">
      {images.length === 0 ? (
        <p className="text-sm text-faint">No images yet — add by URL or upload a file.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="group relative overflow-hidden rounded-control border border-line">
              <Image
                src={img.url}
                alt=""
                width={300}
                height={380}
                className="aspect-[4/5] w-full bg-wash object-cover"
              />
              <span className="label absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-1 text-paper">
                #{i + 1}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/75 px-2 py-1.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move image earlier"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-paper transition hover:bg-paper/20 disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === images.length - 1}
                    aria-label="Move image later"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-paper transition hover:bg-paper/20 disabled:opacity-30"
                  >
                    →
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmId(img.id)}
                  aria-label="Remove image"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-paper transition hover:bg-bad"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Add image URL" htmlFor="img-url" hint="https://… (Supabase, Cloudinary, …)">
          <div className="flex gap-2">
            <TextInput
              id="img-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/case.webp"
            />
            <button
              type="button"
              onClick={addUrl}
              disabled={busy || !url.trim()}
              className="h-11 shrink-0 rounded-control border border-ink px-4 text-sm font-medium transition hover:bg-ink hover:text-paper disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </Field>
        <Field label="Upload a file" htmlFor="img-file" hint="Images up to 5 MB">
          <div className="flex gap-2">
            <input
              ref={fileRef}
              id="img-file"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void upload(f)
              }}
              className="h-11 w-full cursor-pointer rounded-control border border-line bg-transparent px-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-wash file:px-3 file:py-1.5 file:text-xs file:font-medium"
            />
          </div>
        </Field>
      </div>

      {confirmId && (
        <ConfirmDelete
          what="this image"
          onClose={() => setConfirmId(null)}
          onConfirm={async () => {
            const res = await deleteImageAction(confirmId, product.id)
            setConfirmId(null)
            await run(res.ok, res.ok ? "Image removed" : (res.error ?? "Couldn't remove"))
          }}
        />
      )}
    </div>
  )
}
