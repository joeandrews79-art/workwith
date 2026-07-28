import { MeetingBrief } from "@/lib/meeting";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";

/**
 * Presentational render of a computed meeting brief. Pure (no hooks), so it is
 * used both in the live composer preview and on the saved-meeting page.
 */
export default function MeetingBriefView({ brief }: { brief: MeetingBrief }) {
  return (
    <div className="space-y-6">
      {/* Type lens */}
      {brief.lens && (
        <section
          className="card p-5"
          style={{ background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--accent-text)" }}><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></svg>
            <h2 className="font-semibold">{brief.lens.label}</h2>
          </div>
          <p className="text-sm text-stone-600 mb-3">{brief.lens.framing}</p>
          <ul className="space-y-2.5">
            {brief.lens.pointers.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-stone-800">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-brand-600)" }} />
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Group dynamic */}
      <section className="card p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--accent-text)" }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          The room
        </h2>
        <ul className="space-y-2.5">
          {brief.groupDynamic.map((g, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-stone-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--trait-n)" }} />
              <span className="leading-relaxed">{g}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Your play */}
      <section className="card p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--accent-text)" }}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
          How to show up
        </h2>
        <p className="text-sm text-stone-500 mb-3">
          Tuned to your profile and the mix of people in this meeting.
        </p>
        <ul className="space-y-2.5">
          {brief.yourPlay.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-stone-800">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-brand-600)" }} />
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Per-person tips */}
      {brief.participants.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Each person</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {brief.participants.map((p) => (
              <div key={p.id} className="card p-4 flex items-start gap-3">
                <span
                  className="grid place-items-center w-10 h-10 rounded-full text-xs font-bold shrink-0"
                  style={{ background: avatarColor(p.name), color: avatarInkColor(p.name) }}
                  aria-hidden
                >
                  {initials(p.name)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-[11px] text-stone-400 mb-1">Stands out on {p.topTrait.toLowerCase()}</p>
                  <p className="text-sm text-stone-600 leading-relaxed">{p.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
