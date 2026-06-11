// Provisioning helpers for the M11 harness.
//
// All test users get email_confirm:true (no confirmation email is attempted —
// the .test.local domain is non-routable so any send would also be safe, but
// belt-and-braces). Emails follow `m11-<runId>-<role-slug>@test.local`; the
// Mig 8 RLS facet keys is_harness_user() off this exact pattern.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.52.0";

export const CANONICAL_ROLES = [
  "Project Hub Lead",
  "Dep. Plant Director",
  "Construction Lead",
  "Commissioning Lead",
  "ORA Lead",
  "Snr ORA Engr",
  "CMMS Lead",
] as const;
export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Create a throwaway plant scoped to this run. Required because the P2A
 * trigger `create_p2a_lead_reviews` resolves DPD via
 * `resolve_p2a_approver` → `find_deputy_plant_director(plant_name)`,
 * which joins `projects.plant_id → plant.name` and matches
 * `profiles.position ILIKE '%Dep. Plant Director - <plant_name>%'`.
 * Without a plant + matching DPD position the P2A seed row is never
 * written and R11 fails ("seed missing for role=Dep. Plant Director").
 * The plant is removed in `sweepByRunId`.
 */
export async function createTestPlant(
  svc: SupabaseClient,
  runId: string,
): Promise<{ id: string; name: string }> {
  const name = `M11 Harness Plant ${runId}`;
  const { data, error } = await svc
    .from("plant")
    .insert({ name, description: `Harness throwaway plant for run ${runId}`, is_active: true })
    .select("id,name")
    .single();
  if (error) throw new Error(`createTestPlant: ${error.message}`);
  return { id: data!.id as string, name: data!.name as string };
}

export async function createTestProject(
  svc: SupabaseClient,
  runId: string,
  creatorUserId: string,
  plantId?: string,
): Promise<{ id: string; code: string }> {
  // project_id_prefix is CHECK-constrained to ('DP','ST','MoC'); use 'DP'.
  // Derive a numeric-only suffix from runId so project_code is `DP-<digits>`.
  const num = parseInt(runId.replace(/[^0-9]/g, "").slice(0, 6) || "0", 10).toString().padStart(6, "9");
  const code = `DP-${num}`;
  const { data, error } = await svc
    .from("projects")
    .insert({
      project_title: `M11 Harness ${runId}`,
      project_id_prefix: "DP",
      project_id_number: num,
      is_active: true,
      is_test_project: true,           // REQUIRED — Mig 8 facet enforces this for harness writes
      created_by: creatorUserId,
      plant_id: plantId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`createTestProject: ${error.message}`);
  return { id: data!.id as string, code };
}

/**
 * Stamp the DPD user's profile.position so `find_deputy_plant_director`
 * resolves them on the harness plant. The resolver matches
 * `position ILIKE '%Dep. Plant Director - <plantName>%'`.
 */
export async function setDeputyPlantDirectorPosition(
  svc: SupabaseClient,
  dpdUserId: string,
  plantName: string,
): Promise<void> {
  const position = `Dep. Plant Director - ${plantName}`;
  const { error } = await svc
    .from("profiles")
    .update({ position, is_active: true })
    .eq("user_id", dpdUserId);
  if (error) throw new Error(`setDeputyPlantDirectorPosition: ${error.message}`);
}


export async function createUsersForRoles(
  svc: SupabaseClient,
  anonUrl: string,
  anonKey: string,
  runId: string,
  roles: readonly CanonicalRole[],
): Promise<Record<string, { id: string; email: string; jwt: string }>> {
  const out: Record<string, { id: string; email: string; jwt: string }> = {};
  for (const role of roles) {
    const email = `m11-${runId}-${slug(role)}@test.local`;
    const password = `M11!${runId}!${slug(role)}`;
    // email_confirm:true — see header note; prevents any confirmation-email side effect.
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { harness_role: role, harness_run_id: runId },
    });
    if (createErr || !created?.user) {
      throw new Error(`createUser(${role}): ${createErr?.message ?? "no user"}`);
    }
    // Register membership BEFORE signing in so is_harness_user() resolves true
    // on the very first authenticated request. Service-role insert bypasses RLS.
    const { error: memErr } = await svc
      .from("harness_users")
      .insert({ user_id: created.user.id, run_id: runId });
    if (memErr) throw new Error(`harness_users insert(${role}): ${memErr.message}`);

    // Mint a real session JWT for this user so RLS sees them as authenticated.
    const userClient = createClient(anonUrl, anonKey);
    const { data: signed, error: signErr } = await userClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !signed?.session?.access_token) {
      throw new Error(`signIn(${role}): ${signErr?.message ?? "no session"}`);
    }
    out[role] = { id: created.user.id, email, jwt: signed.session.access_token };

  }
  return out;
}

/** Returns a Supabase client whose RLS context is the given role's user. */
export function clientAs(
  anonUrl: string,
  anonKey: string,
  jwt: string,
): SupabaseClient {
  return createClient(anonUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
