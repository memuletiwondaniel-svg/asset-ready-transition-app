// Pure function + golden cases for the "lifecycle promotion -> E1 verdict"
// eval slot. Mirrors the deterministic count branch of evidenceMatchEngine
// in compute-vcr-insights: when N=0 and M>0 emit the amber gap fact,
// otherwise stay silent (per-file AI classify is not covered here).

export type Tone = "neutral" | "amber" | "red";
export type Confidence = "verified" | "ai_read" | "unavailable";

export interface E1Fact {
  label: string;
  value: string;
  tone?: Tone;
  confidence: Confidence;
}

export interface E1EvidenceRow {
  source: string; // p2a_evidence_source
  confirmed: boolean;
}

/**
 * Deterministic E1 count verdict.
 * Only surfaces the gap fact (n=0, m>0) — same behaviour as the production
 * evidenceMatchEngine, so a promoted-and-confirmed row correctly suppresses
 * the amber "0 files against N requirement(s)" line.
 */
export function computeE1PromotionVerdict(
  evidenceRows: E1EvidenceRow[],
  requiredLabelCount: number,
): E1Fact[] {
  const n = (evidenceRows || []).filter((r) => r.confirmed !== false).length;
  const m = Math.max(0, requiredLabelCount | 0);
  if (n === 0 && m > 0) {
    return [{
      label: "Required evidence attached",
      value: `${n} file(s) against ${m} requirement(s)`,
      tone: "amber",
      confidence: "verified",
    }];
  }
  return [];
}

export interface E1GoldenCase {
  id: string;
  description: string;
  input: { evidenceRows: E1EvidenceRow[]; requiredLabelCount: number };
  expected: E1Fact[];
}

export const E1_PROMOTION_GOLDEN_CASES: E1GoldenCase[] = [
  {
    id: "promoted-satisfies-requirement",
    description:
      "One promoted+confirmed evidence row satisfies one requirement — E1 stays silent (no amber gap).",
    input: {
      evidenceRows: [{ source: "promoted_procedure", confirmed: true }],
      requiredLabelCount: 1,
    },
    expected: [],
  },
  {
    id: "no-evidence-fires-gap",
    description:
      "Zero evidence + one requirement — E1 emits the amber gap fact.",
    input: { evidenceRows: [], requiredLabelCount: 1 },
    expected: [{
      label: "Required evidence attached",
      value: "0 file(s) against 1 requirement(s)",
      tone: "amber",
      confidence: "verified",
    }],
  },
  {
    id: "withdrawn-promoted-fires-gap",
    description:
      "Promoted row soft-hidden (confirmed=false) does NOT count — gap fires.",
    input: {
      evidenceRows: [{ source: "promoted_procedure", confirmed: false }],
      requiredLabelCount: 1,
    },
    expected: [{
      label: "Required evidence attached",
      value: "0 file(s) against 1 requirement(s)",
      tone: "amber",
      confidence: "verified",
    }],
  },
];

export function e1FactsEqual(a: E1Fact[], b: E1Fact[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.label !== y.label || x.value !== y.value ||
        (x.tone || "") !== (y.tone || "") ||
        x.confidence !== y.confidence) return false;
  }
  return true;
}
