import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXCLUDE_EMAIL = 'd.memuletiwon@gascompany.iq';

function derivePassword(firstName: string | null, email: string): string {
  let base = (firstName || email.split('@')[0] || 'user').toLowerCase();
  base = base.replace(/[^a-z]/g, '');
  if (!base) base = 'user';
  const cap = base[0].toUpperCase() + base.slice(1);
  // Pad zeros to total length 11, then trailing '!' => length >= 12
  const zerosNeeded = Math.max(4, 11 - cap.length);
  return cap + '0'.repeat(zerosNeeded) + '!';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !requestingUser) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: adminRole } = await admin.from('user_roles')
      .select('role').eq('user_id', requestingUser.id).eq('role', 'admin').maybeSingle();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dryRun;
    const limit = typeof body.limit === 'number' ? body.limit : null;

    // Fetch all profiles paginated (avoid 1000-row default cap)
    type Row = { user_id: string; email: string; first_name: string | null };
    const profiles: Row[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await admin
        .from('profiles')
        .select('user_id, email, first_name')
        .not('user_id', 'is', null)
        .not('email', 'is', null)
        .range(from, from + pageSize - 1);
      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to load profiles', detail: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!data || data.length === 0) break;
      profiles.push(...(data as Row[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // Dedupe by user_id, exclude protected email
    const byUser = new Map<string, Row>();
    for (const r of profiles) {
      if (!r.user_id) continue;
      if (r.email && r.email.toLowerCase() === EXCLUDE_EMAIL) continue;
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, r);
    }
    let targets = [...byUser.values()];
    if (limit) targets = targets.slice(0, limit);

    const results: Array<{ user_id: string; email: string; password: string; ok: boolean; error?: string }> = [];
    let success = 0, failed = 0, skipped = 0;

    for (const t of targets) {
      const password = derivePassword(t.first_name, t.email);
      if (dryRun) {
        results.push({ user_id: t.user_id, email: t.email, password, ok: true });
        continue;
      }
      const { error } = await admin.auth.admin.updateUserById(t.user_id, { password });
      if (error) {
        failed++;
        results.push({ user_id: t.user_id, email: t.email, password, ok: false, error: error.message });
      } else {
        success++;
        results.push({ user_id: t.user_id, email: t.email, password, ok: true });
        await admin.from('profiles')
          .update({ password_change_required: true, password_changed_at: new Date().toISOString() })
          .eq('user_id', t.user_id);
      }
    }

    await admin.from('activity_logs').insert({
      user_id: requestingUser.id,
      activity_type: 'admin_bulk_password_reset',
      description: `Bulk password reset: ${success} ok / ${failed} failed (excluded ${EXCLUDE_EMAIL})`,
      entity_type: 'user',
      entity_id: requestingUser.id,
      metadata: { success, failed, skipped, dryRun },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      ok: true, dryRun, total: targets.length, success, failed, skipped,
      excluded: EXCLUDE_EMAIL, results,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('admin-bulk-reset-passwords error', e);
    return new Response(JSON.stringify({ error: (e as Error).message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
