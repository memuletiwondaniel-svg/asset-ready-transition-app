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
import { HANDOVER_CERTS } from "../_shared/gohub-contract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Page-shape discovery helpers ───────────────────────────
//
// Live-capture findings (TagSearch.aspx):
//   - SubSystem filter is a plain textbox:
//       ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i0
//         $TagSearch_PrimarySearchCriteria$SubSystemTextBox
//     There is NO RadComboBox _ClientState on the SubSystem field.
//   - SearchButton is a RadButton:
//       ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i7$SearchButton
//     The page renders an inner <input name="..._input">; the postback
//     target is the OUTER UniqueID (strip the trailing "_input").
//
// To avoid grabbing controls from an unrelated pane (header search,
// alerts, other panels), prefer the PrimarySearchCriteria-scoped
// SubSystem control, then derive the SearchButton from the same
// MasterRadPanelBar$i0$iN parent path when possible.

function findSubSystemField(html: string): {
  field: string | null;
  clientState: string | null;
  scopePrefix: string | null;
} {
  const cands: string[] = [];
  const re = /<input[^>]*name=["']([^"']*[Ss]ub[Ss]ystem[^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) cands.push(m[1]);

  // Prefer controls inside *PrimarySearchCriteria — that's the real search
  // form for TagSearch/PunchlistItemSearch/HandoverSearch. Inside that
  // scope, prefer the plain textbox (SubSystemTextBox); fall back to a
  // RadComboBox visible input ($SubSystem_Input) only if no textbox.
  const primary = cands.filter((c) => /PrimarySearchCriteria/i.test(c));
  const pool = primary.length ? primary : cands;
  const field = pool.find((c) => /SubSystemTextBox$/i.test(c))
    || pool.find((c) => /\$SubSystem$/.test(c))
    || pool.find((c) => /SubSystem_Input$/i.test(c))
    || null;

  // ClientState only exists when the control is a RadComboBox. For the
  // TagSearch plain textbox it will (correctly) be null.
  const clientState = pool.find((c) => /SubSystem_ClientState$/i.test(c)) || null;

  // Scope prefix = the MasterRadPanelBar$i0$iN parent of the chosen field.
  let scopePrefix: string | null = null;
  if (field) {
    const sm = field.match(/^(.*?MasterRadPanelBar\$i\d+)\$i\d+/i);
    if (sm) scopePrefix = sm[1];
  }
  return { field, clientState, scopePrefix };
}

function findPostbackTarget(html: string, scopePrefix: string | null): string | null {
  // Strip "_input" → UniqueID for the RadButton outer name.
  const targets: string[] = [];
  const re = /<input[^>]*name=["']([^"']+SearchButton)_input["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) targets.push(m[1]);
  if (!targets.length) return null;
  if (scopePrefix) {
    const scoped = targets.find((t) => t.startsWith(scopePrefix));
    if (scoped) return scoped;
  }
  return targets[0];
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

// Authoritative per-subsystem ITR set via the CompletionsGrid ASMX
// WebMethod that backs the subsystem-detail modal's "X of Y" header.
// Row shape: { Tag, ITR, Location, Inspector, CompletedDate }.
//
// className must be "All" — "A"/"B"/"" silently return [], empty 500s;
// A/B is derived from the ITR code suffix, not this param. (Same trap
// class as GetSystems' itrClass.)
async function scrapeSubSystemITRs(
  session: GocSessionManager,
  subsystem: string,
  subGuid: string,
) {
  const rows: any[] = await session.callMethod("GetSubSystemTagITRList", {
    subSystemID: subGuid,
    className: "All",
  });
  if (!Array.isArray(rows)) {
    return { ok: false, reason: "GetSubSystemTagITRList non-array", items: [] as any[] };
  }
  const items: any[] = [];
  for (const r of rows) {
    const tag = String(r.Tag ?? "").trim();
    const itr_code = String(r.ITR ?? "").trim();
    if (!tag || !itr_code) continue;
    const inspector = String(r.Inspector ?? "").trim();
    const completed_date = parseDmyDate(r.CompletedDate);
    const location = String(r.Location ?? "").trim() || null;
    const ab = itr_code.match(/([AB])\s*$/i)?.[1]?.toUpperCase();
    const disc = itr_code.match(/BGC-([A-Z])/)?.[1] ?? null;
    const complete = !!(inspector && completed_date);
    items.push({
      tag_guid: tag,            // soft-link key; CompletionsGrid ITRS has no tag GUID
      tag_code: tag,
      tag_description: null,
      itr_code,
      ab_phase: ab === "A" || ab === "B" ? ab : "?",
      discipline: disc,
      status: complete ? "complete" : "open",
      raw: { ...r, _subsystem_guid: subGuid, inspector, completed_date, location },
    });
  }
  return { ok: true, items, row_count: rows.length };
}


async function scrapePunch(session: GocSessionManager, subsystem: string) {
  const { html, url, cookies } = await session.navigateTo("GoCompletions/Completions/PunchlistItemSearch.aspx");
  const sub = findSubSystemField(html);
  const target = findPostbackTarget(html, sub.scopePrefix);
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
    const debug = !!body.debug;
    const overrideSubs: string[] | null = Array.isArray(body.override_subsystems) && body.override_subsystems.length
      ? body.override_subsystems.map((s: any) => String(s)) : null;
    // override_subsystems forces probe-only (no writes, no rollup updates, no cert upserts).
    // override_subsystems defaults to probe-only; pass dry_run:false to force writes.
    const dryRun = body.dry_run === false ? false : (!!body.dry_run || !!overrideSubs);

    let subsystems: string[];
    if (overrideSubs) {
      subsystems = overrideSubs;
    } else {
      const { data: sysRows, error: sysErr } = await supa
        .from("p2a_systems")
        .select("system_id, handover_plan_id, p2a_handover_plans!inner(project_code)")
        .eq("p2a_handover_plans.project_code", projectCode);
      if (sysErr) throw new Error(`p2a_systems query: ${sysErr.message}`);
      subsystems = (sysRows || []).map((r: any) => r.system_id).filter(Boolean);
      if (Array.isArray(body.system_ids) && body.system_ids.length) {
        const filter = new Set<string>(body.system_ids);
        subsystems = subsystems.filter((s: string) => filter.has(s));
      }
    }
    if (!subsystems.length) {
      report.errors.push("no subsystems found for project");
      return new Response(JSON.stringify(report), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tile name: caller > gohub_synced_systems lookup (skipped under override)
    let tileName: string | null = body.tile_name || null;
    if (!tileName && !overrideSubs) {
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

    // ── GetSystems (once) → rollup totals + subsystem GUID map ──
    // The CompletionsGrid ASMX call that backs the rollup also returns
    // every subsystem's GUID nested under SubSystem[]. Reuse it for both
    // the rollup snapshot AND the per-subsystem ITR pulls below; do NOT
    // re-fetch GetSystems per subsystem.
    const bySub: Record<string, { total: number; complete: number; guid: string | null }> = {};
    try {
      // GetSystems requires the itrClass param — sending `{}` returns 500.
      const sysResp: any = await session.callMethod("GetSystems", { itrClass: "All" });
      const arr: any[] = Array.isArray(sysResp)
        ? sysResp
        : (sysResp?.Items || sysResp?.data || sysResp?.results || sysResp?.Systems || []);
      for (const sys of arr) {
        const subs: any[] = sys.SubSystem || sys.SubSystems || sys.Subsystems
          || sys.SubsystemList || sys.subSystems || [];
        for (const sub of subs) {
          const num = String(sub.Number || sub.SubSystemNumber || sub.Name || "").trim();
          if (!num) continue;
          bySub[num] = {
            total: Number(sub.ITRs ?? sub.TotalITRs ?? 0),
            complete: Number(sub.ITRsComp ?? sub.ITRsCompleted ?? sub.CompleteITRs ?? 0),
            guid: String(sub.ID || sub.Id || sub.SubSystemID || sub.GUID || "") || null,
          };
        }
      }
      report.rollup_subsystems_seen = Object.keys(bySub).length;
    } catch (e: any) {
      report.errors.push(`getsystems: ${String(e?.message || e).slice(0, 200)}`);
    }

    // ── Per-subsystem: ITRs (CompletionsGrid ASMX) + Punch ──
    for (const ss of subsystems) {
      report.subsystems_attempted++;
      const perSs: any = { subsystem: ss, itr: null, punch: null };
      const rollup = bySub[ss];
      const subGuid = rollup?.guid || null;
      try {
        if (!subGuid) {
          perSs.itr = { ok: false, reason: "subsystem not found in GetSystems rollup" };
        } else {
          const itr = await scrapeSubSystemITRs(session, ss, subGuid);
          const items = itr.items || [];
          const aCount = items.filter((i: any) => i.ab_phase === "A").length;
          const bCount = items.filter((i: any) => i.ab_phase === "B").length;
          const complete = items.filter((i: any) => i.status === "complete").length;
          const outstanding = items.filter((i: any) => i.status === "open").length;
          perSs.itr = {
            ok: itr.ok,
            count: items.length,
            a: aCount,
            b: bCount,
            complete,
            outstanding,
            ab_sum_matches_total: aCount + bCount === items.length,
            rollup_total: rollup?.total ?? null,
            rollup_complete: rollup?.complete ?? null,
            matches_rollup: rollup ? (items.length === rollup.total && complete === rollup.complete) : null,
            reason: (itr as any).reason,
            subsystem_guid: subGuid,
          };
          if (itr.ok && items.length && !dryRun) {
            const payload = items.map((it) => ({
              project_code: projectCode, subsystem_number: ss, ...it,
              last_synced_at: new Date().toISOString(),
            }));
            const { error } = await supa.from("gohub_itr_items")
              .upsert(payload, { onConflict: "project_code,subsystem_number,tag_guid,itr_code" });
            if (error) perSs.itr.upsert_error = error.message;
            else report.itr_items_upserted += payload.length;
          }
        }
      } catch (e: any) { perSs.itr = { ok: false, error: String(e?.message || e).slice(0, 200) }; }

      try {
        const punch = await scrapePunch(session, ss);
        const items = punch.items || [];
        // Category and open/closed splits — punch is "closed" only when both
        // Cleared Date and Accepted Date are present (per gate contract).
        const catA = items.filter((i: any) => /^a$/i.test(String(i.category))).length;
        const catB = items.filter((i: any) => /^b$/i.test(String(i.category))).length;
        const closed = items.filter((i: any) => i.cleared_date && i.accepted_date).length;
        const open = items.length - closed;
        perSs.punch = {
          ok: punch.ok,
          count: items.length,
          category_a: catA,
          category_b: catB,
          open,
          closed,
          reason: (punch as any).reason,
        };
        if (punch.ok && items.length && !dryRun) {
          const payload = items.map((it) => ({
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

    // ── Rollup snapshot writeback (uses bySub built above) ──
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

    // ── Certificates pass via Fred handler (MCC, MCC-DAC, PCC, PCDAC, RFC, RFSU, RFOC) ──
    // HandoverSearch.aspx is WebForms RadButton — the search button postback
    // target must be the control UniqueID WITHOUT the trailing `_input`
    // (same trap class as TagSearch). Fred's handler now applies that fix
    // and groups by SubSystem,Discipline for DAC variants.
    if (!body.skip_certs) {
      // Iterate the full contract (MCC, MCC-DAC, PCC, PCDAC, RFC, RFSU, RFOC, FAC).
      // GUIDs/gate/groupBy come from HANDOVER_CERTS — do not hardcode here.
      const certTypes = HANDOVER_CERTS.map((c) => c.cert_type);
      report.cert_pass.per_type = [] as any[];
      for (const certType of certTypes) {
        report.cert_pass.attempted++;
        try {
          const res = await handleGetHandoverCertificateStatus(
            { project_code: tileName, certificate_type: certType },
            supa,
          );
          const certs = (res?.certificates || []) as any[];
          report.cert_pass.per_type.push({
            cert_type: certType,
            postback_fired: res?.postback_fired ?? null,
            group_by: res?.group_by ?? null,
            total: res?.total_certificates ?? certs.length,
            note: res?.note ?? null,
            error: res?.error ?? null,
            diag: res?.diag ?? null,
          });
          if (!certs.length) continue;
          report.cert_pass.ok++;
          if (dryRun) continue;
          const seen = new Set<string>();
          const payload: any[] = [];
          for (const c of certs) {
            const subsys = String(c.sub_system || c.SubSystem || "").trim() || null;
            const objectId = String(c.certificate_ref || c.Ref || c.Certificate || c.raw?.Ref || "").trim();
            const discipline = String(c.discipline || c.raw?.Discipline || "").trim();
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
