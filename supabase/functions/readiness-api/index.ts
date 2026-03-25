import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Expected paths: /readiness-api/projects, /readiness-api/projects/:id/ori, etc.
    const resource = pathParts[1] || '';
    const projectId = pathParts[2] || url.searchParams.get('project_id');
    const subResource = pathParts[3] || '';

    // Authenticate via API key or JWT
    const apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    let supabase;
    let userId: string | null = null;

    if (apiKey) {
      // API key authentication — validate against api_keys table
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // Hash the key and check (simplified — in production use SHA-256)
      const { data: keyData, error: keyError } = await adminClient
        .from('api_keys')
        .select('id, is_active, permissions, rate_limit_per_minute, created_by')
        .eq('key_prefix', apiKey.substring(0, 8))
        .eq('is_active', true)
        .maybeSingle();

      if (keyError || !keyData) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log request
      await adminClient.from('api_request_logs').insert({
        api_key_id: keyData.id,
        endpoint: url.pathname,
        method: req.method,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent'),
      });

      supabase = adminClient;
      userId = keyData.created_by;
    } else if (authHeader) {
      // JWT authentication
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = user.id;
    } else {
      return new Response(JSON.stringify({ error: 'Authentication required. Provide x-api-key or Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route handling
    if (req.method === 'GET') {
      // GET /readiness-api/projects — list projects with latest ORI
      if (resource === 'projects' && !projectId) {
        const { data, error } = await supabase
          .from('projects')
          .select('id, project_title, project_id_prefix, project_id_number, is_active, created_at')
          .eq('is_active', true)
          .order('project_title');

        if (error) throw error;
        return jsonResponse({ projects: data });
      }

      // GET /readiness-api/projects/:id/ori — get ORI scores
      if (resource === 'projects' && projectId && subResource === 'ori') {
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const { data, error } = await supabase
          .from('ori_scores')
          .select('*')
          .eq('project_id', projectId)
          .order('calculated_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return jsonResponse({ scores: data, project_id: projectId });
      }

      // GET /readiness-api/projects/:id/nodes — get readiness nodes
      if (resource === 'projects' && projectId && subResource === 'nodes') {
        const module = url.searchParams.get('module');
        const status = url.searchParams.get('status');
        
        let query = supabase
          .from('readiness_nodes')
          .select('*')
          .eq('project_id', projectId);

        if (module) query = query.eq('module', module);
        if (status) query = query.eq('status', status);

        const { data, error } = await query.order('module').order('label');
        if (error) throw error;
        return jsonResponse({ nodes: data, project_id: projectId });
      }

      // GET /readiness-api/projects/:id/dependencies — get dependency graph
      if (resource === 'projects' && projectId && subResource === 'dependencies') {
        const { data, error } = await supabase
          .from('readiness_dependencies')
          .select('*, from_node:from_node_id(label, module, status), to_node:to_node_id(label, module, status)')
          .eq('project_id', projectId);

        if (error) throw error;
        return jsonResponse({ dependencies: data, project_id: projectId });
      }

      // GET /readiness-api/weight-profiles
      if (resource === 'weight-profiles') {
        const { data, error } = await supabase
          .from('ori_weight_profiles')
          .select('*')
          .order('is_default', { ascending: false });

        if (error) throw error;
        return jsonResponse({ weight_profiles: data });
      }

      // GET /readiness-api/health
      if (resource === 'health') {
        return jsonResponse({
          status: 'ok',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          endpoints: [
            'GET /readiness-api/health',
            'GET /readiness-api/projects',
            'GET /readiness-api/projects/:id/ori',
            'GET /readiness-api/projects/:id/nodes',
            'GET /readiness-api/projects/:id/dependencies',
            'GET /readiness-api/weight-profiles',
            'POST /readiness-api/projects/:id/sync',
            'POST /readiness-api/projects/:id/calculate',
          ],
        });
      }
    }

    // POST endpoints
    if (req.method === 'POST') {
      // POST /readiness-api/projects/:id/sync — sync readiness nodes
      if (resource === 'projects' && projectId && subResource === 'sync') {
        const { data, error } = await supabase.rpc('sync_readiness_nodes', {
          p_project_id: projectId,
        });
        if (error) throw error;
        return jsonResponse({ synced_count: data, project_id: projectId });
      }

      // POST /readiness-api/projects/:id/calculate — calculate ORI
      if (resource === 'projects' && projectId && subResource === 'calculate') {
        const body = await req.json().catch(() => ({}));
        const { data, error } = await supabase.rpc('calculate_ori_score', {
          p_project_id: projectId,
          p_weight_profile_id: body.weight_profile_id || null,
          p_snapshot_type: body.snapshot_type || 'api',
        });
        if (error) throw error;
        return jsonResponse({ result: data, project_id: projectId });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found', available_endpoints: '/readiness-api/health' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
      'Content-Type': 'application/json',
    },
  });
}
