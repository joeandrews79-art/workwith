"use client";

import { useRouter } from "next/navigation";

export default function CompareSelector({
  options,
  a,
  b,
}: {
  options: { id: string; name: string }[];
  a?: string;
  b?: string;
}) {
  const router = useRouter();

  function go(next: { a?: string; b?: string }) {
    const na = next.a ?? a ?? "";
    const nb = next.b ?? b ?? "";
    const params = new URLSearchParams();
    if (na) params.set("a", na);
    if (nb) params.set("b", nb);
    router.push(`/compare?${params.toString()}`);
  }

  const Select = ({
    value,
    onPick,
    label,
    exclude,
  }: {
    value?: string;
    onPick: (id: string) => void;
    label: string;
    exclude?: string;
  }) => (
    <div className="flex-1 min-w-0">
      <label className="label block mb-1">{label}</label>
      <select
        className="input"
        value={value ?? ""}
        onChange={(e) => onPick(e.target.value)}
      >
        <option value="">Select a person…</option>
        {options
          .filter((o) => o.id !== exclude)
          .map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
      </select>
    </div>
  );

  return (
    <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
      <Select label="Person A" value={a} exclude={b} onPick={(id) => go({ a: id })} />
      <span className="hidden sm:block text-stone-400 pb-2.5 font-medium">vs</span>
      <Select label="Person B" value={b} exclude={a} onPick={(id) => go({ b: id })} />
    </div>
  );
}
