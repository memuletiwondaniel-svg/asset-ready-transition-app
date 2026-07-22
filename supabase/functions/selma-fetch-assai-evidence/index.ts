// selma-fetch-assai-evidence
// Doc-number-first pipeline: given a VCR prerequisite that names a controlled
// Assai document (assai_doc_no [+ assai_rev]), fetch the BINARY (not Selma's
// text summary) from Assai using the existing auth + REST download path,
// upload to the p2a-attachments bucket, and insert a p2a_vcr_evidence row
// with full provenance (source='assai', assai_doc_no, assai_rev, confirmed=false).
//
// Idempotent on (vcr_prerequisite_id, assai_doc_no, assai_rev): re-running
// returns the existing row without re-downloading. Ivan picks up the new
// evidence via the standard p2a_vcr_evidence read path.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateAssai, ASSAI_UA } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVIDENCE_BUCKET = "p2a-attachments";
const MAX_BYTES = 40 * 1024 * 1024; // matches Ivan's MAX_PDF_BYTES
const DOWNLOAD_TIMEOUT_MS = 20_000;

interface FetchResponse {
  ok: boolean;
  evidence_id?: string;
  source?: "assai";
  assai_doc_no?: string;
  assai_rev?: string | null;
  cached?: boolean;       // existing row returned, no re-download
  bytes?: number;
  reason?: string;        // honest failure reason
}

function bad(reason: string, status = 200): Response {
  // Honest failure shape — never throw; caller treats { ok:false, reason } as no-op.
  const body: FetchResponse = { ok: false, reason };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return bad("Missing authorization", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Caller-scoped client (for auth.getUser + RLS-respecting reads)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResp } = await userClient.auth.getUser();
    const userId = userResp?.user?.id;
    if (!userId) return bad("Not authenticated", 401);

    // Service-role client for the storage write + evidence insert (provenance auditable)
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const prereqId: string | undefined = body?.vcr_prerequisite_id;
    if (!prereqId) return bad("vcr_prerequisite_id required", 400);

    // 1) Load the prerequisite + Assai doc no/rev
    const { data: prereq, error: prereqErr } = await sb
      .from("p2a_vcr_prerequisites")
      .select("id, assai_doc_no, assai_rev")
      .eq("id", prereqId)
      .maybeSingle();
    if (prereqErr || !prereq) return bad("Prerequisite not found");
    const docNumber = (prereq.assai_doc_no || "").trim();
    const docRev = (prereq.assai_rev || "").trim() || null;
    if (!docNumber) {
      return bad("No Assai document number set on this prerequisite — search-path resolution is not yet wired.");
    }

    // 2) Idempotency: if we already fetched this doc+rev for this prereq, return it.
    const { data: existing } = await sb
      .from("p2a_vcr_evidence")
      .select("id, file_size")
      .eq("vcr_prerequisite_id", prereqId)
      .eq("source", "assai")
      .eq("assai_doc_no", docNumber)
      .is("assai_rev", docRev as any)
      .maybeSingle();
    if (existing?.id) {
      const resp: FetchResponse = {
        ok: true,
        evidence_id: existing.id,
        source: "assai",
        assai_doc_no: docNumber,
        assai_rev: docRev,
        cached: true,
        bytes: existing.file_size || 0,
      };
      return new Response(JSON.stringify(resp), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Auth into Assai using the same credentials Selma uses.
    const { data: creds } = await sb
      .from("dms_sync_credentials")
      .select("base_url, username_encrypted, password_encrypted, db_name")
      .eq("dms_platform", "assai")
      .single();
    if (!creds) return bad("Assai credentials not configured");
    const baseUrl = (creds.base_url || "https://eu.assaicloud.com").replace(/\/+$/, "");
    const assaiBase = baseUrl + `/AW${creds.db_name || "eu578"}`;
    let username = creds.username_encrypted || "";
    let password = creds.password_encrypted || "";
    try {
      const { isEncrypted, decrypt } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch { /* assume plaintext */ }

    const auth = await authenticateAssai(assaiBase, username, password);
    if (!auth?.success) return bad("Assai authentication failed");
    const cookies: string = auth.cookies;

    // 4) Download the binary via the REST endpoint, walking cabinets in priority order.
    //    Mirrors the read_assai_document REST path but stops at the bytes — no Claude.
    const FALLBACK_CABINETS = ["BGC_PROJ", "BGC_OPS", "ISG"];
    let cabinets: string[] = FALLBACK_CABINETS;
    try {
      const { data: cabinetRows } = await sb
        .from("dms_projects")
        .select("cabinet")
        .eq("is_active", true);
      const unique = [...new Set((cabinetRows || []).map((r: any) => r.cabinet).filter(Boolean))] as string[];
      if (unique.length > 0) cabinets = unique;
    } catch { /* use fallback */ }
    const parts = docNumber.split("-");
    if (parts.length >= 2) {
      const originator = parts[1].toUpperCase();
      const prioritized = cabinets.filter((c) => c.toUpperCase().startsWith(originator));
      const rest = cabinets.filter((c) => !c.toUpperCase().startsWith(originator));
      cabinets = [...prioritized, ...rest];
    }

    const isValidPdf = (bytes: Uint8Array) =>
      bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

    let fileBytes: Uint8Array | null = null;
    let failReason = "Download failed";
    for (const cabinet of cabinets) {
      const url = `${assaiBase}/get/download/${cabinet}/DOCS/${docNumber}`;
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          headers: { Cookie: cookies, "User-Agent": ASSAI_UA },
          signal: controller.signal,
          redirect: "manual",
        });
        clearTimeout(tid);
        if (res.status === 301 || res.status === 302) {
          failReason = "Assai session redirected — auth not valid for download";
          continue;
        }
        if (!res.ok) {
          failReason = `Assai HTTP ${res.status}`;
          await res.text().catch(() => {});
          continue;
        }
        const ct = res.headers.get("content-type") || "";
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.length > MAX_BYTES) {
          failReason = `Document exceeds size cap (${(buf.length / 1024 / 1024).toFixed(1)} MB)`;
          continue;
        }
        if (ct.includes("text/html") || buf.length < 500) {
          failReason = "Assai returned an HTML page (likely auth/session issue)";
          continue;
        }
        if (!isValidPdf(buf)) {
          failReason = "Downloaded file is not a valid PDF";
          continue;
        }
        fileBytes = buf;
        break;
      } catch (err: any) {
        clearTimeout(tid);
        failReason = err?.name === "AbortError" ? "Download timed out (>20s)" : (err?.message || "Download error");
      }
    }
    if (!fileBytes) return bad(`Couldn't retrieve ${docNumber} from Assai — ${failReason}`);

    // 5) Upload to storage. Path keyed by prereq + doc + rev for stable dedup.
    const safeDoc = docNumber.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const safeRev = (docRev || "latest").replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${prereqId}/assai/${safeDoc}-${safeRev}.pdf`;
    const { error: upErr } = await sb.storage
      .from(EVIDENCE_BUCKET)
      .upload(path, fileBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) return bad(`Storage upload failed: ${upErr.message}`);

    // 6) Insert evidence row. source=assai, confirmed=false (delivering must confirm).
    const fileName = `${docNumber}${docRev ? ` rev ${docRev}` : ""}.pdf`;
    const { data: inserted, error: insErr } = await sb
      .from("p2a_vcr_evidence")
      .insert({
        vcr_prerequisite_id: prereqId,
        file_name: fileName,
        file_path: path,
        file_size: fileBytes.length,
        file_type: "application/pdf",
        evidence_type: "Register",
        evidence_kind: "assai_document",
        uploaded_by: userId,
        source: "assai",
        assai_doc_no: docNumber,
        assai_rev: docRev,
        confirmed: false,
        confirmed_by: null,
        confirmed_at: null,
      } as any)
      .select("id")
      .single();
    if (insErr || !inserted) {
      // If we lost a race, fetch the existing row.
      const { data: race } = await sb
        .from("p2a_vcr_evidence")
        .select("id")
        .eq("vcr_prerequisite_id", prereqId)
        .eq("source", "assai")
        .eq("assai_doc_no", docNumber)
        .is("assai_rev", docRev as any)
        .maybeSingle();
      if (race?.id) {
        return new Response(JSON.stringify({
          ok: true, evidence_id: race.id, source: "assai",
          assai_doc_no: docNumber, assai_rev: docRev, cached: true, bytes: fileBytes.length,
        } satisfies FetchResponse), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return bad(`Evidence insert failed: ${insErr?.message || "unknown"}`);
    }

    const resp: FetchResponse = {
      ok: true,
      evidence_id: inserted.id,
      source: "assai",
      assai_doc_no: docNumber,
      assai_rev: docRev,
      cached: false,
      bytes: fileBytes.length,
    };
    return new Response(JSON.stringify(resp), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("selma-fetch-assai-evidence error:", err?.message || err);
    return bad(`Unexpected error: ${err?.message || "unknown"}`);
  }
});
