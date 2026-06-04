// V12 unit tests — exercises pure functions against REAL captured Assai fixtures.
import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  normalizeSearchTerm,
  buildNumberVariants,
  classifyResponse,
  mapFormFields,
  parseDocuments,
  parseDetailPage,
  extractHiddenFields,
} from "./search-engine.ts";

const FIX = new URL("./fixtures/", import.meta.url).pathname;
const read = (name: string) => Deno.readTextFileSync(FIX + name);

// ─────────────── normalizeSearchTerm ───────────────
Deno.test("normalizeSearchTerm: trims + collapses whitespace", () => {
  assertEquals(normalizeSearchTerm("  hello   world  ").normalized, "hello world");
});
Deno.test("normalizeSearchTerm: unicode dashes → ascii hyphen", () => {
  for (const d of ["\u2010", "\u2013", "\u2014", "\u2212"]) {
    assertEquals(normalizeSearchTerm(`DP${d}300`).normalized, "DP-300");
  }
});
Deno.test("normalizeSearchTerm: smart quotes normalised", () => {
  assertEquals(normalizeSearchTerm("\u201Cbasis\u201D").normalized, '"basis"');
});
Deno.test("normalizeSearchTerm: strips stray wildcards", () => {
  assertEquals(normalizeSearchTerm("%6529-%").normalized, "6529-");
});
Deno.test("normalizeSearchTerm: uppercases doc-number-shaped input", () => {
  assertEquals(normalizeSearchTerm("dp-300a").normalized, "DP-300A");
});
Deno.test("normalizeSearchTerm: prose left as-is in case", () => {
  assertEquals(normalizeSearchTerm("basis").normalized, "basis");
});

// ─────────────── buildNumberVariants ───────────────
Deno.test("buildNumberVariants: cascade order & dedup", () => {
  const v = buildNumberVariants("6529");
  assertEquals(v.map(x => x.mode), ["asgiven", "contains", "prefix"]);
  // 'bare' equals 'asgiven' for "6529" so deduped
});
Deno.test("buildNumberVariants: keeps wildcard variants distinct", () => {
  const v = buildNumberVariants("6529-%");
  const modes = v.map(x => x.mode);
  assert(modes.includes("asgiven"));
  assert(modes.includes("contains"));
});

// ─────────────── classifyResponse ───────────────
Deno.test("classifyResponse: no_session — real 2368-byte fixture", () => {
  const html = read("no_session_post.html");
  assertEquals(html.length, 2368);
  assertEquals(classifyResponse(html, 200), "no_session");
});
Deno.test("classifyResponse: login — real login_page fixture", () => {
  const html = read("login_page.html");
  const cls = classifyResponse(html, 200);
  assert(cls === "login" || cls === "error", `login fixture classified as ${cls}`);
});
Deno.test("classifyResponse: empty_grid — real Assai empty result page", () => {
  const html = read("result_empty_grid.html");
  assertEquals(classifyResponse(html, 200), "empty_grid");
});
Deno.test("classifyResponse: results — populated 2-row grid", () => {
  assertEquals(classifyResponse(read("result_populated_type8203.html"), 200), "results");
});
Deno.test("classifyResponse: results — populated 15-row description=basis grid", () => {
  assertEquals(classifyResponse(read("result_populated_desc_basis.html"), 200), "results");
});
Deno.test("classifyResponse: results — single-doc grid", () => {
  assertEquals(classifyResponse(read("result_single_basis_doc.html"), 200), "results");
});
Deno.test("classifyResponse: error on HTTP 500", () => {
  assertEquals(classifyResponse("<html>err</html>", 500), "error");
});

// ─────────────── mapFormFields ───────────────
Deno.test("mapFormFields: DES_DOC form resolves all expected targets", () => {
  const m = mapFormFields(read("form_DES_DOC.html"));
  assertEquals(m.map.number, "number");
  assertEquals(m.map.description, "description");
  assertEquals(m.map.document_type, "document_type");
  assertEquals(m.map.discipline_code, "discipline_code");
  assertEquals(m.map.status_code, "status_code");
  assertEquals(m.map.company_code, "company_code");
  assertEquals(m.map.purchase_code, "purchase_code");
  assertEquals(m.unresolved.length, 0);
  assert(m.allNames.length > 50, `expected >50 fields, got ${m.allNames.length}`);
});
Deno.test("mapFormFields: SUP_DOC form resolves all expected targets", () => {
  const m = mapFormFields(read("form_SUP_DOC.html"));
  assertEquals(m.map.number, "number");
  assertEquals(m.unresolved.length, 0);
});

// ─────────────── parseDocuments ───────────────
Deno.test("parseDocuments: 2-row type=8203 grid returns basis-of-design doc", () => {
  const docs = parseDocuments(read("result_populated_type8203.html"), "DES_DOC");
  assertEquals(docs.length, 2);
  const basis = docs.find(d => d.document_number?.includes("AA-8203-00001"));
  assert(basis, "basis-of-design doc not found in 2-row grid");
});
Deno.test("parseDocuments: 15-row description=basis grid includes basis-of-design doc", () => {
  const docs = parseDocuments(read("result_populated_desc_basis.html"), "DES_DOC");
  assertEquals(docs.length, 15);
  assert(docs.some(d => d.document_number?.includes("AA-8203-00001")));
});
Deno.test("parseDocuments: empty grid returns []", () => {
  assertEquals(parseDocuments(read("result_empty_grid.html"), "DES_DOC").length, 0);
});

// ─────────────── extractHiddenFields ───────────────
Deno.test("extractHiddenFields: DES_DOC form includes >5 valued hidden fields", () => {
  const fs = extractHiddenFields(read("form_DES_DOC.html"));
  const hiddenWithValue = fs.filter(f => f.type === "hidden" && f.value);
  assert(hiddenWithValue.length >= 5, `expected ≥5 valued hidden fields, got ${hiddenWithValue.length}`);
});

// ─────────────── parseDetailPage ───────────────
Deno.test("parseDetailPage: returns null on populated grid (NOT a detail page)", () => {
  assertEquals(parseDetailPage(read("result_populated_type8203.html")), null);
});

// ─────────────── DP-300 canonical: title="basis" surfaces the doc ───────────────
Deno.test("DP-300 canonical: description=basis grid surfaces basis-of-design doc", () => {
  const html = read("result_populated_desc_basis.html");
  assertEquals(classifyResponse(html, 200), "results");
  const docs = parseDocuments(html, "DES_DOC");
  const basis = docs.find(d => d.document_number?.includes("AA-8203-00001"));
  assert(basis, "DP-300 canonical doc not surfaced by description=basis path");
});
Deno.test("DP-300 canonical: document_type=8203 grid surfaces basis-of-design doc", () => {
  const html = read("result_populated_type8203.html");
  assertEquals(classifyResponse(html, 200), "results");
  const docs = parseDocuments(html, "DES_DOC");
  assert(docs.find(d => d.document_number?.includes("AA-8203-00001")));
});

console.log("[V12 tests] all defined.");
