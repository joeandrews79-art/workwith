# Scoring & narrative logic

This document explains exactly how a set of answers becomes trait scores and a
readable profile. Everything here is deterministic and runs locally.

## 1. The item pool

- **120 items**, from the public-domain **IPIP-NEO-120** (Johnson, 2014).
- Structure: **5 domains × 6 facets × 4 items**.
- Each item carries a `domain` (N/E/O/A/C), a `facet` (1-6), and a `keyed`
  direction (`plus` or `minus`).
- Data: `data/ipip-neo-120.json`. Loaded and typed in `src/lib/ipip.ts`.

### Facet map (facet number → name)

| # | N (Neuroticism) | E (Extraversion) | O (Openness) | A (Agreeableness) | C (Conscientiousness) |
|---|---|---|---|---|---|
| 1 | Anxiety | Friendliness | Imagination | Trust | Self-Efficacy |
| 2 | Anger | Gregariousness | Artistic Interests | Morality | Orderliness |
| 3 | Depression | Assertiveness | Emotionality | Altruism | Dutifulness |
| 4 | Self-Consciousness | Activity Level | Adventurousness | Cooperation | Achievement-Striving |
| 5 | Immoderation | Excitement-Seeking | Intellect | Modesty | Self-Discipline |
| 6 | Vulnerability | Cheerfulness | Liberalism | Sympathy | Cautiousness |

This mapping was verified item-by-item against the item text (see
`src/lib/ipip.ts` `FACETS`).

## 2. Scoring (`src/lib/scoring.ts`)

1. Each answer is `1..5` (Very Inaccurate → Very Accurate).
2. **Reverse-key** `minus` items: `v → 6 - v`. Now every item points in the
   trait-positive direction.
3. **Facet score** = mean of its 4 items (`1..5`).
4. **Domain score** = mean of its 24 items (`1..5`).
5. Rescale means to **0-100** as `(mean - 1) / 4 * 100` for display.
6. **Neuroticism is inverted for display** as *Emotional steadiness*:
   `friendlyScore = 100 - traitScore`. Raw trait scores are always kept.

The friendly domain labels: E = Social energy, A = Collaboration style,
C = Structure & drive, N = Emotional steadiness, O = Openness to change.

### Bands

- **Absolute band** (a person's own profile): `<40` Lower, `40-60` Balanced,
  `>60` Higher. Used for the individual narrative so it is self-contained.
- **Relative-within-team band** (dashboard, compare, discussion, meeting):
  computed against the current team's distribution (`src/lib/team.ts`,
  `relBand`). "Higher" means higher *for this group*, and it shifts as the team
  changes. This is intentional and honest: we have **no normative sample**, so
  we never present population percentiles.

## 3. Narrative generation (`src/lib/narrative.ts`)

The profile prose is assembled from hand-written copy fragments, not an AI model.

- Every domain band (low / moderate / high) has original copy keyed to the five
  **How to work with me** sections: communication, decisions, feedback,
  priorities, frustrations. Each band also has a **self-coaching** tip.
- Only **distinctive** traits (bands that are not "moderate") drive the copy, so
  balanced traits stay quiet and the profile reads like a person, not a readout.
- **Summary**: the 2-3 most distinctive traits, third person, for the directory
  header.
- **Sections**: the top 1-2 contributing distinctive domains per section.
- **Coaching for you**: the top 3 self-coaching tips (owner-only).
- The user can override the summary and any section (`editedNarrative`); edits
  win, and blank fields fall back to the generated text (`resolveNarrative`).

## 4. Meeting prep (`src/lib/meeting.ts`)

Given the viewer plus the chosen participants:

- **Per person**: their most distinctive trait → one line on how to communicate
  with them.
- **The room**: the group's strongest tilts and its widest split.
- **How to show up**: where the viewer diverges most from the room (advice to
  flex), plus one line leveraging the viewer's biggest strength.

## 5. Honesty & scope

WorkWith is a **self-report reflection tool**. Scores describe tendencies as the
person sees themselves on a given day, not fixed traits, and not a validated
clinical or hiring measure. This disclaimer appears on the login, the footer,
and every profile.
