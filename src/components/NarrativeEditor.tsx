"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Narrative, SECTION_LABELS, SectionKey } from "@/lib/narrative";
import { saveNarrative, resetNarrative } from "@/app/actions";

const SECTION_ORDER: SectionKey[] = [
  "communication",
  "decisions",
  "feedback",
  "priorities",
  "frustrations",
];

export default function NarrativeEditor({
  current,
  generated,
}: {
  current: Narrative;
  generated: Narrative;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(current.summary);
  const [sections, setSections] = useState<Record<SectionKey, string>>(
    current.sections,
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(false);
    startTransition(async () => {
      await saveNarrative({ summary, sections, selfCoaching: current.selfCoaching });
      setSaved(true);
      router.refresh();
    });
  }

  function resetAll() {
    startTransition(async () => {
      await resetNarrative();
      setSummary(generated.summary);
      setSections(generated.sections);
      setSaved(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Field
        label="Summary"
        value={summary}
        placeholder={generated.summary}
        onChange={setSummary}
        rows={3}
      />

      {SECTION_ORDER.map((key) => (
        <Field
          key={key}
          label={SECTION_LABELS[key]}
          value={sections[key]}
          placeholder={generated.sections[key]}
          onChange={(v) => setSections((s) => ({ ...s, [key]: v }))}
          rows={3}
        />
      ))}

      <div className="flex items-center gap-3 sticky bottom-0 bg-paper py-3" style={{ background: "var(--color-paper)" }}>
        <button className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button className="btn btn-ghost" onClick={resetAll} disabled={pending}>
          Reset to auto-generated
        </button>
        {saved && <span className="text-sm text-success">Saved</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="label">{label}</label>
      <textarea
        className="input"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
