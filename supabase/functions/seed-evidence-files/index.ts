// One-shot seeder: uploads placeholder PDFs to the p2a-attachments bucket
// at the paths referenced by the seeded evidence rows so the download
// action in the VCR item drawer actually resolves.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Minimal valid single-page PDF. The `%NAME%` placeholder is swapped
// per-file so each seeded document has a distinct visible title.
const PDF_TEMPLATE = (title: string) => {
  const content = `BT /F1 18 Tf 72 720 Td (${title}) Tj ET`;
  const objects = [
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>endobj\n",
    `4 0 obj<</Length ${content.length}>>stream\n${content}\nendstream endobj\n`,
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const o of objects) {
    offsets.push(pdf.length);
    pdf += o;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const files = [
    { path: "seed/suop-signoff.pdf", title: "SUOP Sign-off (seeded placeholder)" },
    { path: "seed/notification-log.pdf", title: "Notification Log (seeded placeholder)" },
  ];

  const results: Array<{ path: string; ok: boolean; error?: string }> = [];
  for (const f of files) {
    const bytes = PDF_TEMPLATE(f.title);
    const { error } = await supabase.storage
      .from("p2a-attachments")
      .upload(f.path, bytes, { contentType: "application/pdf", upsert: true });
    results.push({ path: f.path, ok: !error, error: error?.message });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
