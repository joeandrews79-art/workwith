import { AssembledProfile } from "@/lib/profile";
import { DomainCode, DOMAIN_ORDER, DOMAINS, FACETS } from "@/lib/ipip";
import { SECTION_LABELS, SectionKey } from "@/lib/narrative";
import { DOMAIN_COLOR, initials, avatarColor, avatarInkColor } from "@/lib/ui";
import TraitBars from "@/components/TraitBars";
import { formatDate } from "@/components/Bits";

const SECTION_ORDER: SectionKey[] = [
  "communication",
  "decisions",
  "feedback",
  "priorities",
  "frustrations",
];

const SECTION_ICON: Record<SectionKey, string> = {
  communication: "💬",
  decisions: "🧭",
  feedback: "🎯",
  priorities: "⭐",
  frustrations: "⚠️",
};

export default function ProfileView({
  profile,
  teamMean,
  owner = false,
  preferences = [],
}: {
  profile: AssembledProfile;
  teamMean?: Record<DomainCode, number>;
  owner?: boolean;
  preferences?: { domain: string; prompt: string; display: string }[];
}) {
  const { domains, narrative, facets } = profile;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <span
          className="grid place-items-center w-14 h-14 rounded-2xl text-lg font-bold shrink-0"
          style={{ background: avatarColor(profile.name), color: avatarInkColor(profile.name) }}
          aria-hidden
        >
          {initials(profile.name)}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
          <p className="text-stone-500">{profile.title ?? "Team member"}</p>
          {profile.refreshedAt && (
            <p className="text-xs text-stone-400 mt-1">
              Last refreshed {formatDate(profile.refreshedAt)}
              {profile.stale && (
                <span className="text-orange-600 font-medium"> · refresh due</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      {narrative && (
        <div
          className="card p-5"
          style={{ background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}
        >
          <p className="text-[15px] leading-relaxed">{narrative.summary}</p>
        </div>
      )}

      {/* Traits */}
      <section className="card p-5">
        <h2 className="font-semibold mb-4">Working-style traits</h2>
        {domains ? (
          <TraitBars domains={domains} teamMean={teamMean} />
        ) : (
          <p className="text-sm text-stone-500">No completed assessment yet.</p>
        )}
      </section>

      {/* How to work with me */}
      {narrative && (
        <section>
          <h2 className="font-semibold mb-3">
            How to work with {owner ? "me" : profile.name.split(/\s+/)[0]}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {SECTION_ORDER.map((key) => (
              <div key={key} className="card p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-1.5">
                  <span aria-hidden>{SECTION_ICON[key]}</span>
                  {SECTION_LABELS[key]}
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {narrative.sections[key]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Self-coaching (owner only) */}
      {owner && narrative && narrative.selfCoaching.length > 0 && (
        <section
          className="card p-5"
          style={{ borderColor: "#c7d2fe" }}
        >
          <h2 className="font-semibold flex items-center gap-2 mb-1">
            <span aria-hidden>🧠</span> Coaching for you
          </h2>
          <p className="text-sm text-stone-500 mb-3">
            A few ways to flex your own style. This section is only visible to you.
          </p>
          <ul className="space-y-2">
            {narrative.selfCoaching.map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-stone-700">
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--color-brand-600)" }}
                />
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Working preferences (read-only, from the org's question set) */}
      {preferences.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold mb-3">Working preferences</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {preferences.map((p, i) => (
              <div key={i}>
                <dt className="text-xs text-stone-400">{p.prompt}</dt>
                <dd className="text-sm font-medium mt-0.5">{p.display}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Facet detail (nice-to-have, progressive disclosure) */}
      {facets.length > 0 && (
        <details className="card p-5">
          <summary className="font-semibold cursor-pointer select-none">
            Detailed breakdown · 30 facets
          </summary>
          <p className="text-xs text-stone-400 mt-2 mb-4">
            Facet scores are shown in their own direction (for example a low
            Anxiety score means calm). These add nuance under each of the five
            traits.
          </p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
            {DOMAIN_ORDER.map((d) => (
              <div key={d}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: DOMAIN_COLOR[d] }}>
                  {DOMAINS[d].trait}
                </h4>
                <div className="space-y-2">
                  {facets
                    .filter((f) => f.domain === d && FACETS[d][f.facet])
                    .map((f) => (
                      <div key={`${f.domain}${f.facet}`}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-stone-600">{FACETS[d][f.facet]}</span>
                          <span className="font-mono text-stone-400">{Math.round(f.score)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${f.score}%`, background: DOMAIN_COLOR[d], opacity: 0.75 }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="text-[11px] text-stone-400 leading-relaxed">
        Based on the public-domain IPIP-NEO-120. This is a self-report reflection
        tool, not a validated clinical, diagnostic, or hiring assessment. Traits
        describe tendencies, not limits.
      </p>
    </div>
  );
}
