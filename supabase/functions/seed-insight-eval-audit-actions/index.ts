// IIF Phase 3B — Synthetic golden fixtures for the audit_actions (Fire &
// Safety Audit action-tracker) RegisterReader schema (HS-06). Generates 3
// PDFs with KNOWN ground truth, uploads to
// p2a-attachments/insight_eval/audit_actions/*.pdf, and upserts rows into
// public.insight_eval_cases keyed on (schema_key, fixture_path).
//
// Ground truth uses `closed_count` (run-insight-eval accepts the legacy
// `acknowledged_count` alias during transition). A row is closed iff:
// status ∈ {Closed/Verified/Complete}, close_out has name+date, no overdue.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = "audit_actions";
const DIR = `insight_eval/${SCHEMA}`;

type Row = {
  action_no: string;
  finding: string;
  responsible: string;
  target_date: string;
  status: string;
  close_out: string;
  overdue: string;
};

interface Case {
  path: string;
  description: string;
  title: string;
  subtitle: string;
  rows: Row[];
  pages?: number;
}

// ── Case 1 (flagship): 8 actions, 5 closed. Outstanding for mixed reasons:
// blank close-out, status "Open", overdue flag on an otherwise closed row.
const CASE_1: Case = {
  path: `${DIR}/case-01-8actions-flagship.pdf`,
  description:
    "Audit flagship: 8 actions. 5 closed. Outstanding: FSA-004 (blank close-out), FSA-005 (status Open), FSA-008 (overdue flag).",
  title: "FIRE & SAFETY AUDIT — ACTION TRACKER",
  subtitle: "Unit: DP300  ·  Eval Case 01  ·  Issued: 12 Jul 2026",
  rows: [
    { action_no: "FSA-001", finding: "Fire door signage missing at MCC-1",       responsible: "Ops",  target_date: "10 Jul 2026", status: "Closed",   close_out: "J. Rossi — 12 Jul 2026",  overdue: "" },
    { action_no: "FSA-002", finding: "Extinguisher out of service — Compressor Hall", responsible: "Mtce",  target_date: "11 Jul 2026", status: "Verified", close_out: "K. Ito — 13 Jul 2026",    overdue: "None" },
    { action_no: "FSA-003", finding: "Muster point board illegible",             responsible: "HSE",  target_date: "12 Jul 2026", status: "Closed",   close_out: "M. Nguyen — 12 Jul 2026", overdue: "" },
    { action_no: "FSA-004", finding: "Emergency lighting test overdue",          responsible: "Elec", target_date: "12 Jul 2026", status: "Closed",   close_out: "",                        overdue: "" }, // outstanding: blank close-out despite "Closed"
    { action_no: "FSA-005", finding: "Fire pump strainer inspection outstanding", responsible: "Mtce", target_date: "15 Jul 2026", status: "Open",     close_out: "",                        overdue: "" }, // outstanding: status open
    { action_no: "FSA-006", finding: "F&G loop function test evidence missing",  responsible: "Ops",  target_date: "11 Jul 2026", status: "Verified", close_out: "S. Ahmed — 13 Jul 2026",  overdue: "" },
    { action_no: "FSA-007", finding: "Sprinkler head paint fouling — Bay 3",     responsible: "Mtce", target_date: "10 Jul 2026", status: "Closed",   close_out: "T. Ortega — 12 Jul 2026", overdue: "N/A" },
    { action_no: "FSA-008", finding: "Foam concentrate certificate expired",     responsible: "HSE",  target_date: "08 Jul 2026", status: "Closed",   close_out: "R. Chen — 13 Jul 2026",   overdue: "Overdue — 5 days" }, // outstanding: overdue flag
  ],
};

// ── Case 2 (all-closed happy path): 10 actions, all closed cleanly.
const CASE_2: Case = {
  path: `${DIR}/case-02-10actions-full-closed.pdf`,
  description: "10 audit actions, all closed with signer+date, no overdue (fully closed happy path).",
  title: "FIRE & SAFETY AUDIT — ACTION TRACKER",
  subtitle: "Unit: DP110  ·  Eval Case 02  ·  Issued: 03 Aug 2026",
  rows: [
    { action_no: "FSA-101", finding: "Fire door hardware",           responsible: "Mtce", target_date: "03 Aug 2026", status: "Closed",   close_out: "A. Bell — 03 Aug 2026",  overdue: "" },
    { action_no: "FSA-102", finding: "Extinguisher swap",            responsible: "Mtce", target_date: "03 Aug 2026", status: "Closed",   close_out: "C. Diaz — 03 Aug 2026",  overdue: "None" },
    { action_no: "FSA-103", finding: "Muster board reprint",         responsible: "HSE",  target_date: "04 Aug 2026", status: "Verified", close_out: "E. Fox — 04 Aug 2026",   overdue: "" },
    { action_no: "FSA-104", finding: "Emergency light test",         responsible: "Elec", target_date: "04 Aug 2026", status: "Complete", close_out: "G. Hale — 04 Aug 2026",  overdue: "" },
    { action_no: "FSA-105", finding: "Fire pump strainer",           responsible: "Mtce", target_date: "03 Aug 2026", status: "Closed",   close_out: "I. Jain — 03 Aug 2026",  overdue: "N/A" },
    { action_no: "FSA-106", finding: "F&G loop function",            responsible: "Ops",  target_date: "04 Aug 2026", status: "Verified", close_out: "K. Lam — 04 Aug 2026",   overdue: "" },
    { action_no: "FSA-107", finding: "Sprinkler bay 3",              responsible: "Mtce", target_date: "05 Aug 2026", status: "Closed",   close_out: "M. Novak — 05 Aug 2026", overdue: "None" },
    { action_no: "FSA-108", finding: "Foam cert refresh",            responsible: "HSE",  target_date: "05 Aug 2026", status: "Closed",   close_out: "O. Perez — 05 Aug 2026", overdue: "" },
    { action_no: "FSA-109", finding: "Deluge valve inspection",      responsible: "Mtce", target_date: "03 Aug 2026", status: "Verified", close_out: "Q. Rowe — 03 Aug 2026",  overdue: "" },
    { action_no: "FSA-110", finding: "Escape route signage refresh", responsible: "HSE",  target_date: "04 Aug 2026", status: "Closed",   close_out: "S. Turi — 04 Aug 2026",  overdue: "-" },
  ],
};

// ── Case 3 (messy multi-page): 12 actions across 2 pages, 8 closed. Row 9
// name but no date; Row 10 status In Progress; Row 11 overdue flag; Row 12
// "pending signoff" placeholder in close-out.
const CASE_3: Case = {
  path: `${DIR}/case-03-12actions-2page-messy.pdf`,
  description:
    "12 audit actions across 2 pages, 8 closed. Row 9 (FSA-209) name but no date; Row 10 (FSA-210) status In Progress; Row 11 (FSA-211) overdue flag; Row 12 (FSA-212) 'pending signoff'.",
  title: "FIRE & SAFETY AUDIT — ACTION TRACKER",
  subtitle: "Unit: DP220  ·  Eval Case 03  ·  Issued: 20 Aug 2026",
  pages: 2,
  rows: [
    { action_no: "FSA-201", finding: "Door hardware",         responsible: "Mtce", target_date: "20 Aug 2026", status: "Closed",      close_out: "A. Blake — 20 Aug 2026", overdue: "" },
    { action_no: "FSA-202", finding: "Extinguisher swap",     responsible: "Mtce", target_date: "20 Aug 2026", status: "Verified",    close_out: "C. Doran — 20 Aug 2026", overdue: "None" },
    { action_no: "FSA-203", finding: "Muster board",          responsible: "HSE",  target_date: "21 Aug 2026", status: "Closed",      close_out: "E. Frost — 21 Aug 2026", overdue: "" },
    { action_no: "FSA-204", finding: "Emergency light test",  responsible: "Elec", target_date: "21 Aug 2026", status: "Complete",    close_out: "G. Hume — 21 Aug 2026",  overdue: "" },
    { action_no: "FSA-205", finding: "Pump strainer",         responsible: "Mtce", target_date: "20 Aug 2026", status: "Closed",      close_out: "I. Joshi — 20 Aug 2026", overdue: "N/A" },
    { action_no: "FSA-206", finding: "F&G loop",              responsible: "Ops",  target_date: "21 Aug 2026", status: "Verified",    close_out: "K. Lu — 21 Aug 2026",    overdue: "" },
    { action_no: "FSA-207", finding: "Sprinkler bay 3",       responsible: "Mtce", target_date: "22 Aug 2026", status: "Closed",      close_out: "M. Nair — 22 Aug 2026",  overdue: "" },
    { action_no: "FSA-208", finding: "Foam cert",             responsible: "HSE",  target_date: "22 Aug 2026", status: "Closed",      close_out: "O. Petit — 22 Aug 2026", overdue: "" },
    { action_no: "FSA-209", finding: "Deluge valve",          responsible: "Mtce", target_date: "20 Aug 2026", status: "Closed",      close_out: "T. Vance",               overdue: "" }, // outstanding: no date
    { action_no: "FSA-210", finding: "Escape signage",        responsible: "HSE",  target_date: "21 Aug 2026", status: "In Progress", close_out: "",                       overdue: "" }, // outstanding: status open
    { action_no: "FSA-211", finding: "Fire main pressure",    responsible: "Mtce", target_date: "18 Aug 2026", status: "Closed",      close_out: "R. Sato — 22 Aug 2026",  overdue: "Overdue — 4 days" }, // outstanding: overdue flag
    { action_no: "FSA-212", finding: "Hydrant flow test",     responsible: "Mtce", target_date: "21 Aug 2026", status: "Closed",      close_out: "Pending signoff",        overdue: "" }, // outstanding: pending
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
const STATUS_CLOSED = /(^|[^a-z])(closed|complete[d]?|verified|resolved|actioned)([^a-z]|$)/i;
const STATUS_OPEN = /(open|in[\s_-]*progress|outstanding|ongoing|deferred|pending)/i;

function isClosedGT(r: Row): boolean {
  const status = (r.status || "").trim();
  if (!status) return false;
  if (STATUS_OPEN.test(status.toLowerCase())) return false;
  if (!STATUS_CLOSED.test(status)) return false;
  const co = (r.close_out || "").trim();
  if (!co) return false;
  if (!NAME_RE.test(co)) return false;
  if (!DATE_RE.test(co)) return false;
  const lower = co.toLowerCase();
  for (const p of PLACEHOLDER_SUBSTRINGS) if (lower.includes(p)) return false;
  const ov = (r.overdue || "").trim();
  if (ov && !ANOMALY_EMPTY.test(ov)) return false;
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
    const draw = (t: string, x: number, y: number, size = 8, f = font) =>
      page.drawText(t, { x, y, size, font: f, color: rgb(0, 0, 0) });
    draw(c.title, 40, 800, 13, bold);
    draw(`${c.subtitle}  ·  Page ${p + 1} of ${totalPages}`, 40, 782, 8);

    const hy = 750;
    draw("ACTION NO",   40,  hy, 8, bold);
    draw("FINDING",     100, hy, 8, bold);
    draw("RESP.",       260, hy, 8, bold);
    draw("TARGET",      300, hy, 8, bold);
    draw("STATUS",      360, hy, 8, bold);
    draw("CLOSE-OUT",   410, hy, 8, bold);
    draw("OVERDUE",     520, hy, 8, bold);
    page.drawLine({ start: { x: 35, y: hy - 4 }, end: { x: 570, y: hy - 4 }, thickness: 0.6 });

    const start = p * rowsPerPage;
    const end = Math.min(start + rowsPerPage, c.rows.length);
    let y = hy - 20;
    for (let i = start; i < end; i++) {
      const r = c.rows[i];
      draw(r.action_no, 40, y);
      draw(r.finding.slice(0, 32), 100, y);
      draw(r.responsible, 260, y);
      draw(r.target_date, 300, y);
      draw(r.status, 360, y);
      draw(r.close_out || "—", 410, y);
      draw(r.overdue || "None", 520, y);
      y -= 20;
    }
    draw("Signed: Lead Auditor (redacted) — HSE Manager (redacted)", 40, 120, 8);
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
        action_no: r.action_no,
        finding: r.finding,
        responsible: r.responsible,
        target_date: r.target_date,
        status: r.status,
        close_out: r.close_out,
        overdue: r.overdue,
        source_page: pageNo,
        expected_closed: isClosedGT(r),
      };
    });
    const total = records.length;
    const closed = records.filter((r) => r.expected_closed).length;
    const outstanding = records.filter((r) => !r.expected_closed).map((r) => r.action_no);
    const ground_truth = {
      key_field: "action_no",
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
