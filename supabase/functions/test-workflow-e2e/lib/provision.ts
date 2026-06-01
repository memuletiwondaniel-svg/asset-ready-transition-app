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
  "Sr ORA Engr",
  "CMMS Lead",
] as const;
export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function createTestProject(
  svc: SupabaseClient,
  runId: string,
  creatorUserId: string,
): Promise<{ id: string; code: string }> {
  const code = `M11-${runId.slice(0, 8)}`;
  const { data, error } = await svc
    .from("projects")
    .insert({
      project_title: `M11 Harness ${runId}`,
      project_id_prefix: "M11",
      project_id_number: runId.slice(0, 6),
      is_active: true,
      is_test_project: true,           // REQUIRED — Mig 8 facet enforces this for harness writes
      created_by: creatorUserId,
    })
    .select("id")
    .single();
  if (error) throw new Error(`createTestProject: ${error.message}`);
  return { id: data!.id as string, code };
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
