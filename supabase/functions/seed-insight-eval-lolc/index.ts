// LOLC-2 — Synthetic golden fixtures for the LOLC (Locked Open / Locked
// Closed) RegisterReader schema. Generates 3 PDFs with KNOWN ground truth,
// uploads to p2a-attachments/insight_eval/lolc/*.pdf, and upserts rows into
// public.insight_eval_cases keyed on (schema_key, fixture_path).
//
// Ground truth uses the NEW `closed_count` key (the run-insight-eval shim
// accepts both `closed_count` and `acknowledged_count` during transition).
// A row is closed iff: verification has a name+date AND as_left_position
// matches required_position AND no anomaly is written — matches the
// schema-level closed_predicate in ../_shared/register-reader.ts.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = "lolc";
const DIR = `insight_eval/${SCHEMA}`;

type Row = {
  tag_no: string;
  required_position: string;
  as_left_position: string;
  verification: string;
  anomaly: string;
};

interface Case {
  path: string;
  description: string;
  title: string;
  subtitle: string;
  rows: Row[];
  pages?: number;
}

// ── Case 1 (flagship): 8 valves, 5 verified, 3 outstanding for mixed
// reasons (blank verification, wrong as-left position, written anomaly).
const CASE_1: Case = {
  path: `${DIR}/case-01-8valves-flagship.pdf`,
  description:
    "LOLC flagship: 8 valves. 5 verified. Outstanding: LO-1004 (blank), LO-1005 (as-left Closed vs required LO), LC-2003 (anomaly noted).",
  title: "LOCKED OPEN / LOCKED CLOSED (LOLC) VALVE REGISTER",
  subtitle: "Unit: DP300  ·  Eval Case 01  ·  Issued: 12 Jul 2026",
  rows: [
    { tag_no: "LO-1001", required_position: "LO", as_left_position: "LO", verification: "J. Rossi — 12 Jul 2026",  anomaly: "" },
    { tag_no: "LO-1002", required_position: "LO", as_left_position: "LO", verification: "K. Ito — 13 Jul 2026",    anomaly: "None" },
    { tag_no: "LO-1003", required_position: "LO", as_left_position: "LO", verification: "M. Nguyen — 12 Jul 2026", anomaly: "" },
    { tag_no: "LO-1004", required_position: "LO", as_left_position: "",   verification: "",                        anomaly: "" }, // outstanding: blank verification
    { tag_no: "LO-1005", required_position: "LO", as_left_position: "LC", verification: "P. Kaur — 14 Jul 2026",   anomaly: "" }, // outstanding: wrong as-left
    { tag_no: "LC-2001", required_position: "LC", as_left_position: "LC", verification: "S. Ahmed — 13 Jul 2026",  anomaly: "" },
    { tag_no: "LC-2002", required_position: "LC", as_left_position: "LC", verification: "T. Ortega — 12 Jul 2026", anomaly: "N/A" },
    { tag_no: "LC-2003", required_position: "LC", as_left_position: "LC", verification: "R. Chen — 13 Jul 2026",   anomaly: "Chain missing" }, // outstanding: anomaly
  ],
};

// ── Case 2 (all-closed happy path): 10 valves, all verified.
const CASE_2: Case = {
  path: `${DIR}/case-02-10valves-full-verified.pdf`,
  description: "10 valves, all verified with correct as-left position and no anomaly (fully closed happy path).",
  title: "LOCKED OPEN / LOCKED CLOSED (LOLC) VALVE REGISTER",
  subtitle: "Unit: DP110  ·  Eval Case 02  ·  Issued: 03 Aug 2026",
  rows: [
    { tag_no: "LO-3001", required_position: "LO", as_left_position: "LO", verification: "A. Bell — 03 Aug 2026",  anomaly: "" },
    { tag_no: "LO-3002", required_position: "LO", as_left_position: "LO", verification: "C. Diaz — 03 Aug 2026",  anomaly: "None" },
    { tag_no: "LO-3003", required_position: "LO", as_left_position: "LO", verification: "E. Fox — 04 Aug 2026",   anomaly: "" },
    { tag_no: "LO-3004", required_position: "LO", as_left_position: "LO", verification: "G. Hale — 04 Aug 2026",  anomaly: "" },
    { tag_no: "LO-3005", required_position: "LO", as_left_position: "LO", verification: "I. Jain — 03 Aug 2026",  anomaly: "N/A" },
    { tag_no: "LC-4001", required_position: "LC", as_left_position: "LC", verification: "K. Lam — 04 Aug 2026",   anomaly: "" },
    { tag_no: "LC-4002", required_position: "LC", as_left_position: "LC", verification: "M. Novak — 05 Aug 2026", anomaly: "None" },
    { tag_no: "LC-4003", required_position: "LC", as_left_position: "LC", verification: "O. Perez — 05 Aug 2026", anomaly: "" },
    { tag_no: "LC-4004", required_position: "LC", as_left_position: "LC", verification: "Q. Rowe — 03 Aug 2026",  anomaly: "" },
    { tag_no: "LC-4005", required_position: "LC", as_left_position: "LC", verification: "S. Turi — 04 Aug 2026",  anomaly: "-" },
  ],
};

// ── Case 3 (messy multi-page): 12 valves across 2 pages, 8 verified. Row 9
// has a name but no date (must count as OUTSTANDING). Row 10 has "pending"
// in verification. Rows 11-12 outstanding by anomaly / wrong position.
const CASE_3: Case = {
  path: `${DIR}/case-03-12valves-2page-messy.pdf`,
  description:
    "12 valves across 2 pages, 8 verified. Row 9 (LO-5009) name but no date; Row 10 (LC-6003) 'pending'; Row 11 (LC-6004) anomaly; Row 12 (LO-5012) as-left wrong.",
  title: "LOCKED OPEN / LOCKED CLOSED (LOLC) VALVE REGISTER",
  subtitle: "Unit: DP220  ·  Eval Case 03  ·  Issued: 20 Aug 2026",
  pages: 2,
  rows: [
    { tag_no: "LO-5001", required_position: "LO", as_left_position: "LO", verification: "A. Blake — 20 Aug 2026", anomaly: "" },
    { tag_no: "LO-5002", required_position: "LO", as_left_position: "LO", verification: "C. Doran — 20 Aug 2026", anomaly: "None" },
    { tag_no: "LO-5003", required_position: "LO", as_left_position: "LO", verification: "E. Frost — 21 Aug 2026", anomaly: "" },
    { tag_no: "LO-5004", required_position: "LO", as_left_position: "LO", verification: "G. Hume — 21 Aug 2026",  anomaly: "" },
    { tag_no: "LO-5005", required_position: "LO", as_left_position: "LO", verification: "I. Joshi — 20 Aug 2026", anomaly: "N/A" },
    { tag_no: "LO-5006", required_position: "LO", as_left_position: "LO", verification: "K. Lu — 21 Aug 2026",    anomaly: "" },
    { tag_no: "LC-6001", required_position: "LC", as_left_position: "LC", verification: "M. Nair — 22 Aug 2026",  anomaly: "" },
    { tag_no: "LC-6002", required_position: "LC", as_left_position: "LC", verification: "O. Petit — 22 Aug 2026", anomaly: "" },
    { tag_no: "LO-5009", required_position: "LO", as_left_position: "LO", verification: "T. Vance",               anomaly: "" }, // outstanding: no date
    { tag_no: "LC-6003", required_position: "LC", as_left_position: "LC", verification: "Pending signoff",        anomaly: "" }, // outstanding: pending
    { tag_no: "LC-6004", required_position: "LC", as_left_position: "LC", verification: "R. Sato — 22 Aug 2026",  anomaly: "Lock broken" }, // outstanding: anomaly
    { tag_no: "LO-5012", required_position: "LO", as_left_position: "LC", verification: "U. Villa — 21 Aug 2026", anomaly: "" }, // outstanding: wrong as-left
  ],
};

const CASES: Case[] = [CASE_1, CASE_2, CASE_3];

// ── Ground-truth closed rule (mirrors the schema-level closed_predicate).
const NAME_RE = /[A-Za-z]{2,}/;
const DATE_RE =
  /(\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\s\-\/](?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s\-\/]?\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{2,4}\b)/i;
// Prod uses substring matching on these tokens (register-reader.ts). Use the
// same list here so ground truth is byte-consistent with the extractor.
const PLACEHOLDER_SUBSTRINGS = [
  "pending", "tbd", "awaiting", "to follow", "n/a", "not yet", "outstanding", "none",
];

function isClosedGT(r: Row): boolean {
  const v = (r.verification || "").trim();
  if (!v) return false;
  if (PLACEHOLDER.test(v)) return false;
  if (!NAME_RE.test(v)) return false;
  if (!DATE_RE.test(v)) return false;
  const req = (r.required_position || "").trim().toLowerCase();
  const asL = (r.as_left_position || "").trim().toLowerCase();
  if (!asL) return false;
  const wantOpen = /(^|[^a-z])(lo|open)([^a-z]|$)/.test(req) && !/closed/.test(req);
  const wantClosed = /(^|[^a-z])(lc|closed)([^a-z]|$)/.test(req);
  const isOpen = /(^|[^a-z])(lo|open)([^a-z]|$)/.test(asL) && !/closed/.test(asL);
  const isClosed = /(^|[^a-z])(lc|closed)([^a-z]|$)/.test(asL);
  if (!(wantOpen && isOpen) && !(wantClosed && isClosed) && (wantOpen || wantClosed)) return false;
  const anomaly = (r.anomaly || "").trim();
  if (anomaly && !ANOMALY_EMPTY.test(anomaly)) return false;
  return true;
}

async function buildPdf(c: Case): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = c.pages || 1;
  const rowsPerPage = Math.ceil(c.rows.length / totalPages);

  for (let p = 0; p < totalPages; p++) {
    const page = doc.addPage([595, 842]);
    const draw = (t: string, x: number, y: number, size = 9, f = font) =>
      page.drawText(t, { x, y, size, font: f, color: rgb(0, 0, 0) });
    draw(c.title, 40, 800, 13, bold);
    draw(`${c.subtitle}  ·  Page ${p + 1} of ${totalPages}`, 40, 782, 8);

    const hy = 750;
    draw("VALVE TAG NO",       40,  hy, 9, bold);
    draw("REQUIRED",           130, hy, 9, bold);
    draw("AS-LEFT",            200, hy, 9, bold);
    draw("VERIFICATION",       270, hy, 9, bold);
    draw("ANOMALY / REMARKS",  430, hy, 9, bold);
    page.drawLine({ start: { x: 35, y: hy - 4 }, end: { x: 560, y: hy - 4 }, thickness: 0.6 });

    const start = p * rowsPerPage;
    const end = Math.min(start + rowsPerPage, c.rows.length);
    let y = hy - 20;
    for (let i = start; i < end; i++) {
      const r = c.rows[i];
      draw(r.tag_no, 40, y);
      draw(r.required_position || "—", 130, y);
      draw(r.as_left_position || "—", 200, y);
      draw(r.verification || "—", 270, y);
      draw(r.anomaly || "None", 430, y);
      y -= 20;
    }
    draw("Signed: Field Verifier (redacted) — Ops Supervisor (redacted)", 40, 120, 8);
  }
  return await doc.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const seeded: Array<{ path: string; case_id?: string; size: number; total: number; closed: number; ok: boolean; error?: string }> = [];

  for (const c of CASES) {
    const bytes = await buildPdf(c);
    const { error: upErr } = await sb.storage
      .from("p2a-attachments")
      .upload(c.path, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) { seeded.push({ path: c.path, size: bytes.byteLength, total: 0, closed: 0, ok: false, error: upErr.message }); continue; }

    const records = c.rows.map((r, idx) => {
      const pageNo = c.pages && c.pages > 1
        ? Math.floor(idx / Math.ceil(c.rows.length / c.pages)) + 1
        : 1;
      return {
        tag_no: r.tag_no,
        required_position: r.required_position,
        as_left_position: r.as_left_position,
        verification: r.verification,
        anomaly: r.anomaly,
        source_page: pageNo,
        expected_closed: isClosedGT(r),
      };
    });
    const total = records.length;
    const closed = records.filter((r) => r.expected_closed).length;
    const outstanding = records.filter((r) => !r.expected_closed).map((r) => r.tag_no);
    const ground_truth = {
      key_field: "tag_no",
      total,
      closed_count: closed,
      outstanding_keys: outstanding,
      records,
    };

    await sb.from("insight_eval_cases")
      .delete()
      .eq("schema_key", SCHEMA)
      .eq("fixture_path", c.path);
    const { data: ins, error: insErr } = await sb
      .from("insight_eval_cases")
      .insert({
        schema_key: SCHEMA,
        fixture_path: c.path,
        ground_truth,
        description: c.description,
      })
      .select("id")
      .maybeSingle();
    if (insErr) { seeded.push({ path: c.path, size: bytes.byteLength, total, closed, ok: false, error: insErr.message }); continue; }
    seeded.push({ path: c.path, case_id: (ins as any)?.id, size: bytes.byteLength, total, closed, ok: true });
  }

  return new Response(JSON.stringify({ schema: SCHEMA, seeded }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
