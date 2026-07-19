// Pure signal-7 (EXE-1b) fact computer, extracted from compute-vcr-insights
// so the eval harness can exercise it deterministically without touching the DB.
//
// BEHAVIOUR-PRESERVING: output must be byte-identical to the previous inline
// block in compute-vcr-insights/index.ts around L1276-1340. Do not tweak
// thresholds, tones, labels, or value strings here without also updating the
// golden cases in run-insight-eval.

export type Signal7Tone = "grey" | "amber" | "red" | "green";
export type Signal7Confidence = "verified" | "inferred";

export interface Signal7Fact {
  label: string;
  value: string;
  tone: Signal7Tone;
  confidence: Signal7Confidence;
}

export interface Signal7ItemTask {
  type: "vcr_item_action" | "vcr_item_review" | string;
  status: string;
  created_at: string; // ISO
}

const TERMINAL_STATUSES = new Set([
  "ACCEPTED",
  "QUALIFICATION_APPROVED",
  "REJECTED",
  "NA",
]);
const OPEN_STATUSES = new Set(["pending", "todo", "waiting", "in_progress"]);

function daysBetween(a: Date | null | undefined, b: Date): number {
  if (!a) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

/**
 * Pure signal-7 fact generator. `now` is injectable for deterministic evals.
 */
export function computeSignal7(
  prereqStatus: string | null | undefined,
  itemTasks: Signal7ItemTask[],
  now: Date = new Date(),
): Signal7Fact[] {
  const facts: Signal7Fact[] = [];
  const status = String(prereqStatus || "");
  const isTerminal = TERMINAL_STATUSES.has(status);

  const openTasks = (itemTasks || []).filter((t) =>
    OPEN_STATUSES.has(String(t.status || "").toLowerCase())
  );
  const openDelivery = openTasks.filter((t) => t.type === "vcr_item_action").length;
  const openReview = openTasks.filter((t) => t.type === "vcr_item_review").length;

  if (isTerminal && openTasks.length > 0) {
    facts.push({
      label: "Orphan item-tasks",
      value: `${openTasks.length} open on terminal prereq`,
      tone: "red",
      confidence: "verified",
    });
    return facts;
  }
  if (isTerminal) return facts;

  if (openDelivery > 0) {
    const oldest = openTasks
      .filter((t) => t.type === "vcr_item_action")
      .map((t) => new Date(t.created_at))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const days = oldest ? daysBetween(oldest, now) : 0;
    facts.push({
      label: "Open delivery task",
      value: days > 0 ? `${days} days` : "1 open",
      tone: days >= 5 ? "amber" : "grey",
      confidence: "verified",
    });
  }
  if (openReview > 0) {
    const oldest = openTasks
      .filter((t) => t.type === "vcr_item_review")
      .map((t) => new Date(t.created_at))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const days = oldest ? daysBetween(oldest, now) : 0;
    facts.push({
      label: openReview === 1 ? "Open review task" : `Open review tasks`,
      value: openReview === 1
        ? (days > 0 ? `${days} days` : "1 open")
        : `${openReview} open`,
      tone: days >= 5 ? "amber" : "grey",
      confidence: "verified",
    });
  }

  return facts;
}

// ─── Golden cases for the eval harness ────────────────────────────────────
// Each case pins inputs + expected fact shape. `now` is a fixed anchor so
// day-diff math is deterministic.

export interface Signal7GoldenCase {
  id: string;
  description: string;
  now: string; // ISO
  prereq_status: string;
  item_tasks: Signal7ItemTask[];
  expected: Signal7Fact[];
}

export const SIGNAL7_GOLDEN_CASES: Signal7GoldenCase[] = [
  {
    id: "open_review_amber_9_days",
    description: "Open review task aged 9 days → amber 'Open review task · 9 days'",
    now: "2026-01-10T00:00:00Z",
    prereq_status: "IN_REVIEW",
    item_tasks: [
      {
        type: "vcr_item_review",
        status: "pending",
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
    expected: [
      { label: "Open review task", value: "9 days", tone: "amber", confidence: "verified" },
    ],
  },
  {
    id: "open_delivery_grey_1_day",
    description: "Open delivery task aged 1 day → grey 'Open delivery task · 1 days'",
    now: "2026-01-02T00:00:00Z",
    prereq_status: "IN_PROGRESS",
    item_tasks: [
      {
        type: "vcr_item_action",
        status: "pending",
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
    expected: [
      { label: "Open delivery task", value: "1 days", tone: "grey", confidence: "verified" },
    ],
  },
  {
    id: "orphan_on_terminal_red",
    description: "Open item-task on ACCEPTED prereq → red orphan flag",
    now: "2026-01-10T00:00:00Z",
    prereq_status: "ACCEPTED",
    item_tasks: [
      {
        type: "vcr_item_review",
        status: "pending",
        created_at: "2026-01-05T00:00:00Z",
      },
    ],
    expected: [
      {
        label: "Orphan item-tasks",
        value: "1 open on terminal prereq",
        tone: "red",
        confidence: "verified",
      },
    ],
  },
  {
    id: "no_signal_empty",
    description: "No item-tasks + non-terminal prereq → no facts",
    now: "2026-01-10T00:00:00Z",
    prereq_status: "IN_PROGRESS",
    item_tasks: [],
    expected: [],
  },
];

export function factsEqual(a: Signal7Fact[], b: Signal7Fact[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (
      x.label !== y.label ||
      x.value !== y.value ||
      x.tone !== y.tone ||
      x.confidence !== y.confidence
    ) return false;
  }
  return true;
}
