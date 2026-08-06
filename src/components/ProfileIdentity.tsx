"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyDetails, updateMyAvatar } from "@/app/actions";
import { resizeToSquareDataUrl } from "@/lib/image";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";

export default function ProfileIdentity({
  name: initialName,
  title: initialTitle,
  avatar: initialAvatar,
  refreshedLabel,
  stale,
  owner = false,
}: {
  name: string;
  title: string | null;
  avatar: string | null;
  refreshedLabel: string | null;
  stale: boolean;
  owner?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [avatar, setAvatar] = useState(initialAvatar);
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [editing, setEditing] = useState(false);

  function onPhoto(file: File) {
    setError(null);
    startTransition(async () => {
      try {
        const dataUrl = await resizeToSquareDataUrl(file);
        const res = await updateMyAvatar(dataUrl);
        if ("error" in res) setError(res.error);
        else {
          setAvatar(dataUrl);
          router.refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not use that image.");
      }
    });
  }

  function removePhoto() {
    setError(null);
    startTransition(async () => {
      const res = await updateMyAvatar(null);
      if ("error" in res) setError(res.error);
      else {
        setAvatar(null);
        router.refresh();
      }
    });
  }

  function saveDetails() {
    setError(null);
    if (!name.trim()) return setError("Enter your name.");
    startTransition(async () => {
      const res = await updateMyDetails({ name: name.trim(), title: title.trim() || null });
      if ("error" in res) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-start gap-4">
      <div className="relative shrink-0">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="w-14 h-14 rounded-2xl object-cover" />
        ) : (
          <span
            className="grid place-items-center w-14 h-14 rounded-2xl text-lg font-bold"
            style={{ background: avatarColor(name), color: avatarInkColor(name) }}
            aria-hidden
          >
            {initials(name)}
          </span>
        )}
        {owner && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPhoto(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              aria-label="Change photo"
              className="absolute -bottom-1.5 -right-1.5 grid place-items-center w-6 h-6 rounded-full bg-accent text-on-accent shadow"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            </button>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2 max-w-sm">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your title (optional)" />
            <div className="flex items-center gap-2">
              <button className="btn btn-primary py-1.5 px-3 text-sm" disabled={pending} onClick={saveDetails}>
                {pending ? "Saving…" : "Save"}
              </button>
              <button className="btn btn-ghost py-1.5 px-3 text-sm" disabled={pending} onClick={() => { setEditing(false); setName(initialName); setTitle(initialTitle ?? ""); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
              {owner && (
                <button className="text-xs text-faint hover:text-ink-soft underline" onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
            </div>
            <p className="text-muted">{title || "Team member"}</p>
            {refreshedLabel && (
              <p className="text-xs text-faint mt-1">
                Last refreshed {refreshedLabel}
                {stale && <span className="text-warn font-medium"> · refresh due</span>}
              </p>
            )}
            {owner && avatar && (
              <button className="text-xs text-faint hover:text-ink-soft underline mt-1" disabled={pending} onClick={removePhoto}>
                Remove photo
              </button>
            )}
          </>
        )}
        {error && <p className="text-sm text-danger mt-2">{error}</p>}
      </div>
    </div>
  );
}
