"use client"

import { Check, EyeOff, MessageSquare, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDelete } from "@/components/display"
import { Modal } from "@/components/ui/dialog"
import { useToast } from "@/components/feedback"
import { ActionMenu } from "@/components/ui/dropdown-menu"
import { replyReviewAction, setReviewStatusAction, deleteReviewAction } from "@/app/(app)/actions"
import type { Review } from "@/lib/types"

export function ReviewActions({ review }: { review: Review }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [reply, setReply] = useState(review.reply ?? "")
  const [pending, setPending] = useState(false)
  const push = useToast()
  const router = useRouter()

  const setStatus = async (status: Review["status"], message: string) => {
    setPending(true)
    const res = await setReviewStatusAction(review.id, status)
    setPending(false)
    push(res.ok, res.ok ? message : res.error ?? "Couldn't update")
    if (res.ok) router.refresh()
  }

  const items = [
    { label: "Reply", icon: <MessageSquare className="h-4 w-4" />, onSelect: () => setReplyOpen(true) },
    ...(review.status !== "approved"
      ? [
          {
            label: "Approve",
            icon: <Check className="h-4 w-4" />,
            onSelect: () => setStatus("approved", "Review approved"),
          },
        ]
      : []),
    ...(review.status !== "hidden"
      ? [
          {
            label: "Hide",
            icon: <EyeOff className="h-4 w-4" />,
            onSelect: () => setStatus("hidden", "Review hidden"),
          },
        ]
      : []),
    { label: "Delete", danger: true, icon: <Trash2 className="h-4 w-4" />, onSelect: () => setConfirmDelete(true) },
  ]

  return (
    <>
      <ActionMenu label={`Actions for review by ${review.name}`} items={items} />

      <Modal
        title="Reply to review"
        description={`${review.name} · ${review.rating}★${review.title ? ` · ${review.title}` : ""}`}
        open={replyOpen}
        onOpenChange={setReplyOpen}
        footer={
          <>
            <button
              type="button"
              onClick={() => setReplyOpen(false)}
              disabled={pending}
              className="h-11 rounded-control border border-line px-5 text-sm transition hover:border-ink disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !reply.trim()}
              onClick={async () => {
                setPending(true)
                const res = await replyReviewAction(review.id, reply.trim())
                setPending(false)
                push(res.ok, res.ok ? "Reply published" : res.error ?? "Couldn't reply")
                if (res.ok) {
                  setReplyOpen(false)
                  router.refresh()
                }
              }}
              className="h-11 rounded-control bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-50"
            >
              {pending ? "Publishing…" : "Publish reply"}
            </button>
          </>
        }
      >
        <label htmlFor={`reply-${review.id}`} className="label text-faint">
          Public reply — shown under the review on the storefront
        </label>
        <textarea
          id={`reply-${review.id}`}
          value={reply}
          rows={4}
          maxLength={2000}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Thanks for the kind words!"
          className="mt-2 w-full rounded-control border border-line bg-paper px-3 py-2 text-sm transition placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        />
        <p className="label mt-1 text-right text-faint">{reply.length}/2000</p>
      </Modal>

      {confirmDelete && (
        <ConfirmDelete
          what="this review"
          pending={pending}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setPending(true)
            const res = await deleteReviewAction(review.id)
            setPending(false)
            setConfirmDelete(false)
            push(res.ok, res.ok ? "Review deleted" : res.error ?? "Couldn't delete")
            if (res.ok) router.refresh()
          }}
        />
      )}
    </>
  )
}
