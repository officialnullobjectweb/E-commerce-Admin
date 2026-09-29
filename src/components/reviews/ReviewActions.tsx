"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDelete } from "@/components/display"
import { useToast } from "@/components/feedback"
import { deleteReviewAction } from "@/app/(app)/actions"

export function ReviewActions({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const push = useToast()
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="label text-faint transition hover:text-bad"
      >
        Delete
      </button>
      {open && (
        <ConfirmDelete
          what="this review"
          pending={pending}
          onClose={() => setOpen(false)}
          onConfirm={async () => {
            setPending(true)
            const res = await deleteReviewAction(id)
            setPending(false)
            setOpen(false)
            push(res.ok, res.ok ? "Review deleted" : (res.error ?? "Couldn't delete"))
            if (res.ok) router.refresh()
          }}
        />
      )}
    </>
  )
}
