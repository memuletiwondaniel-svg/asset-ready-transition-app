// Pure workflow-signal fact computers for the E5 eval harness.
// Each `computeSignalN` is behaviour-preserving vs the inline block that used
// to live in compute-vcr-insights/index.ts — same thresholds, labels, tones,
// value strings. `now` is injectable for deterministic golden cases.
//
// Tones use the compute-vcr-insights Fact.tone domain: "neutral" | "amber" | "red".
// Callers cast to their local Fact type at the call site (Signal 7 uses a
// wider tone domain of its own — see signal7.ts).

export type WorkflowTone = "neutral" | "amber" | "red";
export type WorkflowConfidence = "verified" | "ai_read" | "unavailable";

export interface WorkflowFact {
  label: string;
  value: string;
  tone?: WorkflowTone;
  confidence?: WorkflowConfidence;
}

function daysBetween(a: Date | null | undefined, b: Date): number {
  if (!a) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

// ─── Signal 1 — Status + aging ────────────────────────────────────────────
// Always emitted. Amber when READY_FOR_REVIEW > 7d or IN_PROGRESS > 21d.
export interface Signal1Input {
  status: string | null | undefined;
  anchor: string | Date | null | undefined; // submitted_at || updated_at || created_at
  now?: Date;
}
export function computeSignal1(input: Signal1Input): WorkflowFact[] {
  const now = input.now ?? new Date();
  const status = input.status || "UNKNOWN";
  const anchorDate = input.anchor
    ? (input.anchor instanceof Date ? input.anchor : new Date(input.anchor))
    : null;
  const days = daysBetween(anchorDate, now);
  let tone: WorkflowTone = "neutral";
  if (status === "READY_FOR_REVIEW" && days > 7) tone = "amber";
  else if (status === "IN_PROGRESS" && days > 21) tone = "amber";
  return [{
    label: "Status",
    value: `${status} · ${days} days`,
    tone,
    confidence: "verified",
  }];
}

// ─── Signal 2 — Returned by approver ──────────────────────────────────────
// Emit only when returned_count >= 1. Red at >=2, amber at 1.
export interface Signal2Input {
  returnedCount: number;
}
export function computeSignal2(input: Signal2Input): WorkflowFact[] {
  const n = input.returnedCount | 0;
  if (n < 1) return [];
  return [{
    label: "Returned by approver",
    value: `${n}×`,
    tone: n >= 2 ? "red" : "amber",
    confidence: "verified",
  }];
}

// ─── Signal 4 — Qualification open ────────────────────────────────────────
// Emit when there's an open qualification OR prereq status is
// QUALIFICATION_REQUESTED. Always amber.
export interface Signal4Qual {
  status: string | null | undefined;
  submitted_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}
export interface Signal4Input {
  prereqStatus: string | null | undefined;
  quals: Signal4Qual[];
  now?: Date;
}
const QUAL_TERMINAL = new Set(["APPROVED", "REJECTED", "CLOSED", "COMPLETED"]);
export function computeSignal4(input: Signal4Input): WorkflowFact[] {
  const now = input.now ?? new Date();
  const openQual = (input.quals || []).find((q) => {
    const s = String(q.status || "").toUpperCase();
    return s && !QUAL_TERMINAL.has(s);
  });
  if (!openQual && input.prereqStatus !== "QUALIFICATION_REQUESTED") return [];
  const q = openQual;
  const qAnchor = q?.submitted_at || q?.updated_at || q?.created_at || null;
  const qDays = daysBetween(qAnchor ? new Date(qAnchor) : null, now);
  return [{
    label: "Qualification open",
    value: `${q?.status || "QUALIFICATION_REQUESTED"} · ${qDays} days`,
    tone: "amber",
    confidence: "verified",
  }];
}

// ─── Signal 10 — VCR target approaching ───────────────────────────────────
// Skip terminal prereqs. Red if past-due, amber if within 14 days.
const S10_TERMINAL = new Set(["ACCEPTED", "QUALIFICATION_APPROVED", "REJECTED"]);
export interface Signal10Input {
  prereqStatus: string | null | undefined;
  targetDate: string | null | undefined; // ISO date (YYYY-MM-DD or full)
  now?: Date;
}
export function computeSignal10(input: Signal10Input): WorkflowFact[] {
  const status = String(input.prereqStatus || "");
  if (S10_TERMINAL.has(status)) return [];
  const targetRaw = input.targetDate || null;
  if (!targetRaw) return [];
  const now = input.now ?? new Date();
  const target = new Date(targetRaw);
  const diffDays = Math.floor((target.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) {
    return [{
      label: "VCR target approaching",
      value: `Target ${targetRaw} · ${Math.abs(diffDays)} days past-due`,
      tone: "red",
      confidence: "verified",
    }];
  }
  if (diffDays <= 14) {
    return [{
      label: "VCR target approaching",
      value: `Target ${targetRaw} · ${diffDays} days`,
      tone: "amber",
      confidence: "verified",
    }];
  }
  return [];
}

// ─── Golden cases ─────────────────────────────────────────────────────────
export interface WorkflowGoldenCase<I> {
  id: string;
  description: string;
  input: I;
  expected: WorkflowFact[];
}

export const SIGNAL1_GOLDEN_CASES: WorkflowGoldenCase<Signal1Input>[] = [
  {
    id: "s1_ready_for_review_amber_10_days",
    description: "READY_FOR_REVIEW aged 10 days → amber Status · 10 days",
    input: {
      status: "READY_FOR_REVIEW",
      anchor: "2026-01-01T00:00:00Z",
      now: new Date("2026-01-11T00:00:00Z"),
    },
    expected: [{ label: "Status", value: "READY_FOR_REVIEW · 10 days", tone: "amber", confidence: "verified" }],
  },
  {
    id: "s1_ready_for_review_neutral_5_days",
    description: "READY_FOR_REVIEW aged 5 days → neutral",
    input: {
      status: "READY_FOR_REVIEW",
      anchor: "2026-01-01T00:00:00Z",
      now: new Date("2026-01-06T00:00:00Z"),
    },
    expected: [{ label: "Status", value: "READY_FOR_REVIEW · 5 days", tone: "neutral", confidence: "verified" }],
  },
  {
    id: "s1_in_progress_amber_22_days",
    description: "IN_PROGRESS aged 22 days → amber",
    input: {
      status: "IN_PROGRESS",
      anchor: "2025-12-10T00:00:00Z",
      now: new Date("2026-01-01T00:00:00Z"),
    },
    expected: [{ label: "Status", value: "IN_PROGRESS · 22 days", tone: "amber", confidence: "verified" }],
  },
  {
    id: "s1_in_progress_neutral_10_days",
    description: "IN_PROGRESS aged 10 days → neutral",
    input: {
      status: "IN_PROGRESS",
      anchor: "2026-01-01T00:00:00Z",
      now: new Date("2026-01-11T00:00:00Z"),
    },
    expected: [{ label: "Status", value: "IN_PROGRESS · 10 days", tone: "neutral", confidence: "verified" }],
  },
  {
    id: "s1_unknown_null_anchor",
    description: "Null status + null anchor → UNKNOWN · 0 days neutral",
    input: { status: null, anchor: null, now: new Date("2026-01-01T00:00:00Z") },
    expected: [{ label: "Status", value: "UNKNOWN · 0 days", tone: "neutral", confidence: "verified" }],
  },
];

export const SIGNAL2_GOLDEN_CASES: WorkflowGoldenCase<Signal2Input>[] = [
  {
    id: "s2_no_returns",
    description: "0 returns → no fact",
    input: { returnedCount: 0 },
    expected: [],
  },
  {
    id: "s2_one_return_amber",
    description: "1 return → amber 1×",
    input: { returnedCount: 1 },
    expected: [{ label: "Returned by approver", value: "1×", tone: "amber", confidence: "verified" }],
  },
  {
    id: "s2_two_returns_red",
    description: "2 returns → red 2×",
    input: { returnedCount: 2 },
    expected: [{ label: "Returned by approver", value: "2×", tone: "red", confidence: "verified" }],
  },
  {
    id: "s2_three_returns_red",
    description: "3 returns → red 3×",
    input: { returnedCount: 3 },
    expected: [{ label: "Returned by approver", value: "3×", tone: "red", confidence: "verified" }],
  },
];

export const SIGNAL4_GOLDEN_CASES: WorkflowGoldenCase<Signal4Input>[] = [
  {
    id: "s4_open_qual_5_days",
    description: "Open PENDING qualification aged 5 days → amber",
    input: {
      prereqStatus: "IN_PROGRESS",
      quals: [{ status: "PENDING", submitted_at: "2026-01-01T00:00:00Z" }],
      now: new Date("2026-01-06T00:00:00Z"),
    },
    expected: [{ label: "Qualification open", value: "PENDING · 5 days", tone: "amber", confidence: "verified" }],
  },
  {
    id: "s4_qualification_requested_no_qual",
    description: "QUALIFICATION_REQUESTED with no qual rows → amber with default status",
    input: {
      prereqStatus: "QUALIFICATION_REQUESTED",
      quals: [],
      now: new Date("2026-01-06T00:00:00Z"),
    },
    expected: [{ label: "Qualification open", value: "QUALIFICATION_REQUESTED · 0 days", tone: "amber", confidence: "verified" }],
  },
  {
    id: "s4_all_terminal",
    description: "All qualifications terminal → no fact",
    input: {
      prereqStatus: "IN_PROGRESS",
      quals: [{ status: "APPROVED", updated_at: "2026-01-01T00:00:00Z" }],
      now: new Date("2026-01-06T00:00:00Z"),
    },
    expected: [],
  },
  {
    id: "s4_no_quals_no_request",
    description: "No quals and status is not QUALIFICATION_REQUESTED → no fact",
    input: {
      prereqStatus: "IN_PROGRESS",
      quals: [],
      now: new Date("2026-01-06T00:00:00Z"),
    },
    expected: [],
  },
];

export const SIGNAL10_GOLDEN_CASES: WorkflowGoldenCase<Signal10Input>[] = [
  {
    id: "s10_past_due_red",
    description: "Target 3 days in the past → red past-due",
    input: {
      prereqStatus: "IN_PROGRESS",
      targetDate: "2026-01-01",
      now: new Date("2026-01-04T00:00:00Z"),
    },
    expected: [{
      label: "VCR target approaching",
      value: "Target 2026-01-01 · 3 days past-due",
      tone: "red",
      confidence: "verified",
    }],
  },
  {
    id: "s10_within_14_amber",
    description: "Target 10 days out → amber",
    input: {
      prereqStatus: "IN_PROGRESS",
      targetDate: "2026-01-15",
      now: new Date("2026-01-05T00:00:00Z"),
    },
    expected: [{
      label: "VCR target approaching",
      value: "Target 2026-01-15 · 10 days",
      tone: "amber",
      confidence: "verified",
    }],
  },
  {
    id: "s10_beyond_14_no_signal",
    description: "Target 30 days out → no fact",
    input: {
      prereqStatus: "IN_PROGRESS",
      targetDate: "2026-02-15",
      now: new Date("2026-01-05T00:00:00Z"),
    },
    expected: [],
  },
  {
    id: "s10_terminal_skip",
    description: "Terminal prereq (ACCEPTED) → no fact even with past-due target",
    input: {
      prereqStatus: "ACCEPTED",
      targetDate: "2026-01-01",
      now: new Date("2026-01-10T00:00:00Z"),
    },
    expected: [],
  },
  {
    id: "s10_no_target",
    description: "No target date → no fact",
    input: {
      prereqStatus: "IN_PROGRESS",
      targetDate: null,
      now: new Date("2026-01-10T00:00:00Z"),
    },
    expected: [],
  },
];

// ─── Signal 6 — Evidence provenance ───────────────────────────────────────
// Two possible facts:
//  a) Assai-sourced evidence rows with confirmed=false → amber, count as value.
//  b) When status=READY_FOR_REVIEW and submitted_at present, evidence created
//     after submitted_at → red "N file(s)".
export interface Signal6Evidence {
  source?: string | null;
  confirmed?: boolean | null;
  created_at?: string | null;
}
export interface Signal6Input {
  status: string | null | undefined;
  submittedAt: string | Date | null | undefined;
  evidence: Signal6Evidence[];
}
export function computeSignal6(input: Signal6Input): WorkflowFact[] {
  const facts: WorkflowFact[] = [];
  const rows = input.evidence || [];
  const assaiPending = rows.filter(
    (e) => String(e.source || "").toLowerCase() === "assai" && e.confirmed === false,
  );
  if (assaiPending.length > 0) {
    facts.push({
      label: "Assai evidence awaiting confirmation",
      value: String(assaiPending.length),
      tone: "amber",
      confidence: "verified",
    });
  }
  const submittedAt = input.submittedAt
    ? (input.submittedAt instanceof Date ? input.submittedAt : new Date(input.submittedAt))
    : null;
  if (submittedAt && input.status === "READY_FOR_REVIEW") {
    const late = rows.filter((e) => e.created_at && new Date(e.created_at) > submittedAt);
    if (late.length > 0) {
      facts.push({
        label: "Evidence added after submission",
        value: `${late.length} file(s)`,
        tone: "red",
        confidence: "verified",
      });
    }
  }
  return facts;
}

// ─── Signal 8 — Sibling rework pattern ────────────────────────────────────
// Emit amber when >=3 distinct sibling vcr_items in same category were
// returned, OR when returned/total ratio >= 0.5.
export interface Signal8Input {
  categoryCode: string | null | undefined;
  total: number;                    // count of same-category sibling prereqs
  returnedCount: number;            // distinct sibling vcr_items with ≥1 "returned" comment
}
export function computeSignal8(input: Signal8Input): WorkflowFact[] {
  const total = input.total | 0;
  const returnedCount = input.returnedCount | 0;
  if (total <= 0) return [];
  if (returnedCount >= 3 || returnedCount / total >= 0.5) {
    const catCode = input.categoryCode || "category";
    return [{
      label: "Category rework pattern",
      value: `${returnedCount} of ${total} ${catCode} items returned`,
      tone: "amber",
      confidence: "verified",
    }];
  }
  return [];
}

// ─── Signal 9 — Shared evidence on a returned sibling ─────────────────────
// Emit amber if any hit exists. Uses first hit for label/value.
export interface Signal9Hit {
  assai_doc_no?: string | null;
  file_name?: string | null;
  siblingCode?: string | null;
}
export interface Signal9Input {
  hits: Signal9Hit[];
}
export function computeSignal9(input: Signal9Input): WorkflowFact[] {
  const hits = input.hits || [];
  if (hits.length === 0) return [];
  const first = hits[0];
  const label = first.assai_doc_no || first.file_name || "";
  const siblingCode = first.siblingCode || "sibling";
  return [{
    label: "Shared evidence on a returned item",
    value: `${label} also cited on ${siblingCode}`,
    tone: "amber",
    confidence: "verified",
  }];
}

export const SIGNAL6_GOLDEN_CASES: WorkflowGoldenCase<Signal6Input>[] = [
  {
    id: "s6_assai_pending_amber",
    description: "2 unconfirmed Assai rows → amber '2'",
    input: {
      status: "IN_PROGRESS",
      submittedAt: null,
      evidence: [
        { source: "assai", confirmed: false, created_at: "2026-01-01T00:00:00Z" },
        { source: "Assai", confirmed: false, created_at: "2026-01-02T00:00:00Z" },
        { source: "assai", confirmed: true, created_at: "2026-01-03T00:00:00Z" },
      ],
    },
    expected: [{ label: "Assai evidence awaiting confirmation", value: "2", tone: "amber", confidence: "verified" }],
  },
  {
    id: "s6_late_evidence_red",
    description: "READY_FOR_REVIEW with 1 file added after submitted_at → red",
    input: {
      status: "READY_FOR_REVIEW",
      submittedAt: "2026-01-05T00:00:00Z",
      evidence: [
        { source: "manual", confirmed: true, created_at: "2026-01-04T00:00:00Z" },
        { source: "manual", confirmed: true, created_at: "2026-01-06T00:00:00Z" },
      ],
    },
    expected: [{ label: "Evidence added after submission", value: "1 file(s)", tone: "red", confidence: "verified" }],
  },
  {
    id: "s6_both_signals",
    description: "Both Assai-pending AND late evidence → 2 facts in order",
    input: {
      status: "READY_FOR_REVIEW",
      submittedAt: "2026-01-05T00:00:00Z",
      evidence: [
        { source: "assai", confirmed: false, created_at: "2026-01-01T00:00:00Z" },
        { source: "manual", confirmed: true, created_at: "2026-01-06T00:00:00Z" },
      ],
    },
    expected: [
      { label: "Assai evidence awaiting confirmation", value: "1", tone: "amber", confidence: "verified" },
      { label: "Evidence added after submission", value: "1 file(s)", tone: "red", confidence: "verified" },
    ],
  },
  {
    id: "s6_no_signal",
    description: "No Assai-pending, no late evidence → no fact",
    input: {
      status: "READY_FOR_REVIEW",
      submittedAt: "2026-01-05T00:00:00Z",
      evidence: [{ source: "manual", confirmed: true, created_at: "2026-01-04T00:00:00Z" }],
    },
    expected: [],
  },
  {
    id: "s6_late_evidence_wrong_status",
    description: "Late file but status not READY_FOR_REVIEW → suppress late-evidence",
    input: {
      status: "IN_PROGRESS",
      submittedAt: "2026-01-05T00:00:00Z",
      evidence: [{ source: "manual", confirmed: true, created_at: "2026-01-06T00:00:00Z" }],
    },
    expected: [],
  },
];

export const SIGNAL8_GOLDEN_CASES: WorkflowGoldenCase<Signal8Input>[] = [
  {
    id: "s8_three_returned_amber",
    description: "3 of 5 siblings returned → amber",
    input: {
      categoryCode: "OI",
      sameCategorySibItemIds: ["a", "b", "c", "d", "e"],
      returnedSibItemIds: ["a", "b", "c"],
    },
    expected: [{ label: "Category rework pattern", value: "3 of 5 OI items returned", tone: "amber", confidence: "verified" }],
  },
  {
    id: "s8_ratio_threshold",
    description: "1 of 2 siblings returned (50%) → amber",
    input: {
      categoryCode: "PR",
      sameCategorySibItemIds: ["a", "b"],
      returnedSibItemIds: ["a"],
    },
    expected: [{ label: "Category rework pattern", value: "1 of 2 PR items returned", tone: "amber", confidence: "verified" }],
  },
  {
    id: "s8_below_threshold",
    description: "1 of 4 (25%, <3 abs) → no fact",
    input: {
      categoryCode: "OI",
      sameCategorySibItemIds: ["a", "b", "c", "d"],
      returnedSibItemIds: ["a"],
    },
    expected: [],
  },
  {
    id: "s8_no_siblings",
    description: "No siblings → no fact",
    input: { categoryCode: "OI", sameCategorySibItemIds: [], returnedSibItemIds: [] },
    expected: [],
  },
  {
    id: "s8_null_category_fallback",
    description: "Null category label falls back to 'category'",
    input: {
      categoryCode: null,
      sameCategorySibItemIds: ["a", "b", "c"],
      returnedSibItemIds: ["a", "b", "c"],
    },
    expected: [{ label: "Category rework pattern", value: "3 of 3 category items returned", tone: "amber", confidence: "verified" }],
  },
];

export const SIGNAL9_GOLDEN_CASES: WorkflowGoldenCase<Signal9Input>[] = [
  {
    id: "s9_hit_by_doc_no",
    description: "Hit with assai_doc_no → amber, doc no in label",
    input: { hits: [{ assai_doc_no: "6529-WGEL-C017-PROC-001", file_name: "spec.pdf", siblingCode: "OI-12" }] },
    expected: [{
      label: "Shared evidence on a returned item",
      value: "6529-WGEL-C017-PROC-001 also cited on OI-12",
      tone: "amber",
      confidence: "verified",
    }],
  },
  {
    id: "s9_hit_by_filename",
    description: "Hit with only file_name → falls back to file_name",
    input: { hits: [{ assai_doc_no: null, file_name: "checklist.pdf", siblingCode: "OI-9" }] },
    expected: [{
      label: "Shared evidence on a returned item",
      value: "checklist.pdf also cited on OI-9",
      tone: "amber",
      confidence: "verified",
    }],
  },
  {
    id: "s9_no_hits",
    description: "No hits → no fact",
    input: { hits: [] },
    expected: [],
  },
  {
    id: "s9_null_sibling_code",
    description: "Missing sibling code falls back to 'sibling'",
    input: { hits: [{ assai_doc_no: "DOC-1", file_name: null, siblingCode: null }] },
    expected: [{
      label: "Shared evidence on a returned item",
      value: "DOC-1 also cited on sibling",
      tone: "amber",
      confidence: "verified",
    }],
  },
];

export function factsEqualStrict(a: WorkflowFact[], b: WorkflowFact[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (
      x.label !== y.label ||
      x.value !== y.value ||
      (x.tone ?? null) !== (y.tone ?? null) ||
      (x.confidence ?? null) !== (y.confidence ?? null)
    ) return false;
  }
  return true;
}
