"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertQuestion, deleteQuestion, aiSuggestQuestions } from "@/app/actions";
import type { SuggestedQuestion } from "@/lib/ai";

export interface QuestionRow {
  id: string;
  domain: string;
  prompt: string;
  kind: string;
  options: string[];
  helpText: string | null;
}

const KINDS = [
  { v: "single", label: "Single choice" },
  { v: "multi", label: "Multiple choice" },
  { v: "scale", label: "Scale (3 points)" },
  { v: "text", label: "Short text" },
];

export default function QuestionsManager({
  questions,
  aiEnabled,
}: {
  questions: QuestionRow[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<QuestionRow | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const domains = [...new Set(questions.map((q) => q.domain))];

  function remove(id: string) {
    startTransition(async () => {
      await deleteQuestion(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <AiAssist enabled={aiEnabled} />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Questions · {questions.length}</h2>
          <button className="btn btn-primary py-1.5 text-sm" onClick={() => setEditing("new")}>
            Add question
          </button>
        </div>

        {editing && (
          <QuestionEditor
            initial={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}

        <div className="space-y-6 mt-4">
          {domains.map((d) => (
            <div key={d}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">{d}</h3>
              <div className="card divide-y divide-stone-100 overflow-hidden">
                {questions
                  .filter((q) => q.domain === d)
                  .map((q) => (
                    <div key={q.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{q.prompt}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {KINDS.find((k) => k.v === q.kind)?.label ?? q.kind}
                          {q.options.length > 0 && ` · ${q.options.join(", ")}`}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button className="btn btn-secondary py-1 px-2.5 text-xs" onClick={() => setEditing(q)}>Edit</button>
                        <button className="btn btn-danger py-1 px-2.5 text-xs" onClick={() => remove(q.id)} disabled={pending}>Delete</button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuestionEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: QuestionRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [kind, setKind] = useState(initial?.kind ?? "single");
  const [optionsText, setOptionsText] = useState((initial?.options ?? []).join("\n"));
  const [helpText, setHelpText] = useState(initial?.helpText ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await upsertQuestion({
        id: initial?.id,
        domain,
        prompt,
        kind,
        options: optionsText.split("\n").map((s) => s.trim()).filter(Boolean),
        helpText,
      });
      if (res && "error" in res && res.error) setError(res.error);
      else onSaved();
    });
  }

  return (
    <div className="card p-4 space-y-3 border-2" style={{ borderColor: "var(--color-brand-200)" }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="label">Domain (group label)</label>
          <input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. Communication" />
        </div>
        <div className="space-y-1">
          <label className="label">Type</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="label">Question</label>
        <textarea className="input" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="First-person, situational. e.g. When I get a non-urgent question, I'd rather..." />
      </div>
      {kind !== "text" && (
        <div className="space-y-1">
          <label className="label">Options (one per line)</label>
          <textarea className="input" rows={3} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder={"Option A\nOption B\nOption C"} />
        </div>
      )}
      <div className="space-y-1">
        <label className="label">Help text (optional)</label>
        <input className="input" value={helpText} onChange={(e) => setHelpText(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary py-1.5 text-sm" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save question"}</button>
        <button className="btn btn-ghost py-1.5 text-sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function AiAssist({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  function ask() {
    setError(null);
    setNotes("");
    setSuggestions([]);
    startTransition(async () => {
      const res = await aiSuggestQuestions(instruction);
      if (res && "error" in res && res.error) setError(res.error);
      else if (res && "ok" in res) {
        setNotes(res.notes ?? "");
        setSuggestions(res.suggestions ?? []);
      }
    });
  }

  function add(s: SuggestedQuestion) {
    startTransition(async () => {
      await upsertQuestion({ domain: s.domain, prompt: s.prompt, kind: s.kind, options: s.options, helpText: s.helpText });
      setSuggestions((cur) => cur.filter((x) => x !== s));
      router.refresh();
    });
  }

  if (!enabled) {
    return (
      <div className="card p-4 bg-stone-50 text-sm text-stone-500">
        <p className="font-semibold text-stone-600 mb-1">✨ AI question assistant</p>
        <p>To let Claude suggest and refine questions, add <code className="text-stone-700">ANTHROPIC_API_KEY</code> to your <code className="text-stone-700">.env</code> and restart. It uses Claude Opus and only sends question text and your org context, never anyone's answers.</p>
      </div>
    );
  }

  return (
    <div className="card p-4" style={{ borderColor: "var(--color-brand-200)" }}>
      <p className="font-semibold flex items-center gap-2 mb-1"><span aria-hidden>✨</span> Ask Claude for questions</p>
      <p className="text-sm text-stone-500 mb-3">Describe what you want and Claude will draft questions aligned to your values and voice. For example: "Add three questions about async communication for a remote team" or "Make the feedback questions blunter to fit our culture."</p>
      <textarea className="input" rows={2} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="What should I help with?" />
      <div className="mt-2">
        <button className="btn btn-primary py-1.5 text-sm" onClick={ask} disabled={pending || !instruction.trim()}>
          {pending ? "Thinking…" : "Suggest questions"}
        </button>
      </div>
      {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
      {notes && <p className="text-sm text-stone-600 mt-3 italic">{notes}</p>}
      {suggestions.length > 0 && (
        <div className="mt-3 space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="border border-stone-200 rounded-lg p-3">
              <p className="text-sm font-medium">{s.prompt}</p>
              <p className="text-xs text-stone-400 mt-0.5">{s.domain} · {s.kind}{s.options.length ? ` · ${s.options.join(", ")}` : ""}</p>
              {s.rationale && <p className="text-xs text-stone-500 mt-1">{s.rationale}</p>}
              <button className="btn btn-secondary py-1 px-2.5 text-xs mt-2" onClick={() => add(s)} disabled={pending}>Add to questions</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
