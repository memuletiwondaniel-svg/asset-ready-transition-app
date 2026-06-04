// Run Selma's actual search engine end-to-end against the DP-300 / basis-of-design canonical query.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateAssai } from "../_shared/assai-auth.ts";
import { executeSearch, SessionManager, type SearchOptions } from "../_shared/selma/search-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: creds } = await supabase.from("dms_sync_credentials")
      .select("base_url, username_encrypted, password_encrypted, db_name")
      .eq("dms_platform", "assai").single();
    const baseUrl = (creds!.base_url || "https://eu.assaicloud.com").replace(/\/+$/, "");
    const assaiBase = baseUrl + `/AW${creds!.db_name || "eu578"}`;
    let username = creds!.username_encrypted || "";
    let password = creds!.password_encrypted || "";
    try {
      const { isEncrypted, decrypt } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch (_) {}

    const sm = new SessionManager(async () => {
      const r = await authenticateAssai(assaiBase, username, password);
      if (!r.success) throw new Error("auth failed");
      return { cookies: r.cookies };
    }, assaiBase);

    const variants: Record<string, any> = {};
    const runIt = async (label: string, opts: Partial<SearchOptions>) => {
      const t0 = Date.now();
      try {
        const r = await executeSearch({
          documentNumberPattern: "",
          username, password, assaiBase,
          maxResults: 50,
          emitStatus: () => {},
          ...opts,
        } as SearchOptions, sm, supabase);
        variants[label] = {
          found: r.found,
          total: r.totalFound,
          strategies: r.strategies_tried,
          docs_preview: (r.results || []).slice(0, 3).map((d: any) => d.document_number),
          has_basis: (r.results || []).some((d: any) => (d.document_number || "").includes("AA-8203-00001")),
          elapsed_ms: Date.now() - t0,
        };
      } catch (e: any) {
        variants[label] = { error: String(e.message || e), elapsed_ms: Date.now() - t0 };
      }
    };

    await runIt("V1_proj_type8203", { documentNumberPattern: "6529-%", documentType: "8203" });
    await runIt("V2_proj_multi7704_8203", { documentNumberPattern: "6529-%", documentType: "7704+8203" });
    await runIt("V3_proj_title_basis", { documentNumberPattern: "6529-%", title: "basis" });
    await runIt("V4_proj_only", { documentNumberPattern: "6529-%" });
    await runIt("V5_exact_doc", { documentNumberPattern: "6529-BGC-C033-ISGP-G00000-AA-8203-00001" });

    return new Response(JSON.stringify({ ok: true, variants }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
