// One-shot seeder for OI-19 flagship register-reader test:
// Uploads a synthetic 1-page start-up notification / acknowledgment sheet
// listing 8 affected units (6 acknowledged, 2 outstanding), and inserts the
// matching p2a_vcr_evidence row for OI-19's prerequisite.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PREREQ_ID = "87c569ba-5434-467b-a203-02bcad87da21";
const UPLOADED_BY = "49d052ff-e30f-4b1f-b10b-7edeb83db97e";
const OBJECT_PATH = "seed/oi19-su-notification-ack.pdf";

const ROWS: Array<[string, string, string]> = [
  // [unit, notified (date/method), acknowledged (name/date or blank)]
  ["Operations",  "12 Jul 2026 — email",  "J. Rossi — 12 Jul 2026"],
  ["Maintenance", "12 Jul 2026 — email",  "K. Ito — 13 Jul 2026"],
  ["HSE",         "12 Jul 2026 — email",  "M. Nguyen — 12 Jul 2026"],
  ["Laboratory",  "12 Jul 2026 — email",  "P. Kaur — 14 Jul 2026"],
  ["Logistics",   "12 Jul 2026 — email",  "S. Ahmed — 13 Jul 2026"],
  ["Security",    "12 Jul 2026 — email",  "T. Ortega — 12 Jul 2026"],
  ["Utilities",   "12 Jul 2026 — email",  ""],
  ["Marine",      "12 Jul 2026 — email",  ""],
];

async function buildPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 portrait
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const draw = (t: string, x: number, y: number, size = 10, f = font, colour = rgb(0, 0, 0)) =>
    page.drawText(t, { x, y, size, font: f, color: colour });

  draw("START-UP NOTIFICATION & ACKNOWLEDGMENT SHEET", 60, 800, 14, bold);
  draw("Handover Point: DP300  ·  VCR Item: OI-19  ·  Issued: 12 Jul 2026", 60, 782, 9);

  // Header row
  const hy = 750;
  draw("UNIT / DEPARTMENT", 60, hy, 10, bold);
  draw("NOTIFIED", 230, hy, 10, bold);
  draw("ACKNOWLEDGED BY & DATE", 380, hy, 10, bold);
  page.drawLine({ start: { x: 55, y: hy - 4 }, end: { x: 540, y: hy - 4 }, thickness: 0.7 });

  let y = hy - 22;
  for (const [unit, notified, ack] of ROWS) {
    draw(unit, 60, y);
    draw(notified, 230, y);
    draw(ack || "—", 380, y);
    y -= 22;
  }

  draw("Signed: Site Manager (redacted)", 60, 120, 9);
  return await doc.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const bytes = await buildPdf();
  const { error: upErr } = await sb.storage
    .from("p2a-attachments")
    .upload(OBJECT_PATH, bytes, { contentType: "application/pdf", upsert: true });
  if (upErr) {
    return new Response(JSON.stringify({ ok: false, step: "upload", error: upErr.message }), {
      headers: { ...cors, "Content-Type": "application/json" }, status: 500,
    });
  }

  // Remove any prior seeded row for this path (idempotent).
  await sb.from("p2a_vcr_evidence")
    .delete()
    .eq("vcr_prerequisite_id", PREREQ_ID)
    .eq("file_path", OBJECT_PATH);

  const { data: ins, error: insErr } = await sb.from("p2a_vcr_evidence").insert({
    vcr_prerequisite_id: PREREQ_ID,
    file_name: "SU-Notification-Acknowledgment-DP300.pdf",
    file_path: OBJECT_PATH,
    file_size: bytes.byteLength,
    file_type: "application/pdf",
    description: "Start-up notification & acknowledgment sheet (seeded fixture)",
    uploaded_by: UPLOADED_BY,
    evidence_type: "SU Notification email",
    source: "manual",
    evidence_kind: "other",
    confirmed: true,
  }).select("id").maybeSingle();

  if (insErr) {
    return new Response(JSON.stringify({ ok: false, step: "insert", error: insErr.message }), {
      headers: { ...cors, "Content-Type": "application/json" }, status: 500,
    });
  }

  return new Response(JSON.stringify({
    ok: true, path: OBJECT_PATH, evidence_id: (ins as any)?.id, size: bytes.byteLength,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
