import { getCurrentUser, isAdmin } from "@/lib/auth";
import { GUIDE_SECTIONS } from "@/lib/guide-content";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const user = (await getCurrentUser())!;
  const admin = isAdmin(user);
  const sections = GUIDE_SECTIONS.filter((s) => admin || !s.adminOnly);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">User guide</h1>
        <p className="text-stone-500 mt-1">
          What every part of WorkWith does, and step by step how to use it. Stuck on
          something specific? Use the help button in the bottom-right corner to ask.
        </p>
      </header>

      {/* Contents */}
      <nav className="card p-5">
        <p className="label mb-3">On this page</p>
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {sections.map((s, i) => (
            <li key={s.id} className="text-sm">
              <a href={`#${s.id}`} className="hover:underline" style={{ color: "var(--color-brand-700)" }}>
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-20">
            <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
            <p className="text-stone-600 mt-1 leading-relaxed">{s.intro}</p>

            {s.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.image}
                alt={`${s.title} screenshot`}
                className="mt-3 w-full rounded-xl border"
                style={{ borderColor: "var(--color-border)" }}
              />
            )}

            {s.steps && s.steps.length > 0 && (
              <ol className="mt-3 space-y-2">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span
                      className="grid place-items-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0 mt-0.5"
                      style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-stone-700">{step}</span>
                  </li>
                ))}
              </ol>
            )}

            {s.tips && s.tips.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {s.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-500 leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-brand-600)" }} aria-hidden />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
