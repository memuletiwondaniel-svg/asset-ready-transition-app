// Phase B parser + contract unit/fixture tests.
//
// These guard the three RadGrid bugs we just hand-fixed (greedy
// master-table close, <th> vs <tr> headers, command-table tbody) plus
// the &nbsp;-skip and the DAC fanout. Fixtures are MINIMAL synthetic
// snapshots of the real response shapes — recorded structurally rather
// than as 200 KB blobs so updates stay reviewable.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  parseRadGridTable,
  parseRadAjaxDelta,
} from "../_shared/gocompletions-auth.ts";
import {
  cleanCellText,
  discoverSearchPostbackTarget,
  isEmptyPlaceholderCell,
  parseItrCode,
  stripInputSuffix,
  HANDOVER_CERTS,
  CANARY_ORACLE,
} from "../_shared/gohub-contract.ts";

// ─── Pure-function units ─────────────────────────────────────

Deno.test("parseItrCode: BGC-{disc}{digits}{A|B}", () => {
  assertEquals(parseItrCode("BGC-I01A"), { discipline: "I", ab_phase: "A" });
  assertEquals(parseItrCode("BGC-P12B"), { discipline: "P", ab_phase: "B" });
  assertEquals(parseItrCode("BGC-M999A"), { discipline: "M", ab_phase: "A" });
  // discipline derived from BGC- prefix, ab from suffix
  assertEquals(parseItrCode("bgc-e7a"), { discipline: "E", ab_phase: "A" });
});

Deno.test("parseItrCode: malformed codes are rejected (logged loudly, not mis-bucketed)", () => {
  assertEquals(parseItrCode(""), null);
  assertEquals(parseItrCode("BGC-I01"), null);     // no A/B suffix
  assertEquals(parseItrCode("BGC-01A"), null);     // no discipline
  assertEquals(parseItrCode("XYZ-I01A"), null);    // wrong prefix
  assertEquals(parseItrCode("BGC-I01C"), null);    // C is not A/B
});

Deno.test("isEmptyPlaceholderCell skips &nbsp; / empty / whitespace", () => {
  assert(isEmptyPlaceholderCell("&nbsp;"));
  assert(isEmptyPlaceholderCell(""));
  assert(isEmptyPlaceholderCell("   "));
  assert(isEmptyPlaceholderCell("<span>&nbsp;</span>"));
  assert(isEmptyPlaceholderCell(null));
  assert(!isEmptyPlaceholderCell("MCC-08X-001"));
  assert(!isEmptyPlaceholderCell("&nbsp;X&nbsp;"));
});

Deno.test("cleanCellText strips html + &nbsp;", () => {
  assertEquals(cleanCellText("<b>BGC-I01A</b>"), "BGC-I01A");
  assertEquals(cleanCellText("&nbsp;27 May 2019&nbsp;"), "27 May 2019");
  assertEquals(cleanCellText(null), "");
});

Deno.test("stripInputSuffix removes trailing _input only", () => {
  assertEquals(stripInputSuffix("ctl00$Foo$SearchButton_input"), "ctl00$Foo$SearchButton");
  assertEquals(stripInputSuffix("ctl00$Foo$SearchButton"), "ctl00$Foo$SearchButton");
});

Deno.test("discoverSearchPostbackTarget prefers PrimarySearchCriteria scope", () => {
  const html = `
    <input name="ctl00$Header$Quick$SearchButton_input" />
    <input name="ctl00$MasterRadPanelBar$i0$i7$PrimarySearchCriteria$SearchButton_input" />
  `;
  assertEquals(
    discoverSearchPostbackTarget(html),
    "ctl00$MasterRadPanelBar$i0$i7$PrimarySearchCriteria$SearchButton",
  );
});

Deno.test("discoverSearchPostbackTarget returns null when no SearchButton rendered", () => {
  assertEquals(discoverSearchPostbackTarget("<form><input name='foo'/></form>"), null);
});

Deno.test("HANDOVER_CERTS covers all 8 cert types with non-empty GUIDs", () => {
  assertEquals(HANDOVER_CERTS.length, 8);
  const expected = ["MCC", "MCC-DAC", "PCC", "PCDAC", "RFC", "RFSU", "RFOC", "FAC"];
  assertEquals(HANDOVER_CERTS.map((c) => c.cert_type).sort(), expected.sort());
  for (const c of HANDOVER_CERTS) assert(/^[0-9a-f-]{36}$/.test(c.typeId), `bad GUID for ${c.cert_type}`);
  // FAC alone uses project strategy.
  const fac = HANDOVER_CERTS.find((c) => c.cert_type === "FAC")!;
  assertEquals(fac.queryStrategy, "project");
  assertEquals(fac.groupBy, "Project");
});

Deno.test("CANARY_ORACLE expected cert dates are immutable 2019 facts", () => {
  assertEquals(CANARY_ORACLE.expected_cert_dates.MCC, "2019-05-27");
  assertEquals(CANARY_ORACLE.expected_cert_dates.PCC, "2019-08-13");
  assertEquals(CANARY_ORACLE.expected_cert_dates.RFC, "2019-08-24");
});

// ─── Fixtures: cert RadAjax delta → grid rows ────────────────

// Synthetic but structurally faithful: a RadAjax pipe-delimited delta
// containing one updatePanel that holds an rgMasterTable with a nested
// rgCommandTable (the case that broke the old non-greedy regex), a
// `<th class="rgHeader">` header row, one legitimate cert row, and one
// `&nbsp;` placeholder row (should map to 0 persisted rows).
function makeCertDeltaFixture(): string {
  const panel = `
    <div id="UpdatePanel1">
      <table class="rgMasterTable">
        <thead>
          <tr>
            <th class="rgHeader">Sub System</th>
            <th class="rgHeader">Ref</th>
            <th class="rgHeader">Generated Date</th>
            <th class="rgHeader">Accepted Date</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><table class="rgCommandTable"><tbody><tr><td>nested</td></tr></tbody></table></td></tr>
          <tr class="rgRow">
            <td>C013-DP18A-08X</td><td>MCC-08X-001</td><td>10 May 2019</td><td>27 May 2019</td>
          </tr>
          <tr class="rgAltRow">
            <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
          </tr>
        </tbody>
      </table>
    </div>`.trim();
  return `${panel.length}|updatePanel|UpdatePanel1|${panel}|`;
}

Deno.test("FIXTURE cert RadAjax delta → grid rows + &nbsp; row maps to 0 persisted", () => {
  const delta = makeCertDeltaFixture();
  const html = parseRadAjaxDelta(delta);
  assert(html.includes("rgMasterTable"), "delta parser should extract updatePanel content");
  const rows = parseRadGridTable(html);
  assertEquals(rows.length, 2, "both rgRow + rgAltRow extracted");
  // Real cert row
  assertEquals(rows[0]["Sub System"], "C013-DP18A-08X");
  assertEquals(rows[0]["Ref"], "MCC-08X-001");
  assertEquals(rows[0]["Accepted Date"], "27 May 2019");
  // Placeholder row → would be skipped at persist time via isEmptyPlaceholderCell on Ref
  assert(isEmptyPlaceholderCell(rows[1]["Ref"]), "placeholder row Ref must be empty after skip rule");
  // Sanity: nested rgCommandTable bodies did NOT leak in as data rows.
  for (const r of rows) assert(!String(r["Sub System"] ?? "").includes("nested"));
});

// ─── Fixture: DAC fanout (per-discipline rows) ───────────────

Deno.test("FIXTURE DAC HandoverSearch returns per-discipline rows with discipline populated", () => {
  const panel = `
    <table class="rgMasterTable">
      <thead><tr>
        <th class="rgHeader">Sub System</th>
        <th class="rgHeader">Discipline</th>
        <th class="rgHeader">Ref</th>
        <th class="rgHeader">Accepted Date</th>
      </tr></thead>
      <tbody>
        <tr class="rgRow"><td>C013-DP18A-08X</td><td>I</td><td>MCCDAC-08X-I</td><td>27 May 2019</td></tr>
        <tr class="rgAltRow"><td>C013-DP18A-08X</td><td>M</td><td>MCCDAC-08X-M</td><td>27 May 2019</td></tr>
        <tr class="rgRow"><td>C013-DP18A-08X</td><td>P</td><td>MCCDAC-08X-P</td><td>27 May 2019</td></tr>
      </tbody>
    </table>`;
  const rows = parseRadGridTable(panel);
  assertEquals(rows.length, 3);
  assertEquals(new Set(rows.map((r) => r["Discipline"])), new Set(["I", "M", "P"]));
});

// ─── Fixture: punch grid Category + status ───────────────────

Deno.test("FIXTURE punch grid → Category A/B + open/closed mapping", () => {
  const panel = `
    <table class="rgMasterTable">
      <thead><tr>
        <th class="rgHeader">Punchlist</th>
        <th class="rgHeader">Item</th>
        <th class="rgHeader">Category</th>
        <th class="rgHeader">Cleared Date</th>
        <th class="rgHeader">Accepted Date</th>
      </tr></thead>
      <tbody>
        <tr class="rgRow"><td>PL-08X-1</td><td>1</td><td>A</td><td>1 Jun 2019</td><td>2 Jun 2019</td></tr>
        <tr class="rgAltRow"><td>PL-08X-1</td><td>2</td><td>B</td><td>&nbsp;</td><td>&nbsp;</td></tr>
      </tbody>
    </table>`;
  const rows = parseRadGridTable(panel);
  assertEquals(rows.length, 2);
  // Category A row is closed (both dates present)
  assertEquals(rows[0]["Category"], "A");
  assert(!isEmptyPlaceholderCell(rows[0]["Cleared Date"]));
  assert(!isEmptyPlaceholderCell(rows[0]["Accepted Date"]));
  // Category B row is open
  assertEquals(rows[1]["Category"], "B");
  assert(isEmptyPlaceholderCell(rows[1]["Cleared Date"]));
});

// ─── Fixture: 33-row GetSubSystemTagITRList payload ──────────

Deno.test("FIXTURE 33-row ITR payload parses to 33 instances, 20A/13B", () => {
  const rows = [
    ...Array.from({ length: 20 }, (_, i) => ({ ITR: `BGC-I${String(i + 1).padStart(2, "0")}A` })),
    ...Array.from({ length: 13 }, (_, i) => ({ ITR: `BGC-P${String(i + 1).padStart(2, "0")}B` })),
  ];
  let a = 0, b = 0, bad = 0;
  for (const r of rows) {
    const p = parseItrCode(r.ITR);
    if (!p) { bad++; continue; }
    if (p.ab_phase === "A") a++; else b++;
  }
  assertEquals(rows.length, 33);
  assertEquals(a, 20);
  assertEquals(b, 13);
  assertEquals(bad, 0);
});

// ─── Regression: depth-counting master-table extraction ──────

Deno.test("REGRESSION rgMasterTable extraction not truncated by nested </table>", () => {
  // Old non-greedy regex closed at the FIRST </table>, so a row that
  // came AFTER a nested command table was lost.
  const html = `
    <table class="rgMasterTable">
      <tr><td><table><tr><td>x</td></tr></table></td></tr>
      <tr class="rgRow"><td>AFTER_NESTED</td></tr>
    </table>`;
  const rows = parseRadGridTable(html);
  assert(rows.some((r) => Object.values(r).includes("AFTER_NESTED")), "row after nested </table> must still parse");
});

Deno.test("REGRESSION delta passthrough when payload is not a delta", () => {
  const fullHtml = "<html><body>oops, full page</body></html>";
  assertEquals(parseRadAjaxDelta(fullHtml), fullHtml);
});
