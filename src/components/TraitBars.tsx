import { DomainCode, DOMAIN_ORDER, DOMAINS } from "@/lib/ipip";
import { DomainScore } from "@/lib/scoring";
import { DOMAIN_COLOR, DOMAIN_POLES } from "@/lib/ui";

export default function TraitBars({
  domains,
  teamMean,
  compact = false,
}: {
  domains: Record<DomainCode, DomainScore>;
  /** Optional per-domain team average, drawn as a reference marker. */
  teamMean?: Record<DomainCode, number>;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {DOMAIN_ORDER.map((d) => {
        const score = domains[d].friendlyScore;
        const color = DOMAIN_COLOR[d];
        return (
          <div key={d}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-semibold">{DOMAINS[d].friendly}</span>
              <span className="text-xs font-mono text-muted">{Math.round(score)}</span>
            </div>
            <div
              className="relative h-2.5 rounded-full bg-surface-2"
              role="meter"
              aria-valuenow={Math.round(score)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${DOMAINS[d].friendly}: ${Math.round(score)} out of 100`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${score}%`, background: color }}
              />
              {teamMean && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-muted/70 rounded"
                  style={{ left: `calc(${teamMean[d]}% - 1px)` }}
                  title={`Team average: ${Math.round(teamMean[d])}`}
                />
              )}
            </div>
            {!compact && (
              <div className="flex justify-between mt-1 text-[11px] text-faint">
                <span>{DOMAIN_POLES[d].low}</span>
                <span>{DOMAIN_POLES[d].high}</span>
              </div>
            )}
          </div>
        );
      })}
      {teamMean && (
        <p className="text-[11px] text-faint flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 bg-muted/70 rounded" />
          Marker shows the team average for comparison.
        </p>
      )}
    </div>
  );
}
