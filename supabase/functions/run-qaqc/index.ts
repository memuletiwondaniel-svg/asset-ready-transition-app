// QAQC suite runner — executes every active qaqc_checks row via the
// public.qaqc_run_check(sql) SECURITY DEFINER helper (which forces a
// read-only subtransaction), records one qaqc_runs row, returns summary.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  let triggeredBy: string | null = null;
  try {
    const auth = req.headers.get('Authorization');
    if (auth) {
      const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: auth } },
      });
      const { data } = await anon.auth.getUser();
      triggeredBy = data.user?.id ?? null;
    }
  } catch { /* anonymous run */ }

  const started = Date.now();
  const { data: checks, error: cErr } = await supabase
    .from('qaqc_checks')
    .select('id, category, title, severity, sql, is_active')
    .eq('is_active', true)
    .order('id');
  if (cErr) {
    return new Response(JSON.stringify({ error: cErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: any[] = [];
  let passed = 0, failed = 0, errored = 0;

  for (const chk of checks ?? []) {
    const { data: r, error } = await supabase.rpc('qaqc_run_check', { p_sql: chk.sql });
    if (error) {
      errored++;
      results.push({ id: chk.id, category: chk.category, title: chk.title, severity: chk.severity,
        pass: false, errored: true, failing_count: 0, samples: [], error: error.message, duration_ms: 0 });
      continue;
    }
    const payload = r as any;
    const hasErr = !!payload?.error;
    const count = payload?.failing_count ?? 0;
    const pass = !hasErr && count === 0;
    if (hasErr) errored++;
    else if (pass) passed++;
    else failed++;
    results.push({
      id: chk.id, category: chk.category, title: chk.title, severity: chk.severity,
      pass, errored: hasErr, failing_count: count,
      samples: payload?.samples ?? [],
      error: payload?.error ?? null,
      duration_ms: payload?.duration_ms ?? 0,
    });
  }

  const duration_ms = Date.now() - started;
  const { data: run, error: rErr } = await supabase
    .from('qaqc_runs')
    .insert({
      triggered_by: triggeredBy,
      results,
      total_checks: results.length,
      passed, failed, errored,
      duration_ms,
    })
    .select('id, run_at')
    .single();
  if (rErr) {
    return new Response(JSON.stringify({ error: rErr.message, results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    run_id: run.id, run_at: run.run_at,
    total_checks: results.length, passed, failed, errored, duration_ms,
    results,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
