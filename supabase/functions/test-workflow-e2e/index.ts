// M11 workflow E2E harness — edge function entry point.
//
// Contract:
//   POST /test-workflow-e2e
//     body: { mode?: "scaffold" | "full", scenarios?: string[] }
//     auth: must include Bearer <jwt> of an authenticated admin user
//
// Behavior:
//   1. Provision: create test project (is_test_project=true) + 7 canonical-role users.
//   2. Run scenarios (rules R1–R22 then cross-cutting A–H) via the recorder so
//      blocked/pass/fail/error are distinguished and reported.
//   3. Teardown: ALWAYS runs in finally{}, sweeping by runId.
//   4. Return: { runId, results: ScenarioResult[], teardown }.
//
// This entry intentionally does NOT call scenario impls directly — the
// recorder mediates so the dependency graph is honored.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";
import { CANONICAL_ROLES, createTestProject, createUsersForRoles } from "./lib/provision.ts";
import { assignTeamRoles } from "./lib/teamSetup.ts";
import { sweepByRunId } from "./lib/teardown.ts";
import { runScenario } from "./lib/recorder.ts";
import type { RunContext, ScenarioResult } from "./lib/types.ts";
import { ruleScenarios } from "./scenarios/rules.ts";
import { crossCuttingScenarios } from "./scenarios/cross_cutting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // --- auth guard: caller must be an authenticated admin ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await callerClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  const callerId = claims?.claims?.sub as string | undefined;
  if (!callerId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: adminRow } = await svc.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
  if (!adminRow) {
    return new Response(JSON.stringify({ error: "forbidden: admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const projectIds: string[] = [];
  let users: RunContext["users"] = {};
  const results: ScenarioResult[] = [];
  let fatalError: string | null = null;

  try {
    // Provision
    users = await createUsersForRoles(svc, SUPABASE_URL, ANON_KEY, runId, CANONICAL_ROLES);
    const phl = users["Project Hub Lead"];
    const project = await createTestProject(svc, runId, phl.id);
    projectIds.push(project.id);
    // Assign canonical roles to project_team_members BEFORE running scenarios
    // — R1's trigger (auto_create_ora_plan_task) fires on team-member INSERT,
    // and R3/R4/R5's downstream role resolution reads this table.
    await assignTeamRoles(svc, project.id, users);

    const ctx: RunContext = {
      runId,
      serviceClient: svc,
      anonUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
      users,
      project: { id: project.id, code: project.code },
      results: new Map(),
    };

    for (const scn of [...ruleScenarios, ...crossCuttingScenarios]) {
      results.push(await runScenario(scn, ctx));
    }
  } catch (e) {
    fatalError = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e);
    console.error("M11 fatal:", fatalError);
  } finally {
    // Teardown ALWAYS runs — even on partial provision failure.
    const teardown = await sweepByRunId(svc, runId, projectIds);
    return new Response(
      JSON.stringify({ runId, fatalError, results, teardown }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
