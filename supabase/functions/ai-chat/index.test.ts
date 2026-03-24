import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Helper: sign in as test user and get access token
async function getTestToken(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // Use a known test user — if none exists, we'll test the auth guard
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "admin@orsh.com",
    password: "Admin@123!"
  });
  if (error || !data.session) {
    throw new Error(`Auth failed: ${error?.message || 'no session'}`);
  }
  return data.session.access_token;
}

async function callAiChat(messages: any[], token: string): Promise<string> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`ai-chat returned ${resp.status}: ${text}`);
  }
  // Parse SSE: extract content from data lines
  const lines = text.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]');
  let content = '';
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line.slice(6));
      content += parsed.choices?.[0]?.delta?.content || '';
    } catch { /* skip */ }
  }
  return content;
}

Deno.test("1. Bob CoPilot - PSSR status query", async () => {
  const token = await getTestToken();
  const content = await callAiChat(
    [{ role: "user", content: "What is the overall PSSR status across all active projects?" }],
    token
  );
  console.log("📋 COPILOT RESPONSE:", content.substring(0, 500));
  // Should return something meaningful, not an error
  assertEquals(content.length > 10, true, "Response should not be empty");
});

Deno.test("2. Document Agent - readiness query", async () => {
  const token = await getTestToken();
  const content = await callAiChat(
    [{ role: "user", content: "What is the current document readiness score?" }],
    token
  );
  console.log("📄 DOCUMENT AGENT RESPONSE:", content.substring(0, 500));
  assertEquals(content.length > 10, true, "Response should not be empty");
});

Deno.test("3. PSSR/ORA Agent - checklist summary", async () => {
  const token = await getTestToken();
  const content = await callAiChat(
    [{ role: "user", content: "Show me a summary of PSSR checklist completion" }],
    token
  );
  console.log("🔍 PSSR/ORA AGENT RESPONSE:", content.substring(0, 500));
  assertEquals(content.length > 10, true, "Response should not be empty");
});

Deno.test("4. Error handling - graceful empty data response", async () => {
  const token = await getTestToken();
  const content = await callAiChat(
    [{ role: "user", content: "What is the PSSR status for project NONEXISTENT999?" }],
    token
  );
  console.log("⚠️ ERROR HANDLING RESPONSE:", content.substring(0, 500));
  assertEquals(content.length > 5, true, "Should return a graceful message");
});

Deno.test("5. Agent registry - model_id check", async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from('ai_agent_registry')
    .select('agent_code, model_id, status')
    .in('agent_code', ['copilot', 'document_agent', 'pssr_ora_agent'])
    .order('agent_code');
  
  console.log("🗃️ AGENT REGISTRY:", JSON.stringify(data, null, 2));
  
  if (error) {
    console.log("Registry query error:", error.message);
  }
  
  assertEquals(data?.length, 3, "Should have 3 agent entries");
  for (const agent of data || []) {
    assertEquals(agent.model_id, 'claude-sonnet-4-5', `${agent.agent_code} should use claude-sonnet-4-5`);
  }
});
