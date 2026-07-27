import { AssembledProfile } from "@/lib/profile";
import { AnsweredPref } from "@/lib/prefs";
import { DOMAIN_ORDER, DOMAINS, FACETS } from "@/lib/ipip";
import { DOMAIN_COLOR, DOMAIN_POLES } from "@/lib/ui";
import { SECTION_LABELS, SectionKey } from "@/lib/narrative";

const SECTION_ORDER: SectionKey[] = [
  "communication",
  "decisions",
  "feedback",
  "priorities",
  "frustrations",
];

/**
 * Print-optimized rendering of a full Big Five profile. Pure and deterministic,
 * reusing the same locally-generated narrative, scores, facets, and preferences
 * shown on screen. No data leaves the app; the PDF is produced by the browser's
 * own print-to-PDF from this markup.
 */
export default function ProfileReportView({
  profile,
  prefs,
  date,
}: {
  profile: AssembledProfile;
  prefs: AnsweredPref[];
  date: string;
}) {
  const { domains, facets, narrative } = profile;
  if (!domains || !narrative) return null;

  return (
    <article className="rpt-paper">
      <header className="rpt-head">
        <div className="rpt-brand">
          <span className="rpt-mark">W</span>
          <span>WorkWith</span>
        </div>
        <p className="rpt-kicker">Working-style profile</p>
        <h1 className="rpt-name">{profile.name}</h1>
        {profile.title && <p className="rpt-role">{profile.title}</p>}
        <p className="rpt-date">Generated {date}</p>
      </header>

      <section className="rpt-block">
        <h2 className="rpt-h2">In a nutshell</h2>
        <p className="rpt-lead">{narrative.summary}</p>
      </section>

      <section className="rpt-block">
        <h2 className="rpt-h2">How to work with me</h2>
        <div className="rpt-sections">
          {SECTION_ORDER.map((k) => (
            <div key={k} className="rpt-sec">
              <h3 className="rpt-h3">{SECTION_LABELS[k]}</h3>
              <p>{narrative.sections[k]}</p>
            </div>
          ))}
        </div>
      </section>

      {narrative.selfCoaching.length > 0 && (
        <section className="rpt-block">
          <h2 className="rpt-h2">Coaching for me</h2>
          <ul className="rpt-list">
            {narrative.selfCoaching.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rpt-block rpt-avoid-break">
        <h2 className="rpt-h2">Your Big Five</h2>
        <p className="rpt-note">
          Scores run 0 to 100 on the response scale (not against a normative
          population). They describe preferences and differences, never better or
          worse.
        </p>
        <div className="rpt-traits">
          {DOMAIN_ORDER.map((d) => {
            const score = Math.round(domains[d].friendlyScore);
            const color = DOMAIN_COLOR[d];
            return (
              <div key={d} className="rpt-trait">
                <div className="rpt-trait-top">
                  <span className="rpt-trait-name">{DOMAINS[d].friendly}</span>
                  <span className="rpt-trait-score">{score}</span>
                </div>
                <div className="rpt-bar">
                  <span className="rpt-bar-fill" style={{ width: `${score}%`, background: color }} />
                </div>
                <div className="rpt-poles">
                  <span>{DOMAIN_POLES[d].low}</span>
                  <span>{DOMAIN_POLES[d].high}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rpt-block">
        <h2 className="rpt-h2">Facet detail</h2>
        <div className="rpt-facets">
          {DOMAIN_ORDER.map((d) => {
            const rows = facets
              .filter((f) => f.domain === d)
              .sort((a, b) => a.facet - b.facet);
            if (rows.length === 0) return null;
            return (
              <div key={d} className="rpt-facet-group rpt-avoid-break">
                <h3 className="rpt-facet-domain" style={{ color: DOMAIN_COLOR[d] }}>
                  {DOMAINS[d].friendly}
                </h3>
                {rows.map((f) => (
                  <div key={f.facet} className="rpt-facet-row">
                    <span className="rpt-facet-name">{FACETS[d][f.facet] ?? `Facet ${f.facet}`}</span>
                    <span className="rpt-facet-track">
                      <span className="rpt-facet-fill" style={{ width: `${Math.round(f.score)}%`, background: DOMAIN_COLOR[d] }} />
                    </span>
                    <span className="rpt-facet-score">{Math.round(f.score)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {prefs.length > 0 && (
        <section className="rpt-block">
          <h2 className="rpt-h2">Working preferences</h2>
          <dl className="rpt-prefs">
            {prefs.map((p, i) => (
              <div key={i} className="rpt-pref">
                <dt>{p.prompt}</dt>
                <dd>{p.display}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <footer className="rpt-foot">
        WorkWith is a self-report reflection tool built on the public-domain Big
        Five (IPIP-NEO-120, Goldberg / Johnson 2014). It is not a clinical,
        diagnostic, or hiring assessment.
      </footer>
    </article>
  );
}
