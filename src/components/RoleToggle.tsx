"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRole } from "@/app/actions";

export default function RoleToggle({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isAdmin = role === "ADMIN";

  function change() {
    setError(null);
    startTransition(async () => {
      const res = await setRole(userId, isAdmin ? "MEMBER" : "ADMIN");
      if (res && "error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button
        className="btn btn-secondary py-1 px-2.5 text-xs"
        onClick={change}
        disabled={pending}
        title={isSelf && isAdmin ? "Removing your own admin access" : undefined}
      >
        {pending ? "…" : isAdmin ? "Remove admin" : "Make admin"}
      </button>
      {error && <span className="text-[11px] text-danger mt-1 max-w-[180px] text-right">{error}</span>}
    </div>
  );
}
