// Daily health-check for the GoHub catalog.
//
// Reports per-tile freshness and counts so we can alert if a tile that
// should have many systems (e.g. WEST QURNA, ~148+) silently drops to 0.
// Designed to be called by a scheduled cron job (or hit on-demand by an
// admin). Returns 200 with `healthy:false` and a list of `alerts` when
// anything looks off — so the cron can pipe that into a notification.

import { createClient } from "jsr:@supabase/supabase-js@2";

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

// Tiles we expect to always have a non-trivial number of systems.
// If any of these drop to 0, that's a critical regression (likely the
// session-bleed bug or upstream auth break).
const CRITICAL_TILES: Record<string, number> = {
  "WEST QURNA (WQ)": 50,
  "WEST QURNA": 50,
  "NORTH RUMAILA": 20,
  "SOUTH RUMAILA": 20,
  "ZUBAIR": 10,
  "UMM QASR": 5,
  "BGC BNGL (NR)": 5,
};

// Warn if catalog hasn't been refreshed in this many hours.
const STALE_AFTER_HOURS = 48;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Critical: known tile present in catalog but dropped below threshold,
    // OR known tile entirely missing.
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

    // Warning: any tile with stale data
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

    const critical = alerts.filter((a) => a.level === "critical");
    const healthy = critical.length === 0;

    console.log(
      `HealthCheck: tiles=${tiles.length} alerts=${alerts.length} critical=${critical.length} healthy=${healthy}`,
    );
    if (alerts.length > 0) {
      for (const a of alerts) {
        console.log(`HealthCheck[${a.level}] ${a.tile}: ${a.reason}`);
      }
    }

    return new Response(
      JSON.stringify({
        healthy,
        checked_at: new Date().toISOString(),
        tiles,
        alerts,
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
