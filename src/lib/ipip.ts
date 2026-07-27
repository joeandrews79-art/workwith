/**
 * IPIP-NEO-120 item pool + metadata.
 *
 * Source: International Personality Item Pool (https://ipip.ori.org/), a
 * PUBLIC-DOMAIN collection of personality items. The specific 120-item
 * inventory and its facet structure are from:
 *
 *   Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model
 *   with a 120-item public domain inventory: Development of the IPIP-NEO-120.
 *   Journal of Research in Personality, 51, 78-89.
 *
 * Item text/keying dataset via the community-maintained machine-readable copy
 * (Alheimsins/b5-johnson-120-ipip-neo-pi-r, MIT), verified item-by-item
 * against the standard NEO facet structure. These items are public domain and
 * may be used freely. This tool deliberately uses ONLY these items and does
 * NOT reproduce any proprietary instrument (DISC, Insights, CliftonStrengths,
 * PrinciplesYou, etc.).
 */

import raw from "./ipip-neo-120.json";

export type DomainCode = "N" | "E" | "O" | "A" | "C";

export interface IpipItem {
  id: string;
  text: string;
  keyed: "plus" | "minus";
  domain: DomainCode;
  facet: number; // 1..6 within the domain
}

export const ITEMS: IpipItem[] = raw as IpipItem[];

export const DOMAIN_ORDER: DomainCode[] = ["E", "A", "C", "N", "O"];

/**
 * Scientific trait names (what we actually score) plus the plain, friendly
 * label we show people. Neuroticism is presented as its inverse, "Emotional
 * Stability", because higher stability is the intuitive workplace framing.
 * `invert: true` means: friendly score = 100 - raw trait score.
 */
export const DOMAINS: Record<
  DomainCode,
  { trait: string; friendly: string; invert: boolean; blurb: string }
> = {
  E: {
    trait: "Extraversion",
    friendly: "Social energy",
    invert: false,
    blurb: "Where you draw energy, and how outward-facing you are day to day.",
  },
  A: {
    trait: "Agreeableness",
    friendly: "Collaboration style",
    invert: false,
    blurb: "How you balance others' needs against getting to the point.",
  },
  C: {
    trait: "Conscientiousness",
    friendly: "Structure & drive",
    invert: false,
    blurb: "How you plan, organize, and push work to done.",
  },
  N: {
    trait: "Neuroticism",
    friendly: "Emotional steadiness",
    invert: true, // shown as Emotional Stability (higher = calmer under pressure)
    blurb: "How you tend to run under pressure and stress.",
  },
  O: {
    trait: "Openness",
    friendly: "Openness to change",
    invert: false,
    blurb: "Appetite for new ideas, variety, and rethinking how things are done.",
  },
};

/** Facet names per the standard NEO / Johnson (2014) structure. */
export const FACETS: Record<DomainCode, Record<number, string>> = {
  N: {
    1: "Anxiety",
    2: "Anger",
    3: "Depression",
    4: "Self-Consciousness",
    5: "Immoderation",
    6: "Vulnerability",
  },
  E: {
    1: "Friendliness",
    2: "Gregariousness",
    3: "Assertiveness",
    4: "Activity Level",
    5: "Excitement-Seeking",
    6: "Cheerfulness",
  },
  O: {
    // Facet 6 ("Liberalism", the political/values items) is intentionally
    // omitted: political questions have no place in a workplace tool. Openness
    // is scored from its five work-relevant facets below.
    1: "Imagination",
    2: "Artistic Interests",
    3: "Emotionality",
    4: "Adventurousness",
    5: "Intellect",
  },
  A: {
    1: "Trust",
    2: "Morality",
    3: "Altruism",
    4: "Cooperation",
    5: "Modesty",
    6: "Sympathy",
  },
  C: {
    1: "Self-Efficacy",
    2: "Orderliness",
    3: "Dutifulness",
    4: "Achievement-Striving",
    5: "Self-Discipline",
    6: "Cautiousness",
  },
};

export const TOTAL_ITEMS = ITEMS.length; // 120

/**
 * Deterministic presentation order. We interleave facets so a respondent never
 * answers four near-identical items in a row, which reduces straight-lining.
 * Order is fixed (no randomness) so autosave/resume is stable.
 */
export const PRESENTATION_ORDER: IpipItem[] = (() => {
  const byKey = new Map<string, IpipItem[]>();
  for (const it of ITEMS) {
    const k = `${it.domain}${it.facet}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(it);
  }
  const keys = [...byKey.keys()];
  const out: IpipItem[] = [];
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (const k of keys) {
      const list = byKey.get(k)!;
      if (round < list.length) {
        out.push(list[round]);
        added = true;
      }
    }
    round++;
  }
  return out;
})();
