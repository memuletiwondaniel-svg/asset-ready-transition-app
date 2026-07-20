// IIF Phase 3B — Synthetic golden fixtures for the punchlist (TI Scope /
// Construction & Commissioning punchlist) RegisterReader schema. Generates
// 3 PDFs with KNOWN ground truth, uploads to
// p2a-attachments/insight_eval/punchlist/*.pdf, and upserts rows into
// public.insight_eval_cases keyed on (schema_key, fixture_path).
//
// Ground truth uses `closed_count`. A row is closed iff:
//   status ∈ {Closed/Cleared/Signed-Off/Complete/Verified},
//   closed_by has name+date, no placeholder, remarks empty/none.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = "punchlist";
const DIR = `insight_eval/${SCHEMA}`;

type Row = {
  item_no: string;
  description: string;
  category: string;
  discipline: string;
  raised_by: string;
  target_close: string;
  status: string;
  closed_by: string;
  remarks: string;
};

interface Case {
  path: string;
  description: string;
  title: string;
  subtitle: string;
  rows: Row[];
  pages?: number;
}

// ── Case 1 (flagship): 8 items, 5 cleared. Outstanding for mixed reasons:
// blank closed_by, status Open, outstanding remark on an otherwise closed row.
const CASE_1: Case = {
  path: `${DIR}/case-01-8items-flagship.pdf`,
  description:
    "Punchlist flagship: 8 items. 5 cleared. Outstanding: P-004 (blank closed-by), P-005 (status Open), P-008 (outstanding remark).",
  title: "CONSTRUCTION / COMMISSIONING PUNCHLIST",
  subtitle: "Unit: DP300 — Pipeline TI  ·  Eval Case 01  ·  Issued: 12 Jul 2026",
  rows: [
    { item_no: "P-001", description: "Missing valve tag — 12\" HV-101",     category: "B", discipline: "Piping", raised_by: "J. Rossi — 10 Jul 2026", target_close: "12 Jul 2026", status: "Closed",      closed_by: "J. Rossi — 12 Jul 2026",  remarks: "" },
    { item_no: "P-002", description: "Support U-bolt loose at spool 12A",   category: "A", discipline: "Piping", raised_by: "K. Ito — 10 Jul 2026",   target_close: "11 Jul 2026", status: "Cleared",     closed_by: "K. Ito — 13 Jul 2026",    remarks: "None" },
    { item_no: "P-003", description: "Insulation gap at flange F-14",       category: "B", discipline: "Mech",   raised_by: "M. Nguyen — 11 Jul 2026",target_close: "12 Jul 2026", status: "Signed-Off",  closed_by: "M. Nguyen — 12 Jul 2026", remarks: "" },
    { item_no: "P-004", description: "Paint touch-up on tie-in TI-12",      category: "B", discipline: "Piping", raised_by: "P. Kaur — 10 Jul 2026",  target_close: "12 Jul 2026", status: "Closed",      closed_by: "",                        remarks: "" }, // outstanding: blank closed_by
    { item_no: "P-005", description: "Instrument tubing route rework",      category: "A", discipline: "Instr",  raised_by: "S. Ahmed — 09 Jul 2026", target_close: "15 Jul 2026", status: "Open",        closed_by: "",                        remarks: "" }, // outstanding: status open
    { item_no: "P-006", description: "Cable tray tag missing — TI-13",      category: "B", discipline: "Elec",   raised_by: "T. Ortega — 11 Jul 2026",target_close: "11 Jul 2026", status: "Complete",    closed_by: "T. Ortega — 13 Jul 2026", remarks: "" },
    { item_no: "P-007", description: "Bolt torque check pending",           category: "A", discipline: "Piping", raised_by: "R. Chen — 10 Jul 2026",  target_close: "10 Jul 2026", status: "Signed-Off",  closed_by: "R. Chen — 12 Jul 2026",   remarks: "N/A" },
    { item_no: "P-008", description: "PSV certificate expired",             category: "A", discipline: "Mech",   raised_by: "L. Novak — 08 Jul 2026", target_close: "08 Jul 2026", status: "Closed",      closed_by: "L. Novak — 13 Jul 2026",  remarks: "Awaiting recert cert copy" }, // outstanding: remark
  ],
};

// ── Case 2 (all-cleared happy path): 10 items, all cleared cleanly.
const CASE_2: Case = {
  path: `${DIR}/case-02-10items-full-cleared.pdf`,
  description: "10 punch items, all cleared with signer+date, no outstanding remarks (happy path).",
  title: "CONSTRUCTION / COMMISSIONING PUNCHLIST",
  subtitle: "Unit: DP110  ·  Eval Case 02  ·  Issued: 03 Aug 2026",
  rows: [
    { item_no: "P-101", description: "Valve tag missing",       category: "B", discipline: "Piping", raised_by: "A. Bell — 02 Aug 2026",  target_close: "03 Aug 2026", status: "Closed",     closed_by: "A. Bell — 03 Aug 2026",  remarks: "" },
    { item_no: "P-102", description: "Support loose",           category: "A", discipline: "Piping", raised_by: "C. Diaz — 02 Aug 2026",  target_close: "03 Aug 2026", status: "Cleared",    closed_by: "C. Diaz — 03 Aug 2026",  remarks: "None" },
    { item_no: "P-103", description: "Insulation gap",          category: "B", discipline: "Mech",   raised_by: "E. Fox — 03 Aug 2026",   target_close: "04 Aug 2026", status: "Signed-Off", closed_by: "E. Fox — 04 Aug 2026",   remarks: "" },
    { item_no: "P-104", description: "Paint touch-up",          category: "B", discipline: "Coat",   raised_by: "G. Hale — 03 Aug 2026",  target_close: "04 Aug 2026", status: "Complete",   closed_by: "G. Hale — 04 Aug 2026",  remarks: "" },
    { item_no: "P-105", description: "Tubing rework",           category: "A", discipline: "Instr",  raised_by: "I. Jain — 02 Aug 2026",  target_close: "03 Aug 2026", status: "Closed",     closed_by: "I. Jain — 03 Aug 2026",  remarks: "N/A" },
    { item_no: "P-106", description: "Cable tray tag",          category: "B", discipline: "Elec",   raised_by: "K. Lam — 03 Aug 2026",   target_close: "04 Aug 2026", status: "Verified",   closed_by: "K. Lam — 04 Aug 2026",   remarks: "" },
    { item_no: "P-107", description: "Bolt torque",             category: "A", discipline: "Piping", raised_by: "M. Novak — 04 Aug 2026", target_close: "05 Aug 2026", status: "Closed",     closed_by: "M. Novak — 05 Aug 2026", remarks: "None" },
    { item_no: "P-108", description: "PSV recert",              category: "A", discipline: "Mech",   raised_by: "O. Perez — 04 Aug 2026", target_close: "05 Aug 2026", status: "Cleared",    closed_by: "O. Perez — 05 Aug 2026", remarks: "" },
    { item_no: "P-109", description: "Deluge valve check",      category: "B", discipline: "Fire",   raised_by: "Q. Rowe — 02 Aug 2026",  target_close: "03 Aug 2026", status: "Signed-Off", closed_by: "Q. Rowe — 03 Aug 2026",  remarks: "" },
    { item_no: "P-110", description: "Signage refresh",         category: "B", discipline: "HSE",    raised_by: "S. Turi — 03 Aug 2026",  target_close: "04 Aug 2026", status: "Closed",     closed_by: "S. Turi — 04 Aug 2026",  remarks: "-" },
  ],
};

// ── Case 3 (messy multi-page): 12 items across 2 pages, 8 cleared.
// Row 9 name-only (no date); Row 10 status In Progress; Row 11 outstanding
// remark; Row 12 "pending signoff" placeholder in closed_by.
const CASE_3: Case = {
  path: `${DIR}/case-03-12items-2page-messy.pdf`,
  description:
    "12 punch items across 2 pages, 8 cleared. Row 9 (P-209) name but no date; Row 10 (P-210) status In Progress; Row 11 (P-211) outstanding remark; Row 12 (P-212) 'pending signoff'.",
  title: "CONSTRUCTION / COMMISSIONING PUNCHLIST",
  subtitle: "Unit: DP220 — Pipeline TI  ·  Eval Case 03  ·  Issued: 20 Aug 2026",
  pages: 2,
  rows: [
    { item_no: "P-201", description: "Valve tag",       category: "B", discipline: "Piping", raised_by: "A. Blake — 19 Aug 2026", target_close: "20 Aug 2026", status: "Closed",      closed_by: "A. Blake — 20 Aug 2026", remarks: "" },
    { item_no: "P-202", description: "Support loose",   category: "A", discipline: "Piping", raised_by: "C. Doran — 19 Aug 2026", target_close: "20 Aug 2026", status: "Cleared",     closed_by: "C. Doran — 20 Aug 2026", remarks: "None" },
    { item_no: "P-203", description: "Insulation gap",  category: "B", discipline: "Mech",   raised_by: "E. Frost — 20 Aug 2026", target_close: "21 Aug 2026", status: "Signed-Off",  closed_by: "E. Frost — 21 Aug 2026", remarks: "" },
    { item_no: "P-204", description: "Paint touch-up",  category: "B", discipline: "Coat",   raised_by: "G. Hume — 20 Aug 2026",  target_close: "21 Aug 2026", status: "Complete",    closed_by: "G. Hume — 21 Aug 2026",  remarks: "" },
    { item_no: "P-205", description: "Tubing rework",   category: "A", discipline: "Instr",  raised_by: "I. Joshi — 19 Aug 2026", target_close: "20 Aug 2026", status: "Closed",      closed_by: "I. Joshi — 20 Aug 2026", remarks: "N/A" },
    { item_no: "P-206", description: "Cable tray tag",  category: "B", discipline: "Elec",   raised_by: "K. Lu — 20 Aug 2026",    target_close: "21 Aug 2026", status: "Verified",    closed_by: "K. Lu — 21 Aug 2026",    remarks: "" },
    { item_no: "P-207", description: "Bolt torque",     category: "A", discipline: "Piping", raised_by: "M. Nair — 21 Aug 2026",  target_close: "22 Aug 2026", status: "Closed",      closed_by: "M. Nair — 22 Aug 2026",  remarks: "" },
    { item_no: "P-208", description: "PSV recert",      category: "A", discipline: "Mech",   raised_by: "O. Petit — 21 Aug 2026", target_close: "22 Aug 2026", status: "Cleared",     closed_by: "O. Petit — 22 Aug 2026", remarks: "" },
    { item_no: "P-209", description: "Deluge valve",    category: "B", discipline: "Fire",   raised_by: "T. Vance — 19 Aug 2026", target_close: "20 Aug 2026", status: "Closed",      closed_by: "T. Vance",               remarks: "" }, // outstanding: no date
    { item_no: "P-210", description: "Signage refresh", category: "B", discipline: "HSE",    raised_by: "U. Wren — 20 Aug 2026",  target_close: "21 Aug 2026", status: "In Progress", closed_by: "",                       remarks: "" }, // outstanding: status open
    { item_no: "P-211", description: "Fire main test",  category: "A", discipline: "Fire",   raised_by: "R. Sato — 17 Aug 2026",  target_close: "18 Aug 2026", status: "Closed",      closed_by: "R. Sato — 22 Aug 2026",  remarks: "Awaiting witness signature" }, // outstanding: remark
    { item_no: "P-212", description: "Hydrant flow",    category: "B", discipline: "Fire",   raised_by: "V. Yates — 20 Aug 2026", target_close: "21 Aug 2026", status: "Closed",      closed_by: "Pending signoff",        remarks: "" }, // outstanding: placeholder
  ],
};

const CASES: Case[] = [CASE_1, CASE_2, CASE_3];

// ── Ground-truth closed rule — mirrors _shared/register-reader.ts predicate.
const NAME_RE = /[A-Za-z]{2,}/;
const DATE_RE =
  /(\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\s\-\/](?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s\-\/]?\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{2,4}\b)/i;
const PLACEHOLDER_SUBSTRINGS = [
  "pending", "tbd", "awaiting", "to follow", "n/a", "not yet", "outstanding", "none",
];
const ANOMALY_EMPTY = /^(|none|n\/?a|nil|no anomaly|no anomalies|-|—|not applicable)$/i;
const STATUS_CLOSED = /(^|[^a-z])(closed|complete[d]?|cleared|accepted|signed[\s_-]*off|resolved|actioned|verified)([^a-z]|$)/i;
const STATUS_OPEN = /(open|in[\s_-]*progress|outstanding|ongoing|deferred|pending|raised)/i;

function isClosedGT(r: Row): boolean {
  const status = (r.status || "").trim();
  if (!status) return false;
  if (STATUS_OPEN.test(status.toLowerCase())) return false;
  if (!STATUS_CLOSED.test(status)) return false;
  const co = (r.closed_by || "").trim();
  if (!co) return false;
  if (!NAME_RE.test(co)) return false;
  if (!DATE_RE.test(co)) return false;
  const lower = co.toLowerCase();
  for (const p of PLACEHOLDER_SUBSTRINGS) if (lower.includes(p)) return false;
  const rem = (r.remarks || "").trim();
  if (rem && !ANOMALY_EMPTY.test(rem)) return false;
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
    const draw = (t: string, x: number, y: number, size = 7, f = font) =>
      page.drawText(t, { x, y, size, font: f, color: rgb(0, 0, 0) });
    draw(c.title, 40, 800, 13, bold);
    draw(`${c.subtitle}  ·  Page ${p + 1} of ${totalPages}`, 40, 782, 8);

    const hy = 750;
    draw("ITEM",      40,  hy, 7, bold);
    draw("DESCRIPTION", 80, hy, 7, bold);
    draw("CAT",       220, hy, 7, bold);
    draw("DISC",      240, hy, 7, bold);
    draw("RAISED BY", 275, hy, 7, bold);
    draw("TARGET",    355, hy, 7, bold);
    draw("STATUS",    400, hy, 7, bold);
    draw("CLOSED BY", 445, hy, 7, bold);
    draw("REMARKS",   525, hy, 7, bold);
    page.drawLine({ start: { x: 35, y: hy - 4 }, end: { x: 575, y: hy - 4 }, thickness: 0.6 });

    const start = p * rowsPerPage;
    const end = Math.min(start + rowsPerPage, c.rows.length);
    let y = hy - 18;
    for (let i = start; i < end; i++) {
      const r = c.rows[i];
      draw(r.item_no, 40, y);
      draw(r.description.slice(0, 26), 80, y);
      draw(r.category, 220, y);
      draw(r.discipline.slice(0, 6), 240, y);
      draw(r.raised_by.slice(0, 16), 275, y);
      draw(r.target_close, 355, y);
      draw(r.status, 400, y);
      draw((r.closed_by || "—").slice(0, 16), 445, y);
      draw((r.remarks || "").slice(0, 14), 525, y);
      y -= 18;
    }
    draw("Signed: Commissioning Lead (redacted) — Construction Manager (redacted)", 40, 120, 8);
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
        item_no: r.item_no,
        description: r.description,
        category: r.category,
        discipline: r.discipline,
        raised_by: r.raised_by,
        target_close: r.target_close,
        status: r.status,
        closed_by: r.closed_by,
        remarks: r.remarks,
        source_page: pageNo,
        expected_closed: isClosedGT(r),
      };
    });
    const total = records.length;
    const closed = records.filter((r) => r.expected_closed).length;
    const outstanding = records.filter((r) => !r.expected_closed).map((r) => r.item_no);
    const ground_truth = {
      key_field: "item_no",
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
