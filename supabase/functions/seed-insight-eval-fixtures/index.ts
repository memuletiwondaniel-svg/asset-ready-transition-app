// One-shot seeder for Phase 2C RegisterReader eval fixtures (su_notification).
// Generates 3 PDFs with KNOWN ground truth, uploads to
// p2a-attachments/insight_eval/su_notification/*.pdf, and upserts rows into
// public.insight_eval_cases. Idempotent (unique by schema_key+fixture_path).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = "su_notification";
const DIR = `insight_eval/${SCHEMA}`;

type Row = { unit: string; notified: string; acknowledged: string };

interface Case {
  path: string;
  description: string;
  title: string;
  subtitle: string;
  rows: Row[];
  pages?: number; // if 2, split at half
}

const CASE_1: Case = {
  path: `${DIR}/case-01-oi19-8units-2outstanding.pdf`,
  description: "OI-19 flagship: 8 units, 6 acknowledged, Utilities + Marine outstanding.",
  title: "START-UP NOTIFICATION & ACKNOWLEDGMENT SHEET",
  subtitle: "Handover Point: DP300  ·  Eval Case 01  ·  Issued: 12 Jul 2026",
  rows: [
    { unit: "Operations",  notified: "12 Jul 2026 — email", acknowledged: "J. Rossi — 12 Jul 2026" },
    { unit: "Maintenance", notified: "12 Jul 2026 — email", acknowledged: "K. Ito — 13 Jul 2026" },
    { unit: "HSE",         notified: "12 Jul 2026 — email", acknowledged: "M. Nguyen — 12 Jul 2026" },
    { unit: "Laboratory",  notified: "12 Jul 2026 — email", acknowledged: "P. Kaur — 14 Jul 2026" },
    { unit: "Logistics",   notified: "12 Jul 2026 — email", acknowledged: "S. Ahmed — 13 Jul 2026" },
    { unit: "Security",    notified: "12 Jul 2026 — email", acknowledged: "T. Ortega — 12 Jul 2026" },
    { unit: "Utilities",   notified: "12 Jul 2026 — email", acknowledged: "" },
    { unit: "Marine",      notified: "12 Jul 2026 — email", acknowledged: "" },
  ],
};

const CASE_2: Case = {
  path: `${DIR}/case-02-10units-full-ack.pdf`,
  description: "10 units, all acknowledged (fully closed happy-path).",
  title: "START-UP NOTIFICATION & ACKNOWLEDGMENT SHEET",
  subtitle: "Handover Point: DP110  ·  Eval Case 02  ·  Issued: 03 Aug 2026",
  rows: [
    { unit: "Operations",  notified: "03 Aug 2026 — email", acknowledged: "A. Bell — 03 Aug 2026" },
    { unit: "Maintenance", notified: "03 Aug 2026 — email", acknowledged: "C. Diaz — 03 Aug 2026" },
    { unit: "HSE",         notified: "03 Aug 2026 — email", acknowledged: "E. Fox — 04 Aug 2026" },
    { unit: "Laboratory",  notified: "03 Aug 2026 — email", acknowledged: "G. Hale — 04 Aug 2026" },
    { unit: "Logistics",   notified: "03 Aug 2026 — email", acknowledged: "I. Jain — 03 Aug 2026" },
    { unit: "Security",    notified: "03 Aug 2026 — email", acknowledged: "K. Lam — 04 Aug 2026" },
    { unit: "Utilities",   notified: "03 Aug 2026 — email", acknowledged: "M. Novak — 05 Aug 2026" },
    { unit: "Marine",      notified: "03 Aug 2026 — email", acknowledged: "O. Perez — 05 Aug 2026" },
    { unit: "Engineering", notified: "03 Aug 2026 — email", acknowledged: "Q. Rowe — 03 Aug 2026" },
    { unit: "Procurement", notified: "03 Aug 2026 — email", acknowledged: "S. Turi — 04 Aug 2026" },
  ],
};

// Messy: 12 units, 9 acknowledged. Row with a NAME but NO date should count
// as NOT acknowledged per closed_predicate — but our current isRowClosed logic
// treats any non-placeholder as closed. To honour the eval brief literally,
// we mark that row with a placeholder-like value that the closed_field
// definition SHOULD reject (empty-date acknowledgement is a real-world
// ambiguity — the schema prompt teaches "name and/or date"). To keep ground
// truth crisp we use the value "T. Vance — (date pending)" and mark it as
// NOT acknowledged in ground_truth. If the extractor still classifies it as
// acknowledged that's a real failure the harness should surface.
const CASE_3: Case = {
  path: `${DIR}/case-03-12units-2page-messy.pdf`,
  description:
    "12 units across 2 pages, 9 acknowledged. Row 10 (Emergency Response) has a name but no date — must count as NOT acknowledged. Rows 11-12 outstanding.",
  title: "START-UP NOTIFICATION & ACKNOWLEDGMENT SHEET",
  subtitle: "Handover Point: DP220  ·  Eval Case 03  ·  Issued: 20 Aug 2026",
  pages: 2,
  rows: [
    { unit: "Operations",         notified: "20 Aug 2026 — email", acknowledged: "A. Blake — 20 Aug 2026" },
    { unit: "Maintenance",        notified: "20 Aug 2026 — email", acknowledged: "C. Doran — 20 Aug 2026" },
    { unit: "HSE",                notified: "20 Aug 2026 — email", acknowledged: "E. Frost — 21 Aug 2026" },
    { unit: "Laboratory",         notified: "20 Aug 2026 — email", acknowledged: "G. Hume — 21 Aug 2026" },
    { unit: "Logistics",          notified: "20 Aug 2026 — email", acknowledged: "I. Joshi — 20 Aug 2026" },
    { unit: "Security",           notified: "20 Aug 2026 — email", acknowledged: "K. Lu — 21 Aug 2026" },
    { unit: "Utilities",          notified: "20 Aug 2026 — email", acknowledged: "M. Nair — 22 Aug 2026" },
    { unit: "Marine",             notified: "20 Aug 2026 — email", acknowledged: "O. Petit — 22 Aug 2026" },
    { unit: "Engineering",        notified: "20 Aug 2026 — email", acknowledged: "Q. Ryan — 20 Aug 2026" },
    { unit: "Emergency Response", notified: "20 Aug 2026 — email", acknowledged: "T. Vance — (date pending)" },
    { unit: "Procurement",        notified: "20 Aug 2026 — email", acknowledged: "" },
    { unit: "Commissioning",      notified: "20 Aug 2026 — email", acknowledged: "" },
  ],
};

const CASES: Case[] = [CASE_1, CASE_2, CASE_3];

// Ground-truth ack rule for scoring: an acknowledgement counts only if it has
// BOTH a name and a plausible date. Row-10 of case 3 has "(date pending)" so
// it is NOT acknowledged. Empty string is not acknowledged.
function isAckGroundTruth(v: string): boolean {
  const s = (v || "").trim();
  if (!s) return false;
  if (/\bpending\b/i.test(s)) return false;
  if (/\bn\/?a\b/i.test(s)) return false;
  if (/\btbd\b/i.test(s)) return false;
  if (s === "—" || s === "-") return false;
  // must contain some digit (a date fragment) to count as fully acknowledged
  if (!/\d/.test(s)) return false;
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
    const draw = (t: string, x: number, y: number, size = 10, f = font) =>
      page.drawText(t, { x, y, size, font: f, color: rgb(0, 0, 0) });
    draw(c.title, 60, 800, 14, bold);
    draw(`${c.subtitle}  ·  Page ${p + 1} of ${totalPages}`, 60, 782, 9);

    const hy = 750;
    draw("UNIT / DEPARTMENT", 60, hy, 10, bold);
    draw("NOTIFIED", 230, hy, 10, bold);
    draw("ACKNOWLEDGED BY & DATE", 380, hy, 10, bold);
    page.drawLine({ start: { x: 55, y: hy - 4 }, end: { x: 540, y: hy - 4 }, thickness: 0.7 });

    const start = p * rowsPerPage;
    const end = Math.min(start + rowsPerPage, c.rows.length);
    let y = hy - 22;
    for (let i = start; i < end; i++) {
      const r = c.rows[i];
      draw(r.unit, 60, y);
      draw(r.notified, 230, y);
      draw(r.acknowledged || "—", 380, y);
      y -= 22;
    }
    draw("Signed: Site Manager (redacted)", 60, 120, 9);
  }
  return await doc.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const seeded: Array<{ path: string; case_id?: string; size: number; ok: boolean; error?: string }> = [];

  for (const c of CASES) {
    const bytes = await buildPdf(c);
    const { error: upErr } = await sb.storage
      .from("p2a-attachments")
      .upload(c.path, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) { seeded.push({ path: c.path, size: bytes.byteLength, ok: false, error: upErr.message }); continue; }

    // Build ground truth
    const records = c.rows.map((r, idx) => {
      const pageNo = c.pages && c.pages > 1
        ? Math.floor(idx / Math.ceil(c.rows.length / c.pages)) + 1
        : 1;
      return {
        unit: r.unit,
        notified: r.notified,
        acknowledged: r.acknowledged,
        source_page: pageNo,
        expected_ack: isAckGroundTruth(r.acknowledged),
      };
    });
    const total = records.length;
    const ack = records.filter((r) => r.expected_ack).length;
    const outstanding = records.filter((r) => !r.expected_ack).map((r) => r.unit);
    const ground_truth = {
      key_field: "unit",
      total,
      acknowledged_count: ack,
      outstanding_units: outstanding,
      records,
    };

    // Upsert case row (unique by schema_key + fixture_path)
    // Delete then insert to keep it simple and ensure ground_truth freshens.
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
    if (insErr) { seeded.push({ path: c.path, size: bytes.byteLength, ok: false, error: insErr.message }); continue; }
    seeded.push({ path: c.path, case_id: (ins as any)?.id, size: bytes.byteLength, ok: true });
  }

  // hemp_di03 note: we do NOT synthesise a HEMP close-out register in the BGC
  // format from scratch — the multi-page nuance (windowed action headers,
  // step-5 TSE-TA2 dates on continuation pages, orphan fragments) can't be
  // faithfully reproduced with pdf-lib alone. Better to seed real BGC PDFs
  // once they can be shared. Reported per Phase 2C brief.
  return new Response(JSON.stringify({ schema: SCHEMA, seeded, hemp_di03: "skipped — faithful synthesis not feasible in this seeder" }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
