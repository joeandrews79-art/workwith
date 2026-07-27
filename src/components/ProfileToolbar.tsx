"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setShared, deleteMyProfileData } from "@/app/actions";

export default function ProfileToolbar({
  shared,
  edited,
}: {
  shared: boolean;
  edited: boolean;
}) {
  const router = useRouter();
  const [isShared, setIsShared] = useState(shared);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleShare() {
    const next = !isShared;
    setIsShared(next);
    startTransition(async () => {
      await setShared(next);
      router.refresh();
    });
  }

  function onDelete() {
    startTransition(async () => {
      await deleteMyProfileData();
      setConfirmDelete(false);
      router.refresh();
    });
  }

  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Share switch */}
        <button
          type="button"
          onClick={toggleShare}
          disabled={pending}
          className="flex items-center gap-3"
          aria-pressed={isShared}
        >
          <span
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{ background: isShared ? "var(--color-brand-600)" : "#d6d3d1" }}
          >
            <span
              className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow"
              style={{ transform: isShared ? "translateX(22px)" : "translateX(2px)" }}
            />
          </span>
          <span className="text-left">
            <span className="block text-sm font-semibold">
              {isShared ? "Shared with your team" : "Private to you"}
            </span>
            <span className="block text-xs text-stone-500">
              {isShared
                ? "Teammates can view this profile"
                : "Turn on to let teammates see it"}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <Link href="/me/edit" className="btn btn-secondary py-1.5 text-sm">
            {edited ? "Edit wording" : "Personalize wording"}
          </Link>
          <a href="/report" className="btn btn-secondary py-1.5 text-sm">
            PDF report
          </a>
          <a href="/api/export" className="btn btn-ghost py-1.5 text-sm">
            Export
          </a>
          <button
            className="btn btn-danger py-1.5 text-sm"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <p className="text-sm text-stone-700 font-medium">
            Delete your assessment and profile data?
          </p>
          <p className="text-sm text-stone-500 mt-1">
            This permanently removes your responses, scores, and profile. Your
            login stays, and you can retake the assessment anytime. This cannot be
            undone.
          </p>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-danger py-1.5 text-sm" onClick={onDelete} disabled={pending}>
              {pending ? "Deleting…" : "Yes, delete my data"}
            </button>
            <button className="btn btn-ghost py-1.5 text-sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
