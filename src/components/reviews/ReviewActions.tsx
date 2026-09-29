"use client"

import { Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDelete } from "@/components/display"
import { useToast } from "@/components/feedback"
import { ActionMenu } from "@/components/ui/dropdown-menu"
import { deleteReviewAction } from "@/app/(app)/actions"

export function ReviewActions({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const push = useToast()
  const router = useRouter()

  return (
    <>
      <ActionMenu
        label="Review actions"
        items={[
          { label: "Delete", danger: true, icon: <Trash2 className="h-4 w-4" />, onSelect: () => setOpen(true) },
        ]}
      />
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
