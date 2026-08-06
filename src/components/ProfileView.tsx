import { AssembledProfile } from "@/lib/profile";
import { DomainCode, DOMAIN_ORDER, DOMAINS, FACETS } from "@/lib/ipip";
import { SECTION_LABELS, SectionKey } from "@/lib/narrative";
import { DOMAIN_COLOR } from "@/lib/ui";
import TraitBars from "@/components/TraitBars";
import ProfileIdentity from "@/components/ProfileIdentity";
import { formatDate } from "@/components/Bits";

const SECTION_ORDER: SectionKey[] = [
  "communication",
  "decisions",
  "feedback",
  "priorities",
  "frustrations",
];

const SECTION_PATH: Record<SectionKey, string> = {
  communication: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  decisions: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76Z",
  feedback: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  priorities: "M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2Z",
  frustrations: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01",
};

const BULB_PATH = "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1v.2h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z";

function BadgeIcon({ path }: { path: string }) {
  return (
    <span
      className="grid place-items-center w-6 h-6 rounded-lg shrink-0"
      style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </span>
  );
}

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
      <ProfileIdentity
        name={profile.name}
        title={profile.title}
        avatar={profile.avatar}
        refreshedLabel={profile.refreshedAt ? formatDate(profile.refreshedAt) : null}
        stale={profile.stale}
        owner={owner}
      />

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
          <p className="text-sm text-muted">No completed assessment yet.</p>
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
                  <BadgeIcon path={SECTION_PATH[key]} />
                  {SECTION_LABELS[key]}
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
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
          style={{ borderColor: "var(--accent-border)" }}
        >
          <h2 className="font-semibold flex items-center gap-2 mb-1">
            <BadgeIcon path={BULB_PATH} /> Coaching for you
          </h2>
          <p className="text-sm text-muted mb-3">
            A few ways to flex your own style. This section is only visible to you.
          </p>
          <ul className="space-y-2">
            {narrative.selfCoaching.map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink">
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
                <dt className="text-xs text-faint">{p.prompt}</dt>
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
          <p className="text-xs text-faint mt-2 mb-4">
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
                          <span className="text-ink-soft">{FACETS[d][f.facet]}</span>
                          <span className="font-mono text-faint">{Math.round(f.score)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
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

      <p className="text-[11px] text-faint leading-relaxed">
        Based on the public-domain IPIP-NEO-120. This is a self-report reflection
        tool, not a validated clinical, diagnostic, or hiring assessment. Traits
        describe tendencies, not limits.
      </p>
    </div>
  );
}
