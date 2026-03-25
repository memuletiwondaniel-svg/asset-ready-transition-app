import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiter for unauthenticated requests
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract IP and User-Agent from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null;
    const userAgent = req.headers.get('user-agent') || null;

    const body = await req.json();
    const {
      category, action, severity, description,
      entity_type, entity_id, entity_label,
      metadata, old_values, new_values,
      user_email: bodyEmail,
    } = body;

    if (!category || !action || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: category, action, description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try JWT auth
    let userId: string | null = null;
    let userEmail: string | null = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
      if (!claimsError && claims?.claims) {
        userId = claims.claims.sub as string;
        userEmail = (claims.claims as any).email as string || null;
      }
    }

    // If no JWT, only allow login_failed (with rate limiting)
    if (!userId) {
      if (action !== 'login_failed') {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Rate limit unauthenticated writes
      if (!checkRateLimit(ipAddress || 'unknown')) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userEmail = bodyEmail || null;
    }

    // Insert using service role client
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await serviceClient.from('audit_logs').insert({
      user_id: userId,
      user_email: userEmail,
      category,
      action,
      severity: severity || 'info',
      description,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      entity_label: entity_label || null,
      metadata: metadata || null,
      old_values: old_values || null,
      new_values: new_values || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('write-audit-log error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
