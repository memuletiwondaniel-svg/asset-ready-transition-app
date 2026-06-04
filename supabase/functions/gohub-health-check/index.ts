// Daily health-check for the GoHub catalog + GoCompletions extractors.
//
// Two layers:
//   1. Catalog freshness/coverage (pre-existing) — tile counts + staleness.
//   2. STRUCTURAL CANARY (new, Phase B) — runs the real extractors against
//      a known-good oracle subsystem and asserts INVARIANTS that survive
//      real-world data change. Goal: break loud-and-fast when something
//      drifts silently (wrong param → []/500, stale postback → blank form,
//      &nbsp; placeholder phantom row, parser regression).
//
// The cert dates checked here are 2019 COMPLETED gates — immutable
// historical facts, so asserting their presence is a stable liveness
// signal, not a cry-wolf risk. Mutable counts (e.g. outstanding ITRs)
// are deliberately NOT asserted.

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  GocSessionManager,
  getGoCompletionsCredentials,
} from "../_shared/gocompletions-auth.ts";
import { handleGetHandoverCertificateStatus } from "../_shared/fred/handlers.ts";
import {
  CANARY_ORACLE,
  CLASS_NAME_ALL,
  ITR_CLASS_ALL,
  isEmptyPlaceholderCell,
  parseItrCode,
} from "../_shared/gohub-contract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TileFreshness {
  tile_name: string;
  system_count: number;
  last_synced_at: string | null;
}

interface Alert {
  level: "critical" | "warning";
  tile: string;
  reason: string;
}

const CRITICAL_TILES: Record<string, number> = {
  "WEST QURNA (WQ)": 50,
  "WEST QURNA": 50,
  "NORTH RUMAILA": 20,
  "SOUTH RUMAILA": 20,
  "ZUBAIR": 10,
  "UMM QASR": 5,
  "BGC BNGL (NR)": 5,
};

const STALE_AFTER_HOURS = 48;

// ─── Canary probes ───────────────────────────────────────────

async function probeGetSystems(session: GocSessionManager) {
  const data: any = await session.callMethod("GetSystems", { itrClass: ITR_CLASS_ALL });
  const arr: any[] = Array.isArray(data)
    ? data
    : (data?.Items || data?.Systems || data?.results || []);
  if (!arr.length) throw new Error("GetSystems returned empty array");
  // Walk to find the oracle subsystem & its rollup ITR total.
  for (const sys of arr) {
    const subs: any[] = sys.SubSystem || sys.SubSystems || sys.Subsystems || [];
    for (const sub of subs) {
      const num = String(sub.Number || sub.SubSystemNumber || sub.Name || "").trim();
      if (num === CANARY_ORACLE.subsystem_number) {
        return { rollup_itrs: Number(sub.ITRs ?? 0), guid: String(sub.ID || sub.GUID || "") };
      }
    }
  }
  throw new Error(`oracle subsystem ${CANARY_ORACLE.subsystem_number} not in GetSystems rollup`);
}

async function probeItrs(session: GocSessionManager): Promise<{ count: number; a: number; b: number; bad_codes: string[] }> {
  const rows: any = await session.callMethod("GetSubSystemTagITRList", {
    subSystemID: CANARY_ORACLE.subsystem_guid,
    className: CLASS_NAME_ALL,
  });
  if (!Array.isArray(rows)) throw new Error("GetSubSystemTagITRList non-array");
  let a = 0, b = 0;
  const bad: string[] = [];
  for (const r of rows) {
    const code = String(r.ITR ?? "").trim();
    const parsed = parseItrCode(code);
    if (!parsed) { bad.push(code); continue; }
    if (parsed.ab_phase === "A") a++; else b++;
  }
  return { count: rows.length, a, b, bad_codes: bad };
}

async function probeCertDates(supabase: any): Promise<Record<string, string | null>> {
  // Use the proven Fred handler (same code path as the sync) so the canary
  // exercises the real extraction pipeline, not a parallel re-implementation.
  const out: Record<string, string | null> = {};
  for (const certType of ["MCC", "PCC", "RFC"]) {
    try {
      const res = await handleGetHandoverCertificateStatus({
        project_code: CANARY_ORACLE.tile_name,
        certificate_type: certType,
        sub_system: CANARY_ORACLE.subsystem_number,
      }, supabase);
      const certs = (res?.certificates || []) as any[];
      const match = certs.find((c) => {
        const sub = String(c.sub_system || c.SubSystem || c.raw?.["Sub System"] || c.raw?.SubSystem || "").trim();
        return sub.includes(CANARY_ORACLE.subsystem_number);
      }) || certs[0];
      const accepted = match
        ? String(match.accepted_date || match.raw?.["Accepted Date"] || "").trim()
        : "";
      out[certType] = accepted || null;
    } catch (_) {
      out[certType] = null;
    }
  }
  return out;
}


function parseAcceptedDateToIso(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const mm = months[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}

async function runCanary(supabase: any): Promise<{ ok: boolean; checks: any[]; alerts: Alert[] }> {
  const checks: any[] = [];
  const alerts: Alert[] = [];
  const tile = CANARY_ORACLE.tile_name;
  try {
    const creds = await getGoCompletionsCredentials(supabase);
    const session = new GocSessionManager(creds.portalUrl, creds.username, creds.password, tile);

    // 1. GetSystems
    try {
      const rs = await probeGetSystems(session);
      checks.push({ name: "GetSystems.oracle_in_rollup", ok: true, rollup_itrs: rs.rollup_itrs });
      if (rs.rollup_itrs !== CANARY_ORACLE.expected_itr_total) {
        alerts.push({
          level: "critical", tile,
          reason: `CANARY: GetSystems rollup_itrs=${rs.rollup_itrs} != expected ${CANARY_ORACLE.expected_itr_total} on oracle ${CANARY_ORACLE.subsystem_number}`,
        });
      }
    } catch (e: any) {
      checks.push({ name: "GetSystems.oracle_in_rollup", ok: false, error: String(e?.message || e) });
      alerts.push({ level: "critical", tile, reason: `CANARY: GetSystems failed — ${String(e?.message || e).slice(0, 200)}` });
    }

    // 2. ITRs
    try {
      const itr = await probeItrs(session);
      checks.push({ name: "GetSubSystemTagITRList.oracle", ok: true, ...itr });
      if (itr.count !== CANARY_ORACLE.expected_itr_total) {
        alerts.push({ level: "critical", tile, reason: `CANARY: ITR count=${itr.count} != ${CANARY_ORACLE.expected_itr_total}` });
      }
      if (itr.a !== CANARY_ORACLE.expected_itr_a || itr.b !== CANARY_ORACLE.expected_itr_b) {
        alerts.push({ level: "critical", tile, reason: `CANARY: A/B split=${itr.a}/${itr.b} != ${CANARY_ORACLE.expected_itr_a}/${CANARY_ORACLE.expected_itr_b}` });
      }
      if (itr.bad_codes.length) {
        alerts.push({ level: "critical", tile, reason: `CANARY: ${itr.bad_codes.length} ITR codes failed BGC-{disc}{digits}{A|B}: ${itr.bad_codes.slice(0, 3).join(", ")}` });
      }
    } catch (e: any) {
      checks.push({ name: "GetSubSystemTagITRList.oracle", ok: false, error: String(e?.message || e) });
      alerts.push({ level: "critical", tile, reason: `CANARY: ITR probe failed — ${String(e?.message || e).slice(0, 200)}` });
    }

    // 3. Cert Accepted Dates (immutable 2019 facts)
    try {
      const dates = await probeCertDates(supabase);
      checks.push({ name: "HandoverSearch.cert_accepted_dates", ok: true, dates });
      for (const [k, expected] of Object.entries(CANARY_ORACLE.expected_cert_dates)) {
        const got = parseAcceptedDateToIso(dates[k]);
        if (got !== expected) {
          alerts.push({
            level: "critical", tile,
            reason: `CANARY: ${k} accepted_date='${dates[k] ?? "(none)"}' parsed='${got ?? "(none)"}' != expected '${expected}' — HandoverSearch postback or RadGrid parser regressed`,
          });
        }
      }
    } catch (e: any) {
      checks.push({ name: "HandoverSearch.cert_accepted_dates", ok: false, error: String(e?.message || e) });
      alerts.push({ level: "critical", tile, reason: `CANARY: cert probe failed — ${String(e?.message || e).slice(0, 200)}` });
    }

    // 4. Placeholder/empty-row skip guard (pure-function sanity check
    //    that the contract helper still rejects `&nbsp;` placeholders).
    const placeholderOk = isEmptyPlaceholderCell("&nbsp;") && isEmptyPlaceholderCell("") && !isEmptyPlaceholderCell("X");
    checks.push({ name: "contract.isEmptyPlaceholderCell", ok: placeholderOk });
    if (!placeholderOk) {
      alerts.push({ level: "critical", tile, reason: "CANARY: isEmptyPlaceholderCell regressed — &nbsp; rows would persist as phantom certs" });
    }

    return { ok: alerts.length === 0, checks, alerts };
  } catch (e: any) {
    return {
      ok: false,
      checks,
      alerts: [{ level: "critical", tile, reason: `CANARY: setup failed — ${String(e?.message || e).slice(0, 200)}` }],
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const skipCanary = url.searchParams.get("skip_canary") === "1";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase.rpc("gohub_catalog_freshness");
    if (error) {
      console.log(`HealthCheck: rpc failed: ${error.message}`);
      return new Response(
        JSON.stringify({ healthy: false, error: error.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tiles = (data || []) as TileFreshness[];
    const alerts: Alert[] = [];
    const now = Date.now();

    const tileByName = new Map(tiles.map((t) => [t.tile_name.toUpperCase(), t]));
    for (const [name, threshold] of Object.entries(CRITICAL_TILES)) {
      const found = tileByName.get(name.toUpperCase());
      if (!found) {
        alerts.push({
          level: "critical",
          tile: name,
          reason: `expected tile is missing from catalog — admin Sync may have never run, or this tile's session is broken`,
        });
        continue;
      }
      if (found.system_count < threshold) {
        alerts.push({
          level: "critical",
          tile: name,
          reason: `system_count=${found.system_count} dropped below expected ${threshold} — likely tile-switch session bug`,
        });
      }
    }

    for (const t of tiles) {
      if (!t.last_synced_at) continue;
      const ageHours = (now - new Date(t.last_synced_at).getTime()) / 3_600_000;
      if (ageHours > STALE_AFTER_HOURS) {
        alerts.push({
          level: "warning",
          tile: t.tile_name,
          reason: `last synced ${Math.round(ageHours)}h ago — older than ${STALE_AFTER_HOURS}h threshold`,
        });
      }
    }

    // Structural canary (live extractor invariants)
    let canaryReport: any = { skipped: true };
    if (!skipCanary) {
      const canary = await runCanary(supabase);
      alerts.push(...canary.alerts);
      canaryReport = { ok: canary.ok, checks: canary.checks };
    }

    const critical = alerts.filter((a) => a.level === "critical");
    const healthy = critical.length === 0;

    console.log(
      `HealthCheck: tiles=${tiles.length} alerts=${alerts.length} critical=${critical.length} canary_ok=${canaryReport.ok ?? "skipped"} healthy=${healthy}`,
    );
    for (const a of alerts) console.log(`HealthCheck[${a.level}] ${a.tile}: ${a.reason}`);

    return new Response(
      JSON.stringify({
        healthy,
        checked_at: new Date().toISOString(),
        tiles,
        alerts,
        canary: canaryReport,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("HealthCheck error:", e);
    return new Response(
      JSON.stringify({ healthy: false, error: String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
