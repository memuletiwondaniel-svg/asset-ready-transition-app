/**
 * gohub-sync-system-details
 *
 * Per-project sync into the three detail tables (gohub_itr_items,
 * gohub_punch_items, gohub_certificates) + rollup snapshot on
 * p2a_systems (gohub_rollup_total_itrs/complete_itrs/synced_at).
 *
 * Uses the live-capture fix: Search-button RadButton postback target is
 * the control UniqueID WITHOUT the trailing `_input` (which is the inner
 * <input> name, not the server-side click target). GocSessionManager
 * already selects the project tile before any page navigation.
 *
 * Body:
 *   {
 *     project_code: string,             // e.g. "DP-18F"
 *     tile_name?:   string,             // GoC tile (e.g. "WEST QURNA"); auto-resolved if absent
 *     system_ids?:  string[],           // optional limit; default = all p2a_systems for the project
 *     skip_certs?:  boolean,            // skip the Fred handover pass (debug)
 *     dry_run?:     boolean,            // parse + report, do not upsert
 *   }
 */

import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import {
  GocSessionManager,
  getGoCompletionsCredentials,
  postWithViewState,
  parseRadGridTable,
} from "../_shared/gocompletions-auth.ts";
import { handleGetHandoverCertificateStatus } from "../_shared/fred/handlers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Page-shape discovery helpers ───────────────────────────

function findPostbackTarget(html: string): string | null {
  const m = html.match(/<input[^>]*name=["']([^"']+SearchButton)_input["']/i);
  return m ? m[1] : null;
}

function findSubSystemField(html: string): { field: string | null; clientState: string | null } {
  const cands: string[] = [];
  const re = /<input[^>]*name=["']([^"']*[Ss]ub[Ss]ystem[^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) cands.push(m[1]);
  const field = cands.find((c) => /SubSystem_Input$/i.test(c))
    || cands.find((c) => /SubSystemTextBox$/.test(c))
    || cands.find((c) => /\$SubSystem$/.test(c))
    || cands.find((c) => /PrimarySearchCriteria[^_]*SubSystem/i.test(c))
    || null;
  const clientState = cands.find((c) => /SubSystem_ClientState$/i.test(c)) || null;
  return { field, clientState };
}

function extractRowCellsHtml(tableHtml: string): string[][] {
  const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const body = tbodyMatch ? tbodyMatch[1] : tableHtml;
  const trRe = /<tr[^>]*class="[^"]*rg(?:Row|AltRow)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[][] = [];
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(body)) !== null) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const cells: string[] = [];
    let t: RegExpExecArray | null;
    while ((t = tdRe.exec(m[1])) !== null) cells.push(t[1]);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function extractHeaders(tableHtml: string): string[] {
  const head = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)
    || tableHtml.match(/<tr[^>]*class="[^"]*rgHeader[^"]*"[^>]*>([\s\S]*?)<\/tr>/i);
  if (!head) return [];
  const out: string[] = [];
  const re = /<th[^>]*>([\s\S]*?)<\/th>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(head[1])) !== null) {
    out.push(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  }
  return out;
}

function parseTagItrsCell(cellHtml: string): Array<{ code: string; outstanding: boolean }> {
  const out: Array<{ code: string; outstanding: boolean }> = [];
  for (const raw of cellHtml.split(/,(?![^<]*>)/)) {
    const s = raw.trim();
    if (!s) continue;
    const outstanding = /<b\b[^>]*>/i.test(s);
    const code = s.replace(/<[^>]+>/g, "").trim();
    if (code) out.push({ code, outstanding });
  }
  return out;
}

function parseDmyDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const clean = String(s).replace(/&nbsp;/g, "").trim();
  if (!clean) return null;
  // "17 Sep 2019"
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const m = clean.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (m) {
    const mm = months[m[2].toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
  }
  // ISO already?
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
  return null;
}

function htmlCellText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").replace(/\s+/g, " ").trim();
}

// ─── Per-subsystem scrapers ──────────────────────────────────

async function scrapeTagSearch(session: GocSessionManager, subsystem: string) {
  const { html, url, cookies } = await session.navigateTo("GoCompletions/Completions/TagSearch.aspx");
  const target = findPostbackTarget(html);
  const sub = findSubSystemField(html);
  if (!target || !sub.field) {
    return { ok: false, reason: "no postback target or subsystem field", items: [] as any[] };
  }
  const params: Record<string, string> = {
    [sub.field]: subsystem,
    __EVENTTARGET: target,
    __EVENTARGUMENT: "",
  };
  if (sub.clientState) {
    params[sub.clientState] = JSON.stringify({
      value: subsystem, text: subsystem, enabled: true, logEntries: null,
      checkedIndices: [], checkedItemsTextOverflows: false,
    });
  }
  const { html: resultHtml } = await postWithViewState(cookies, url, html, params);
  const tableMatch = resultHtml.match(/<table[^>]*class="[^"]*rgMasterTable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return { ok: false, reason: "no rgMasterTable", items: [] as any[] };

  const headers = extractHeaders(tableMatch[1]);
  const rows = extractRowCellsHtml(tableMatch[1]);
  const idIdx = headers.findIndex((h) => /^id$/i.test(h));
  const tagIdx = headers.findIndex((h) => /^tag$/i.test(h));
  const descIdx = headers.findIndex((h) => /^description$/i.test(h));
  const discIdx = headers.findIndex((h) => /^discipline$/i.test(h));
  const itrsIdx = headers.findIndex((h) => /tag\s*itrs/i.test(h));
  if (itrsIdx < 0) return { ok: false, reason: "no Tag ITRs column", items: [] as any[] };

  const items: any[] = [];
  for (const r of rows) {
    const tagGuid = idIdx >= 0
      ? (r[idIdx].match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || htmlCellText(r[idIdx]))
      : "";
    const tagCode = tagIdx >= 0 ? htmlCellText(r[tagIdx]) : "";
    const tagDesc = descIdx >= 0 ? htmlCellText(r[descIdx]) : "";
    const discColumn = discIdx >= 0 ? htmlCellText(r[discIdx]) : "";
    const itrs = parseTagItrsCell(r[itrsIdx]);
    for (const itr of itrs) {
      const ab = itr.code.match(/([AB])\s*$/i)?.[1]?.toUpperCase() ?? "?";
      const disc = itr.code.match(/BGC-([A-Z])/)?.[1] ?? (discColumn[0] || "");
      items.push({
        tag_guid: tagGuid,
        tag_code: tagCode,
        tag_description: tagDesc,
        itr_code: itr.code,
        ab_phase: ab === "A" || ab === "B" ? ab : "?",
        discipline: disc,
        status: itr.outstanding ? "open" : "complete",
        raw: { tag_id_cell: r[idIdx], discipline_cell: discColumn },
      });
    }
  }
  return { ok: true, items, header_count: headers.length, row_count: rows.length };
}

async function scrapePunch(session: GocSessionManager, subsystem: string) {
  const { html, url, cookies } = await session.navigateTo("GoCompletions/Completions/PunchlistItemSearch.aspx");
  const target = findPostbackTarget(html);
  const sub = findSubSystemField(html);
  if (!target || !sub.field) return { ok: false, reason: "no postback target or subsystem field", items: [] as any[] };
  const params: Record<string, string> = {
    [sub.field]: subsystem,
    __EVENTTARGET: target,
    __EVENTARGUMENT: "",
  };
  if (sub.clientState) {
    params[sub.clientState] = JSON.stringify({ value: subsystem, text: subsystem, enabled: true });
  }
  const { html: resultHtml } = await postWithViewState(cookies, url, html, params);
  const rows = parseRadGridTable(resultHtml);
  const items: any[] = [];
  for (const r of rows) {
    const pl = String(r.Punchlist || r["Punch List"] || r.PunchList || "").replace(/&nbsp;/g, "").trim();
    const itemNo = Number(String(r.Item || r["Item No"] || r.ItemNo || "").replace(/&nbsp;/g, "").trim());
    if (!pl || !Number.isFinite(itemNo)) continue;
    items.push({
      punchlist: pl,
      item_no: itemNo,
      description: String(r.Description || "").replace(/&nbsp;/g, "").trim(),
      discipline: String(r.Discipline || "").replace(/&nbsp;/g, "").trim(),
      category: String(r.Category || "").replace(/&nbsp;/g, "").trim(),
      tag: String(r.Tag || "").replace(/&nbsp;/g, "").trim(),
      itr: String(r.ITR || "").replace(/&nbsp;/g, "").trim(),
      location: String(r.Location || "").replace(/&nbsp;/g, "").trim(),
      cleared_date: parseDmyDate(r["Cleared Date"]),
      accepted_date: parseDmyDate(r["Accepted Date"]),
      accepted_by: String(r["Accepted By"] || "").replace(/&nbsp;/g, "").trim() || null,
      raw: r,
    });
  }
  return { ok: true, items, row_count: rows.length };
}

// ─── Main ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const report: any = {
    project_code: null, tile_name: null,
    subsystems_attempted: 0, subsystems_ok: 0,
    itr_items_upserted: 0, punch_items_upserted: 0, certs_upserted: 0,
    per_subsystem: [] as any[],
    cert_pass: { attempted: 0, ok: 0, errors: [] as string[] },
    rollup_updated: 0,
    errors: [] as string[],
  };

  try {
    const body = await req.json().catch(() => ({}));
    const projectCode: string = body.project_code;
    if (!projectCode) {
      return new Response(JSON.stringify({ error: "project_code required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    report.project_code = projectCode;
    const dryRun = !!body.dry_run;

    // Resolve subsystems from p2a_systems for this project
    const { data: sysRows, error: sysErr } = await supa
      .from("p2a_systems")
      .select("system_id, handover_plan_id, p2a_handover_plans!inner(project_code)")
      .eq("p2a_handover_plans.project_code", projectCode);
    if (sysErr) throw new Error(`p2a_systems query: ${sysErr.message}`);
    let subsystems = (sysRows || []).map((r: any) => r.system_id).filter(Boolean);
    if (Array.isArray(body.system_ids) && body.system_ids.length) {
      const filter = new Set<string>(body.system_ids);
      subsystems = subsystems.filter((s: string) => filter.has(s));
    }
    if (!subsystems.length) {
      report.errors.push("no subsystems found for project");
      return new Response(JSON.stringify(report), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tile name: caller > gohub_synced_systems lookup > best guess
    let tileName: string | null = body.tile_name || null;
    if (!tileName) {
      const { data: tileRow } = await supa
        .from("gohub_synced_systems")
        .select("tile_name")
        .in("system_id", subsystems.slice(0, 5))
        .limit(1)
        .maybeSingle();
      tileName = tileRow?.tile_name || null;
    }
    if (!tileName) {
      report.errors.push("could not resolve tile_name for project; pass body.tile_name");
      return new Response(JSON.stringify(report), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    report.tile_name = tileName;

    const creds = await getGoCompletionsCredentials(supa);
    const session = new GocSessionManager(creds.portalUrl, creds.username, creds.password, tileName);

    // ── Per-subsystem: TagSearch + Punch ──
    for (const ss of subsystems) {
      report.subsystems_attempted++;
      const perSs: any = { subsystem: ss, itr: null, punch: null };
      try {
        const tag = await scrapeTagSearch(session, ss);
        perSs.itr = { ok: tag.ok, count: tag.items?.length || 0, reason: (tag as any).reason };
        if (tag.ok && tag.items.length && !dryRun) {
          const payload = tag.items.map((it) => ({
            project_code: projectCode, subsystem_number: ss, ...it,
            last_synced_at: new Date().toISOString(),
          }));
          const { error } = await supa.from("gohub_itr_items")
            .upsert(payload, { onConflict: "project_code,subsystem_number,tag_guid,itr_code" });
          if (error) perSs.itr.upsert_error = error.message;
          else report.itr_items_upserted += payload.length;
        }
      } catch (e: any) { perSs.itr = { ok: false, error: String(e?.message || e).slice(0, 200) }; }

      try {
        const punch = await scrapePunch(session, ss);
        perSs.punch = { ok: punch.ok, count: punch.items?.length || 0, reason: (punch as any).reason };
        if (punch.ok && punch.items.length && !dryRun) {
          const payload = punch.items.map((it) => ({
            project_code: projectCode, subsystem_number: ss, ...it,
            last_synced_at: new Date().toISOString(),
          }));
          const { error } = await supa.from("gohub_punch_items")
            .upsert(payload, { onConflict: "project_code,punchlist,item_no" });
          if (error) perSs.punch.upsert_error = error.message;
          else report.punch_items_upserted += payload.length;
        }
      } catch (e: any) { perSs.punch = { ok: false, error: String(e?.message || e).slice(0, 200) }; }

      if (perSs.itr?.ok || perSs.punch?.ok) report.subsystems_ok++;
      report.per_subsystem.push(perSs);
    }

    // ── Certificates pass via Fred handler (MCC, MCC-DAC, PCC, PCDAC, RFC, RFSU, RFO, RFOC) ──
    if (!body.skip_certs) {
      const certTypes = ["MCC", "MCC-DAC", "PCC", "PCDAC", "RFC", "RFSU", "RFOC"];
      for (const certType of certTypes) {
        report.cert_pass.attempted++;
        try {
          const res = await handleGetHandoverCertificateStatus(
            { project_code: tileName, certificate_type: certType },
            supa,
          );
          const certs = (res?.certificates || []) as any[];
          if (!certs.length) continue;
          report.cert_pass.ok++;
          if (dryRun) continue;
          const seen = new Set<string>();
          const payload: any[] = [];
          for (const c of certs) {
            const subsys = String(c.sub_system || c.SubSystem || "").trim() || null;
            const objectId = String(c.certificate_ref || c.Ref || c.Certificate || c.raw?.Ref || "").trim();
            const discipline = String(c.raw?.Discipline || c.discipline || "").trim();
            if (!objectId) continue;
            const key = `${certType}|${objectId}|${discipline}`;
            if (seen.has(key)) continue;
            seen.add(key);
            payload.push({
              project_code: projectCode,
              system_number: subsys ? null : (c.raw?.System || null),
              subsystem_number: subsys,
              cert_type: certType,
              object_id: objectId,
              discipline,
              status: String(c.raw?.Status || c.status || "").trim() || null,
              planned_date: parseDmyDate(c.raw?.["Planned Date"] || c.raw?.PlannedDate),
              actual_date: parseDmyDate(c.accepted_date || c.raw?.["Accepted Date"]),
              signed_by: String(c.raw?.["Accepted By"] || c.raw?.AcceptedBy || "").trim() || null,
              raw: c.raw || c,
              last_synced_at: new Date().toISOString(),
            });
          }
          if (payload.length) {
            const { error } = await supa.from("gohub_certificates")
              .upsert(payload, { onConflict: "project_code,cert_type,object_id,discipline" });
            if (error) report.cert_pass.errors.push(`${certType}: ${error.message}`);
            else report.certs_upserted += payload.length;
          }
        } catch (e: any) {
          report.cert_pass.errors.push(`${certType}: ${String(e?.message || e).slice(0, 200)}`);
        }
      }
    }

    // ── Rollup snapshot from GetSystems (authoritative totals per §4) ──
    try {
      const sysResp = await session.callMethod("GetSystems", {});
      const arr: any[] = Array.isArray(sysResp) ? sysResp : (sysResp?.Items || sysResp?.data || []);
      const bySub: Record<string, { total: number; complete: number }> = {};
      for (const sys of arr) {
        for (const sub of (sys.SubSystem || sys.SubSystems || [])) {
          const num = String(sub.Number || sub.SubSystemNumber || "").trim();
          if (!num) continue;
          bySub[num] = {
            total: Number(sub.ITRs || 0),
            complete: Number(sub.ITRsComp || sub.ITRsCompleted || 0),
          };
        }
      }
      const now = new Date().toISOString();
      for (const ss of subsystems) {
        const r = bySub[ss];
        if (!r) continue;
        if (dryRun) { report.rollup_updated++; continue; }
        const { error } = await supa
          .from("p2a_systems")
          .update({
            gohub_rollup_total_itrs: r.total,
            gohub_rollup_complete_itrs: r.complete,
            gohub_rollup_synced_at: now,
          })
          .eq("system_id", ss);
        if (!error) report.rollup_updated++;
      }
    } catch (e: any) {
      report.errors.push(`rollup: ${String(e?.message || e).slice(0, 200)}`);
    }

    return new Response(JSON.stringify(report, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    report.errors.push(`fatal: ${String(e?.message || e).slice(0, 300)}`);
    return new Response(JSON.stringify(report, null, 2), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
