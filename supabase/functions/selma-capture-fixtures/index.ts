// Capture real Assai search fixtures and write them to /tmp inside the function.
// The function returns the raw HTML of each fixture so we can save them locally.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateAssai, ASSAI_UA } from "../_shared/assai-auth.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: creds } = await supabase.from("dms_sync_credentials")
    .select("base_url, username_encrypted, password_encrypted, db_name").eq("dms_platform", "assai").single();
  const baseUrl = (creds!.base_url || "https://eu.assaicloud.com").replace(/\/+$/, "");
  const assaiBase = baseUrl + `/AW${creds!.db_name || "eu578"}`;
  let username = creds!.username_encrypted || ""; let password = creds!.password_encrypted || "";
  try {
    const { isEncrypted, decrypt } = await import("../_shared/crypto.ts");
    if (username && isEncrypted(username)) username = await decrypt(username);
    if (password && isEncrypted(password)) password = await decrypt(password);
  } catch (_) {}

  const auth = await authenticateAssai(assaiBase, username, password);
  const cookieHeader = auth.cookies;

  const fixtures: Record<string, string> = {};

  // Helper: full cycle (warmup + GET + POST). Only-non-empty hidden fields.
  const fullCycle = async (overrides: Record<string,string|null>, subclass = "DES_DOC"): Promise<{html: string; length: number; status: number}> => {
    await fetch(`${assaiBase}/label.aweb?subclass_type=${subclass}`, { headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA } }).then(r => r.text());
    const searchGetUrl = `${assaiBase}/search.aweb?subclass_type=${subclass}`;
    const sr = await fetch(searchGetUrl, { headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA } });
    const sh = await sr.text();
    const hidden: Array<{name:string;value:string}> = []; const textNames: string[] = [];
    const ire = /<input[^>]*>/gi; let mm: RegExpExecArray|null;
    while ((mm = ire.exec(sh)) !== null) {
      const tag = mm[0];
      const name = tag.match(/name=["']([^"']+)["']/i)?.[1] ?? ""; if (!name) continue;
      const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "text";
      const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? "";
      if (type === "hidden" && value) hidden.push({ name, value });
      else if (type !== "hidden") textNames.push(name);
    }
    const fd = new URLSearchParams();
    for (const f of hidden) fd.set(f.name, f.value);
    for (const n of textNames) fd.set(n, "");
    fd.set("subclass_type", subclass); fd.set("number_of_results", "100");
    for (const [k, v] of Object.entries(overrides)) { if (v === null) fd.delete(k); else fd.set(k, v); }
    const r = await fetch(`${assaiBase}/result.aweb`, {
      method: "POST", headers: { Cookie: cookieHeader, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": ASSAI_UA, Referer: searchGetUrl },
      body: fd.toString(), redirect: "follow",
    });
    const html = await r.text();
    return { html, length: html.length, status: r.status };
  };

  // search.aweb form fixtures
  fixtures["form_DES_DOC.html"] = await (async () => { await fetch(`${assaiBase}/label.aweb?subclass_type=DES_DOC`, { headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA } }).then(r=>r.text()); const r = await fetch(`${assaiBase}/search.aweb?subclass_type=DES_DOC`, { headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA } }); return await r.text(); })();
  fixtures["form_SUP_DOC.html"] = await (async () => { await fetch(`${assaiBase}/label.aweb?subclass_type=SUP_DOC`, { headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA } }).then(r=>r.text()); const r = await fetch(`${assaiBase}/search.aweb?subclass_type=SUP_DOC`, { headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA } }); return await r.text(); })();
  // Populated grid (project + type=8203 contains the basis doc)
  fixtures["result_populated_type8203.html"] = (await fullCycle({ number: "6529-%", document_type: "8203" })).html;
  // V12 follow-up #2 — bare project-only query (no type, no description). Hypothesis: empty_grid.
  fixtures["result_bare_project_only.html"] = (await fullCycle({ number: "6529-%" })).html;
  // Populated grid (description=basis) — 15 rows including the basis doc
  fixtures["result_populated_desc_basis.html"] = (await fullCycle({ number: "6529-%", description: "basis" })).html;
  // Single-result (exact doc)
  fixtures["result_single_basis_doc.html"] = (await fullCycle({ number: "6529-BGC-C033-ISGP-G00000-AA-8203-00001" })).html;
  // Real empty grid (definitely-no-match number)
  fixtures["result_empty_grid.html"] = (await fullCycle({ number: "ZZZZ-NEVER-MATCH-9999-NONE-%" })).html;
  // No-session response: POST result.aweb without any cookie
  fixtures["no_session_post.html"] = await (async () => {
    const r = await fetch(`${assaiBase}/result.aweb`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": ASSAI_UA }, body: "subclass_type=DES_DOC&number=%" });
    return await r.text();
  })();

  // Login page fixture: GET login.aweb
  fixtures["login_page.html"] = await (async () => { const r = await fetch(`${assaiBase}/login.aweb?loginMethod=unpw`); return await r.text(); })();

  const out: Record<string, {length: number; preview: string; full: string}> = {};
  for (const [k, v] of Object.entries(fixtures)) {
    out[k] = { length: v.length, preview: v.substring(0, 400), full: v };
  }
  return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
