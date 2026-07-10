// Phase 2C — RegisterReader eval harness.
// POST { schema_key }: for each eval case, run the SAME extraction path used
// in production (from ../_shared/register-reader.ts), score against
// ground_truth, write rows to insight_eval_runs, compute schema-level
// aggregate, and update insight_schema_status. Advisory only — never touches
// vcr_item_insights.
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  TABLE_ROW_SCHEMAS,
  tableRowExtract,
  isRowClosed,
  dedupeByKey,
} from "../_shared/register-reader.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRECISION_GATE = 0.95;
const EVIDENCE_BUCKET = "p2a-attachments";
const MAX_PDF_BYTES = 15 * 1024 * 1024;

type GroundRecord = {
  unit: string;
  acknowledged: string;
  source_page: number;
  expected_ack: boolean;
};
type GroundTruth = {
  key_field: string;
  total: number;
  acknowledged_count: number;
  outstanding_units: string[];
  records: GroundRecord[];
};

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

async function downloadPdf(sb: any, path: string): Promise<Uint8Array | null> {
  const { data: signed } = await sb.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, 60 * 60);
  if (!signed?.signedUrl) return null;
  const resp = await fetch(signed.signedUrl);
  if (!resp.ok) return null;
  const buf = await resp.arrayBuffer();
  if (buf.byteLength > MAX_PDF_BYTES) return null;
  return new Uint8Array(buf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  let schemaKey = "";
  try {
    const body = await req.json();
    schemaKey = String(body?.schema_key || "");
  } catch (_e) { /* schemaKey empty */ }
  if (!schemaKey) {
    return new Response(JSON.stringify({ error: "schema_key required" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const schema = TABLE_ROW_SCHEMAS[schemaKey];
  if (!schema) {
    return new Response(JSON.stringify({
      error: `Unknown or non-table-row schema '${schemaKey}'. Supported: ${Object.keys(TABLE_ROW_SCHEMAS).join(", ")}`,
    }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  if (!lovableKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: cases, error: caseErr } = await sb
    .from("insight_eval_cases")
    .select("id, fixture_path, ground_truth, description")
    .eq("schema_key", schemaKey);
  if (caseErr) {
    return new Response(JSON.stringify({ error: caseErr.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!cases || cases.length === 0) {
    return new Response(JSON.stringify({ error: `No eval cases seeded for '${schemaKey}'` }), {
      status: 404, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const perCase: any[] = [];
  let allHeadlineExact = true;
  let totalPrecisionNum = 0;
  let totalRecall = 0;

  for (const c of cases as Array<{ id: string; fixture_path: string; ground_truth: GroundTruth; description: string }>) {
    const gt = c.ground_truth;
    const gtByKey = new Map<string, GroundRecord>();
    for (const r of gt.records) gtByKey.set(norm(r.unit), r);

    const pdfBytes = await downloadPdf(sb, c.fixture_path);
    if (!pdfBytes) {
      perCase.push({
        case_id: c.id, fixture_path: c.fixture_path,
        precision: 0, recall: 0, headline_exact: false,
        extracted: null, error: "download_failed",
      });
      allHeadlineExact = false;
      continue;
    }

    const raw = await tableRowExtract(lovableKey, pdfBytes, c.fixture_path.split("/").pop() || "eval.pdf", schema);
    if (!raw) {
      perCase.push({
        case_id: c.id, fixture_path: c.fixture_path,
        precision: 0, recall: 0, headline_exact: false,
        extracted: null, error: "ai_read_failed",
      });
      allHeadlineExact = false;
      continue;
    }

    const rows = dedupeByKey(raw, schema.record_key);
    const total = rows.length;
    const closed = rows.filter((r) => isRowClosed(r, schema.closed_field)).length;

    // Per-record scoring against ground truth by unit.
    // Precision: extracted units that (a) exist in GT AND (b) whose
    // closed-flag matches GT.expected_ack.
    // Recall: GT units found among extracted with matching closed-flag.
    let tp = 0;
    const perRecord: any[] = [];
    for (const r of rows) {
      const key = norm(r[schema.record_key]);
      const gtRec = gtByKey.get(key);
      const extractedClosed = isRowClosed(r, schema.closed_field);
      if (gtRec && extractedClosed === gtRec.expected_ack) tp += 1;
      perRecord.push({
        unit: r[schema.record_key],
        extracted_ack: r[schema.closed_field] ?? "",
        extracted_closed: extractedClosed,
        gt_expected_ack: gtRec ? gtRec.expected_ack : null,
        matched: !!gtRec && extractedClosed === (gtRec?.expected_ack),
      });
    }
    const precision = total > 0 ? tp / total : 0;
    const recall = gt.total > 0 ? tp / gt.total : 0;

    const headline_exact = total === gt.total && closed === gt.acknowledged_count;
    if (!headline_exact) allHeadlineExact = false;
    totalPrecisionNum += precision;
    totalRecall += recall;

    // Mismatched records for reporting
    const mismatches = perRecord.filter((r) => !r.matched);

    // Write run row
    await sb.from("insight_eval_runs").insert({
      schema_key: schemaKey,
      case_id: c.id,
      precision_score: precision,
      recall_score: recall,
      headline_exact,
      extracted: {
        total,
        closed,
        gt_total: gt.total,
        gt_ack: gt.acknowledged_count,
        rows,
        per_record: perRecord,
      },
    });

    perCase.push({
      case_id: c.id,
      fixture_path: c.fixture_path,
      description: c.description,
      extracted_total: total,
      extracted_closed: closed,
      gt_total: gt.total,
      gt_ack: gt.acknowledged_count,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      headline_exact,
      mismatches,
    });
  }

  const nCases = cases.length;
  const avgPrecision = nCases ? totalPrecisionNum / nCases : 0;
  const avgRecall = nCases ? totalRecall / nCases : 0;
  const passed = avgPrecision >= PRECISION_GATE && allHeadlineExact;

  const aggregate = {
    cases: nCases,
    avg_precision: Number(avgPrecision.toFixed(4)),
    avg_recall: Number(avgRecall.toFixed(4)),
    all_headline_exact: allHeadlineExact,
    gate: { precision_min: PRECISION_GATE, headline_exact_all: true },
    ran_at: new Date().toISOString(),
  };

  await sb.from("insight_schema_status").upsert({
    schema_key: schemaKey,
    eval_status: passed ? "passed" : "unproven",
    aggregate,
    updated_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({
    schema_key: schemaKey,
    eval_status: passed ? "passed" : "unproven",
    aggregate,
    cases: perCase,
  }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
