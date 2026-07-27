"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePrefAnswers } from "@/app/actions";
import type { PrefQuestionView } from "@/lib/prefs";

type Answer = string | string[];

export default function PreferencesEditor({
  questions,
  initial,
}: {
  questions: PrefQuestionView[];
  initial: Record<string, unknown>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => {
    const a: Record<string, Answer> = {};
    for (const q of questions) {
      const v = initial[q.id];
      if (Array.isArray(v)) a[q.id] = v as string[];
      else if (v != null) a[q.id] = String(v);
      else a[q.id] = q.kind === "multi" ? [] : "";
    }
    return a;
  });
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const domains = useMemo(() => [...new Set(questions.map((q) => q.domain))], [questions]);

  const answeredCount = questions.filter((q) => {
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim());
  }).length;

  function set(id: string, v: Answer) {
    setAnswers((a) => ({ ...a, [id]: v }));
    setSaved(false);
  }
  function toggleMulti(id: string, option: string) {
    setAnswers((a) => {
      const cur = Array.isArray(a[id]) ? (a[id] as string[]) : [];
      const next = cur.includes(option) ? cur.filter((x) => x !== option) : [...cur, option];
      return { ...a, [id]: next };
    });
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const payload = questions
        .map((q) => ({ questionId: q.id, value: JSON.stringify(answers[q.id] ?? "") }))
        .filter((p) => {
          const parsed = JSON.parse(p.value);
          return Array.isArray(parsed) ? parsed.length > 0 : Boolean(String(parsed).trim());
        });
      await savePrefAnswers(payload);
      setSaved(true);
      router.refresh();
    });
  }

  if (questions.length === 0) return null;

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold">Working preferences</h2>
        <span className="text-xs text-stone-400">{answeredCount}/{questions.length} answered</span>
      </div>
      <p className="text-sm text-stone-500 mb-4">
        Quick, plain answers about how you like to work. These show on your shared
        profile so teammates can work with you well.
      </p>

      <div className="space-y-6">
        {domains.map((d) => (
          <div key={d}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">{d}</h3>
            <div className="space-y-4">
              {questions.filter((q) => q.domain === d).map((q) => (
                <div key={q.id}>
                  <p className="text-sm font-medium mb-1.5">{q.prompt}</p>
                  {q.helpText && <p className="text-xs text-stone-400 mb-1.5">{q.helpText}</p>}

                  {q.kind === "text" ? (
                    <textarea
                      className="input"
                      rows={2}
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) => set(q.id, e.target.value)}
                    />
                  ) : q.kind === "multi" ? (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o) => {
                        const on = Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            onClick={() => toggleMulti(q.id, o)}
                            className="rounded-full border px-3 py-1.5 text-sm"
                            style={on ? { borderColor: "var(--color-brand-600)", background: "var(--color-brand-50)", fontWeight: 600 } : { borderColor: "#e2ddd4" }}
                          >
                            {o}{on ? " ✓" : ""}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={q.kind === "scale" ? "grid grid-cols-3 gap-2" : "flex flex-col gap-2"}>
                      {q.options.map((o) => {
                        const on = answers[q.id] === o;
                        return (
                          <button
                            key={o}
                            type="button"
                            onClick={() => set(q.id, o)}
                            className="rounded-lg border px-3 py-2 text-sm text-left"
                            style={on ? { borderColor: "var(--color-brand-600)", background: "var(--color-brand-50)", fontWeight: 600 } : { borderColor: "#e2ddd4" }}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button className="btn btn-primary py-1.5 text-sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </button>
        {saved && <span className="text-sm text-green-700">Saved</span>}
      </div>
    </section>
  );
}
