"use client";

import Link from "next/link";
import { ymd, todayKey, fmtTime, fmtTimeRange } from "@/lib/calendar";

export interface TodayMeetingItem {
  id: string;
  title: string;
  typeLabel: string;
  day: string | null; // yyyy-mm-dd
  startMinute: number | null;
  durationMin: number | null;
  teamName: string;
  people: number;
}

export default function TodayMeetings({ meetings }: { meetings: TodayMeetingItem[] }) {
  const today = ymd(todayKey());
  const mine = meetings
    .filter((m) => m.day === today)
    .sort((a, b) => (a.startMinute ?? 1e9) - (b.startMinute ?? 1e9));

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-semibold">Today's meetings</h2>
        <Link href="/meeting" className="text-sm text-stone-500 hover:text-stone-700">Open calendar</Link>
      </div>
      {mine.length === 0 ? (
        <div className="card p-5 text-sm text-stone-500">Nothing on your calendar today.</div>
      ) : (
        <div className="card divide-y divide-stone-100 overflow-hidden">
          {mine.map((m) => (
            <Link key={m.id} href={`/meeting/${m.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50 transition-colors">
              <div className="w-24 shrink-0 text-sm tabular-nums">
                {m.startMinute != null ? (
                  <span className="font-medium">{fmtTime(m.startMinute)}</span>
                ) : (
                  <span className="text-stone-400">All day</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{m.title}</span>
                  <span className="pill text-[10px]" style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}>{m.typeLabel}</span>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {m.startMinute != null && <>{fmtTimeRange(m.startMinute, m.durationMin)} · </>}
                  {m.people} {m.people === 1 ? "person" : "people"} · {m.teamName}
                </div>
              </div>
              <span className="text-sm text-stone-400 shrink-0 hidden sm:inline">Prep →</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
