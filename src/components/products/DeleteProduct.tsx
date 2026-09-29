"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDelete } from "@/components/display"
import { useToast } from "@/components/feedback"
import { deleteProductAction } from "@/app/(app)/actions"

export function DeleteProductButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const push = useToast()
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center rounded-control border border-bad/50 px-4 text-sm font-medium text-bad transition hover:bg-bad/10"
      >
        Delete
      </button>
      {open && (
        <ConfirmDelete
          what={title}
          pending={pending}
          onClose={() => setOpen(false)}
          onConfirm={async () => {
            setPending(true)
            const res = await deleteProductAction(id)
            setPending(false)
            if (!res.ok) {
              push(false, res.error ?? "Couldn't delete")
              setOpen(false)
              return
            }
            push(true, "Product deleted")
            router.push("/products")
            router.refresh()
          }}
        />
      )}
    </>
  )
}
