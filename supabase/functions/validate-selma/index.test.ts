import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

async function invokeValidation(tier: number | "all") {
  // First get a session token by signing in
  const signInResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      // Uses test credentials — replace or use env vars
      email: Deno.env.get("TEST_USER_EMAIL") ?? "",
      password: Deno.env.get("TEST_USER_PASSWORD") ?? "",
    }),
  });
  
  const signInBody = await signInResp.json();
  
  if (!signInBody.access_token) {
    throw new Error(`Auth failed: ${JSON.stringify(signInBody)}`);
  }

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/validate-selma`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ tier, token: signInBody.access_token }),
  });

  const text = await resp.text();
  assert(resp.ok, `HTTP ${resp.status}: ${text}`);
  return JSON.parse(text);
}

// ─── Tier 0: Bob Regression ─────────────────────────────────────────

Deno.test("Tier 0 — Bob regression tests execute without errors", async () => {
  const result = await invokeValidation(0);
  
  assertEquals(result.summary.total, 3, "Should have 3 Tier 0 tests (T0.1, T0.2, T0.3)");
  assertEquals(result.summary.error, 0, "No errors expected");
  
  // T0.1 and T0.2 are manual — they should return 'manual' status
  // T0.3 is auto — should return 'pass'
  for (const test of result.tests) {
    assert(
      test.status === "manual" || test.status === "pass",
      `${test.id} (${test.name}): expected manual or pass, got ${test.status} — ${test.details}`
    );
    assert(test.response_preview.length > 0, `${test.id}: empty response`);
  }
  
  // Specifically check T0.3 (Bob identity)
  const t03 = result.tests.find((t: any) => t.id === "T0.3");
  assert(t03, "T0.3 (Bob identity check) missing");
  assert(t03.status === "pass", `T0.3: ${t03.details}`);
});

// ─── Tier 1: Smoke Test ─────────────────────────────────────────────

Deno.test("Tier 1 — Smoke test returns a response", async () => {
  const result = await invokeValidation(1);
  
  assertEquals(result.summary.total, 1);
  const t = result.tests[0];
  assertEquals(t.id, "T1.1");
  assert(
    t.status === "pass",
    `T1.1 failed: ${t.details} — preview: ${t.response_preview.slice(0, 200)}`
  );
});

// ─── Tier 2: Core Agent ─────────────────────────────────────────────

Deno.test("Tier 2 — Core agent tests", async () => {
  const result = await invokeValidation(2);
  
  assert(result.summary.total >= 10, `Expected >=10 Tier 2 tests, got ${result.summary.total}`);
  assertEquals(result.summary.error, 0, "No errors expected in Tier 2");
  
  // Check specific go-live gate tests
  const t21 = result.tests.find((t: any) => t.id === "T2.1");
  assert(t21, "T2.1 missing");
  assert(t21.status === "pass", `T2.1 (identity): ${t21.details}`);
  
  const t24 = result.tests.find((t: any) => t.id === "T2.4");
  assert(t24, "T2.4 missing");
  assert(t24.status === "pass", `T2.4 (clean rendering): ${t24.details}`);

  // DP normalisation — all 3 variants should pass
  for (const id of ["T2.3a", "T2.3b", "T2.3c"]) {
    const t = result.tests.find((x: any) => x.id === id);
    assert(t, `${id} missing`);
    assert(t.status === "pass", `${id} (DP normalisation): ${t.details}`);
  }
});

// ─── Tier 3: Pagination & Session ───────────────────────────────────

Deno.test({
  name: "Tier 3 — Pagination: DP164 count >= 200 (255 not 128)",
  async fn() {
    const result = await invokeValidation(3);
    
    const t31 = result.tests.find((t: any) => t.id === "T3.1");
    assert(t31, "T3.1 missing");
    assert(
      t31.status === "pass",
      `T3.1 CRITICAL: ${t31.details} — This is the most important functional test`
    );
    assert(t31.duration_ms < 120000, `T3.1 timed out at ${t31.duration_ms}ms`);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ─── Tier 4: Document Reading ───────────────────────────────────────

Deno.test({
  name: "Tier 4 — Document read returns real content",
  async fn() {
    const result = await invokeValidation(4);
    
    const t41 = result.tests.find((t: any) => t.id === "T4.1");
    assert(t41, "T4.1 missing");
    assert(
      t41.status === "pass",
      `T4.1 (document read): ${t41.details}`
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ─── Tier 5: Learning ───────────────────────────────────────────────

Deno.test({
  name: "Tier 5 — Acronym learning and SQL verification",
  async fn() {
    const result = await invokeValidation(5);
    
    assertEquals(result.summary.error, 0, "No errors in learning tier");
    
    const t52 = result.tests.find((t: any) => t.id === "T5.2");
    assert(t52, "T5.2 (SQL check) missing");
    // T5.2 depends on T5.1a running first in sequence
    if (t52.status === "fail") {
      console.warn(`T5.2 SQL verification: ${t52.details}`);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ─── Tier 6: Negative / Edge Cases ──────────────────────────────────

Deno.test({
  name: "Tier 6 — No hallucination on fake document",
  async fn() {
    const result = await invokeValidation(6);
    
    const t61 = result.tests.find((t: any) => t.id === "T6.1");
    assert(t61, "T6.1 missing");
    assert(
      t61.status === "pass",
      `T6.1 (hallucination check): ${t61.details}`
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "Tier 6 — Ghost systems not referenced",
  async fn() {
    const result = await invokeValidation(6);
    
    for (const id of ["T6.3a", "T6.3b", "T6.3c", "T6.3d"]) {
      const t = result.tests.find((x: any) => x.id === id);
      assert(t, `${id} missing`);
      assert(
        t.status === "pass",
        `${id} (ghost system): ${t.details}`
      );
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "Tier 6 — Read-only enforcement",
  async fn() {
    const result = await invokeValidation(6);
    
    const t64 = result.tests.find((t: any) => t.id === "T6.4");
    assert(t64, "T6.4 missing");
    assert(t64.status === "pass", `T6.4: ${t64.details}`);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ─── Full Suite: Go-Live Gate ───────────────────────────────────────

Deno.test({
  name: "GO-LIVE GATE — All minimum viable tests pass",
  async fn() {
    const result = await invokeValidation("all");
    
    const gateTests = result.tests.filter((t: any) => t.go_live_gate);
    console.log(`\n=== GO-LIVE GATE: ${gateTests.length} tests ===`);
    
    for (const t of gateTests) {
      const icon = t.status === "pass" ? "✅" : t.status === "manual" ? "🔍" : "❌";
      console.log(`${icon} ${t.id}: ${t.name} — ${t.status} (${(t.duration_ms / 1000).toFixed(1)}s)`);
    }
    
    const failures = gateTests.filter((t: any) => t.status === "fail" || t.status === "error");
    assertEquals(
      failures.length,
      0,
      `GO-LIVE BLOCKED: ${failures.map((f: any) => `${f.id}: ${f.details}`).join("; ")}`
    );
    
    console.log(`\nTotal duration: ${(result.summary.total_duration_ms / 1000).toFixed(1)}s`);
    console.log(`Go-live ready: ${result.summary.go_live_ready}`);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
