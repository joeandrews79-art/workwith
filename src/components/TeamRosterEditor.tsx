"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  renameTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  setTeamRole,
} from "@/app/actions";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";

interface Person {
  id: string;
  name: string;
  title: string | null;
  teamRole?: "LEADER" | "MEMBER";
}

/**
 * Manage one team's roster: rename, add/remove people, and set each person's
 * leader/member role. Reused by the org-admin teams page and the leader's own
 * "manage team" page. `canDelete` is admin-only (deleting is an org-wide op).
 */
export default function TeamRosterEditor({
  teamId,
  teamName,
  members,
  candidates,
  canDelete = false,
}: {
  teamId: string;
  teamName: string;
  members: Person[];
  candidates: Person[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(teamName);
  const [addId, setAddId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameDirty = name.trim() !== teamName && name.trim().length > 0;

  function run(fn: () => Promise<{ error?: string } | { ok?: boolean } | void>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  }

  const leaderCount = members.filter((m) => m.teamRole === "LEADER").length;

  return (
    <div className="card p-5 space-y-4">
      {/* Rename */}
      <div className="flex items-center gap-2">
        <input
          className="input flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Team name"
        />
        <button
          className="btn btn-secondary shrink-0"
          disabled={!nameDirty || pending}
          onClick={() => run(() => renameTeam(teamId, name))}
        >
          Save name
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Members */}
      <div>
        <p className="label mb-2">
          Members · {members.length}
          {leaderCount > 0 && ` · ${leaderCount} leader${leaderCount > 1 ? "s" : ""}`}
        </p>
        {members.length === 0 ? (
          <p className="text-sm text-stone-500">No one on this team yet. Add someone below.</p>
        ) : (
          <ul className="divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className="grid place-items-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
                  style={{ background: avatarColor(m.name), color: avatarInkColor(m.name) }}
                  aria-hidden
                >
                  {initials(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate text-sm">{m.name}</div>
                  <div className="text-xs text-stone-500 truncate">{m.title ?? "Team member"}</div>
                </div>
                <select
                  className="input py-1 px-2 text-xs w-auto"
                  value={m.teamRole ?? "MEMBER"}
                  disabled={pending}
                  onChange={(e) =>
                    run(() => setTeamRole(teamId, m.id, e.target.value as "LEADER" | "MEMBER"))
                  }
                  aria-label={`Role for ${m.name}`}
                >
                  <option value="MEMBER">Member</option>
                  <option value="LEADER">Leader</option>
                </select>
                <button
                  className="btn btn-ghost py-1 px-2 text-xs text-red-700"
                  disabled={pending}
                  onClick={() => run(() => removeTeamMember(teamId, m.id))}
                  aria-label={`Remove ${m.name} from ${teamName}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add member */}
      <div className="flex items-center gap-2">
        <select
          className="input flex-1"
          value={addId}
          disabled={pending || candidates.length === 0}
          onChange={(e) => setAddId(e.target.value)}
          aria-label="Person to add"
        >
          <option value="">
            {candidates.length === 0 ? "Everyone in the org is already here" : "Add a person…"}
          </option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.title ? ` — ${c.title}` : ""}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary shrink-0"
          disabled={!addId || pending}
          onClick={() => {
            const id = addId;
            setAddId("");
            run(() => addTeamMember(teamId, id));
          }}
        >
          Add
        </button>
      </div>

      {canDelete && (
        <div className="pt-2 border-t border-stone-100">
          <button
            className="btn btn-ghost text-xs text-red-700"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete "${teamName}"? People stay in the org and on their other teams.`))
                run(() => deleteTeam(teamId));
            }}
          >
            Delete this team
          </button>
        </div>
      )}
    </div>
  );
}
