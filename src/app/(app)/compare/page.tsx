import { getCurrentUser } from "@/lib/auth";
import { getVisibleMembers } from "@/lib/team-data";
import { compareMembers } from "@/lib/team";
import { DOMAIN_ORDER, DOMAINS } from "@/lib/ipip";
import { DOMAIN_COLOR, initials, avatarColor, avatarInkColor } from "@/lib/ui";
import CompareSelector from "@/components/CompareSelector";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const user = (await getCurrentUser())!;
  const members = await getVisibleMembers(user.orgId, user.id);
  const options = members.map((m) => ({ id: m.id, name: m.name }));

  const aId = a ?? user.id;
  const memberA = members.find((m) => m.id === aId);
  const memberB = b ? members.find((m) => m.id === b) : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
        <p className="text-stone-500 mt-1">
          Pick two people to see where your styles differ most, with talking
          points for a 1:1.
        </p>
      </header>

      <CompareSelector options={options} a={aId} b={b} />

      {members.length < 2 && (
        <p className="text-sm text-stone-500">
          You need at least two completed, shared profiles to compare.
        </p>
      )}

      {memberA && memberB ? (
        <Comparison a={memberA} b={memberB} />
      ) : (
        <p className="text-sm text-stone-500">
          Choose a second person to see the comparison.
        </p>
      )}
    </div>
  );
}

function Comparison({
  a,
  b,
}: {
  a: Awaited<ReturnType<typeof getVisibleMembers>>[number];
  b: Awaited<ReturnType<typeof getVisibleMembers>>[number];
}) {
  const diffs = compareMembers(a, b);
  const top = diffs.slice(0, 3);

  const Avatar = ({ name }: { name: string }) => (
    <span
      className="grid place-items-center w-9 h-9 rounded-full text-xs font-bold shrink-0"
      style={{ background: avatarColor(name), color: avatarInkColor(name) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Names legend */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Avatar name={a.name} />
          <span className="font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#4f46e5" }} />
            {a.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar name={b.name} />
          <span className="font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ea580c" }} />
            {b.name}
          </span>
        </div>
      </div>

      {/* Overlaid trait comparison */}
      <section className="card p-5 space-y-5">
        <h2 className="font-semibold">Side by side</h2>
        {DOMAIN_ORDER.map((d) => {
          const sa = a.domains[d].friendlyScore;
          const sb = b.domains[d].friendlyScore;
          const gap = Math.round(Math.abs(sa - sb));
          return (
            <div key={d}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">{DOMAINS[d].friendly}</span>
                <span className="text-xs text-stone-400">{gap} apart</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-stone-100">
                <Dot value={sa} color="#4f46e5" />
                <Dot value={sb} color="#ea580c" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Biggest differences + talking points */}
      <section>
        <h2 className="font-semibold mb-3">Biggest differences to talk about</h2>
        <div className="space-y-3">
          {top.map((d) => (
            <div key={d.domain} className="card p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: DOMAIN_COLOR[d.domain] }}
                />
                <h3 className="font-semibold text-sm">{d.friendlyLabel}</h3>
                <span className="text-xs text-stone-400 ml-auto">{Math.round(d.gap)} points apart</span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">{d.talkingPoint}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Dot({ value, color }: { value: number; color: string }) {
  return (
    <span
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow"
      style={{ left: `${value}%`, background: color }}
      title={`${Math.round(value)}`}
    />
  );
}
