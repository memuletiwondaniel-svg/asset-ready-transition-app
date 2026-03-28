import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASSAI_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Get Assai credentials
    const { data: creds, error: credErr } = await supabaseClient
      .from("dms_sync_credentials")
      .select(
        "base_url, username_encrypted, password_encrypted, db_name"
      )
      .eq("dms_platform", "assai")
      .single();

    if (credErr || !creds) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Assai credentials not configured",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = (creds.base_url || "https://eu.assaicloud.com").replace(
      /\/+$/,
      ""
    );
    const dbName = creds.db_name || "eu578";
    const instancePath = `/AW${dbName}`;
    const assaiBase = baseUrl + instancePath;

    let username = creds.username_encrypted || "";
    let password = creds.password_encrypted || "";

    try {
      const { isEncrypted, decrypt } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch (decryptErr) {
      console.error("sync-assai-projects: credential decryption failed:", decryptErr);
    }

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Assai credentials missing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Authenticate
    console.log("sync-assai-projects: authenticating...");
    const originMatch = assaiBase.match(/^(https?:\/\/[^/]+)/);
    const origin = originMatch ? originMatch[1] : baseUrl;
    const authResult = await loginAssai(origin, username, password, dbName);

    if (!authResult.success || !authResult.cookies?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Assai authentication failed: " + (authResult.error || "unknown"),
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cookieHeader = authResult.cookies.join("; ");
    console.log("sync-assai-projects: authenticated OK");

    // 3) Activate session via label.aweb
    try {
      await fetch(assaiBase + "/label.aweb", {
        headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA },
        redirect: "follow",
      });
      console.log("sync-assai-projects: label.aweb activated");
    } catch (labelErr) {
      console.warn("sync-assai-projects: label.aweb warning:", labelErr);
    }

    // 4) Init search session via search.aweb
    const searchUrl = assaiBase + "/search.aweb?subclass_type=DES_DOC";
    const searchResp = await fetch(searchUrl, {
      headers: {
        Cookie: cookieHeader,
        Accept: "text/html",
        "User-Agent": ASSAI_UA,
      },
      redirect: "follow",
    });
    const searchHtml = await searchResp.text();
    console.log(
      "sync-assai-projects: search.aweb status=" +
        searchResp.status +
        ", html=" +
        searchHtml.length
    );

    // Extract hidden fields
    const extractHiddenFields = (
      html: string
    ): Array<{ name: string; type: string; value: string }> => {
      const fields: Array<{ name: string; type: string; value: string }> = [];
      const inputRegex = /<input[^>]*>/gi;
      let m;
      while ((m = inputRegex.exec(html)) !== null) {
        const tag = m[0];
        const name = tag.match(/name=["']([^"']+)["']/i)?.[1] ?? "";
        if (!name) continue;
        const type =
          tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "text";
        const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? "";
        fields.push({ name, type, value });
      }
      return fields;
    };

    const allFields = extractHiddenFields(searchHtml);
    const hiddenFields = allFields.filter(
      (f) => f.type === "hidden" && f.name && f.value
    );
    const textFields = allFields.filter(
      (f) => f.type === "text" || f.type === ""
    );
    console.log(
      "sync-assai-projects: hidden fields=" +
        hiddenFields.length +
        ", text fields=" +
        textFields.length
    );

    // 5) POST wildcard search to result.aweb
    const formData = new URLSearchParams();
    for (const f of hiddenFields) {
      formData.set(f.name, f.value);
    }
    for (const f of textFields) {
      formData.set(f.name, "");
    }
    formData.set("subclass_type", "DES_DOC");
    formData.set("number", "%");

    const resultResp = await fetch(assaiBase + "/result.aweb", {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
        Referer: searchUrl,
        "User-Agent": ASSAI_UA,
      },
      body: formData.toString(),
      redirect: "follow",
    });

    const resultHtml = await resultResp.text();
    console.log(
      "sync-assai-projects: result.aweb status=" +
        resultResp.status +
        ", html=" +
        resultHtml.length
    );

    // 6) Parse myCells to extract project tuples
    const myCellsMatch = resultHtml.match(
      /var\s+myCells\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function|\/\/|$)/m
    );
    if (!myCellsMatch) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No search results returned from Assai (myCells not found in response). Session may have expired.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let myCells: any[];
    try {
      myCells = JSON.parse(myCellsMatch[1]);
    } catch (parseErr) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to parse Assai search results",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GUARD: zero rows → abort, do NOT touch dms_projects
    if (myCells.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Assai search returned zero rows. Cannot extract project metadata. Try again or check Assai connectivity.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log first row for column index verification
    console.log(
      "sync-assai-projects: FIRST ROW (column verification):",
      JSON.stringify(myCells[0])
    );

    const stripHtml = (s: string) =>
      String(s || "")
        .replace(/<[^>]*>/g, "")
        .trim();

    // Extract unique project tuples
    const projectMap = new Map<
      string,
      {
        project_code: string;
        proj_seq_nr: string;
        project_name: string;
        cabinet: string;
      }
    >();

    for (const row of myCells) {
      // Extract project code from first segment of document number (row[3])
      // row[17] is often empty; row[3] contains e.g. "6529-ABBE-C017-..." → "6529"
      const docNumber = stripHtml(row[3]);
      const projectCode = docNumber.split('-')[0];
      const cabinet = stripHtml(row[26]);
      const projectName = stripHtml(row[27]);
      const projSeqNr = stripHtml(row[36]);

      if (!projectCode || !projSeqNr) continue;

      // Use composite key to handle same code across different cabinets
      const compositeKey = projectCode + '|' + cabinet;
      if (!projectMap.has(compositeKey)) {
        projectMap.set(compositeKey, {
          project_code: projectCode,
          proj_seq_nr: projSeqNr,
          project_name: projectName,
          cabinet: cabinet,
        });
      }
    }

    const projects = Array.from(projectMap.values());
    console.log(
      "sync-assai-projects: found " +
        projects.length +
        " unique projects from " +
        myCells.length +
        " rows"
    );

    if (projects.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Search returned rows but no valid project metadata could be extracted. Column indices may need verification.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7) Upsert into dms_projects
    let synced = 0;
    for (const proj of projects) {
      const { error: upsertErr } = await supabaseClient
        .from("dms_projects")
        .upsert(
          {
            code: proj.project_code,
            proj_seq_nr: proj.proj_seq_nr,
            project_name: proj.project_name,
            cabinet: proj.cabinet,
          },
          { onConflict: "code" }
        );

      if (upsertErr) {
        console.error(
          `sync-assai-projects: upsert error for ${proj.project_code}:`,
          upsertErr
        );
      } else {
        synced++;
      }
    }

    console.log("sync-assai-projects: synced " + synced + " projects");

    return new Response(
      JSON.stringify({
        success: true,
        projects_synced: synced,
        projects: projects.map((p) => ({
          code: p.project_code,
          name: p.project_name,
          proj_seq_nr: p.proj_seq_nr,
          cabinet: p.cabinet,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("sync-assai-projects: unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
