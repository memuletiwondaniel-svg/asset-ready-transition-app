/**
 * GoCompletions shared contract.
 *
 * SINGLE SOURCE OF TRUTH for every reverse-engineered magic value the
 * GoCompletions ASMX + WebForms surfaces require. Import from here — do
 * not hardcode GUIDs, param strings, header recipes, or skip rules at
 * call sites. Every constant carries a why-comment citing the evidence
 * that motivated it so a future maintainer can re-validate the fix.
 */

// ─── 1. ASMX call parameters ─────────────────────────────────
//
// Reverse-engineered from live traffic; wrong/missing values fail
// silently (`[]` or HTTP 500) instead of erroring loudly. Always pass
// these via the helpers in this module — never inline the literals.

/**
 * GetSystems requires `itrClass`. Sending `{}` returns 500. Sending
 * "A" or "B" returns `[]`. Only "All" returns the populated rollup.
 * A/B split is derived from the ITR-code suffix downstream — never from
 * this param. Same trap class as `GetSubSystemTagITRList.className`.
 */
export const ITR_CLASS_ALL = "All";

/**
 * GetSubSystemTagITRList requires `className`. "A"/"B"/"" silently
 * return [] with a 500. Use "All", then derive A/B from the suffix.
 */
export const CLASS_NAME_ALL = "All";

/**
 * ASMX responses are wrapped in `{ d: <payload> }` (System.Web.Script
 * legacy serializer). Unwrap before parsing. Already handled by
 * `callMethod` — documented here so a new caller knows the shape.
 */
export const ASMX_D_WRAPPER_KEY = "d";

// ─── 2. WebForms RadAjax async-postback recipe ───────────────
//
// HandoverSearch / TagSearch / PunchlistItemSearch are Telerik
// RadAjaxPanel-wrapped WebForms pages. The Search button fires an
// MS-AJAX partial postback (single XHR) — NOT a full-page postback.
// Captured from the live working XHR (MCC, WEST QURNA):

/** Form field: tells the server this is an async postback. */
export const ASYNC_POST_FIELD = "__ASYNCPOST";
export const ASYNC_POST_VALUE = "true";

/**
 * ScriptManager UniqueID — convention on these pages is
 * `ctl00$ScriptManager`. The submitted value is
 * `<sm>|<trigger>`. Override via the function arg only if a specific
 * page differs (none observed so far).
 */
export const SCRIPT_MANAGER_UNIQUE_ID = "ctl00$ScriptManager";
export function scriptManagerField(trigger: string, sm = SCRIPT_MANAGER_UNIQUE_ID): [string, string] {
  return [sm, `${sm}|${trigger}`];
}

/** Required request headers for the partial postback. */
export const RADAJAX_HEADERS: Record<string, string> = {
  "X-MicrosoftAjax": "Delta=true",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "*/*",
};

// ─── 3. Per-page Search-button trigger discovery ─────────────
//
// The RadButton renders an inner <input name="…SearchButton_input">. The
// `_input` is the inner element name — POSTing that as __EVENTTARGET is
// treated as a plain reload (blank grid). The real server-side trigger
// is the OUTER UniqueID — strip the trailing `_input`.
//
// The numeric panel index (MCC=`i1`, TagSearch=`i7`, …) IS NOT STABLE
// across pages. Always DISCOVER it from the page HTML — never hardcode.

const SEARCH_BUTTON_INPUT_RE = /<input[^>]*name=["']([^"']+SearchButton)_input["']/gi;

/** Strip the `_input` suffix from the inner RadButton input name. */
export function stripInputSuffix(name: string): string {
  return name.replace(/_input$/i, "");
}

/**
 * Discover the postback target on a search page. Prefer a control under
 * `PrimarySearchCriteria` (the real form), then any
 * `MasterRadPanelBar`-scoped match. Returns null if no SearchButton was
 * rendered (e.g. project-scope HandoverSearch has no per-subsystem
 * SearchButton).
 */
export function discoverSearchPostbackTarget(html: string): string | null {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  SEARCH_BUTTON_INPUT_RE.lastIndex = 0;
  while ((m = SEARCH_BUTTON_INPUT_RE.exec(html)) !== null) matches.push(m[1]);
  if (!matches.length) return null;
  const primary = matches.find((t) => /PrimarySearchCriteria/i.test(t));
  if (primary) return primary;
  const master = matches.find((t) => /MasterRadPanelBar/i.test(t));
  return master || matches[0];
}

// ─── 4. Empty / placeholder cell skip rule ───────────────────
//
// HandoverSearch renders a single `&nbsp;` placeholder row in registers
// that have no entries (e.g. a subsystem whose RFSU is pending). Under
// the new model "pending = absence of a persisted row" — never persist
// a placeholder as a phantom milestone. Same skip applies wherever the
// scraped grid uses `&nbsp;` as a no-value sentinel.

/**
 * Returns true if the cell text is null/empty/whitespace once
 * `&nbsp;` and HTML are stripped. Use this — never test for `&nbsp;`
 * literals at call sites.
 */
export function isEmptyPlaceholderCell(raw: string | null | undefined): boolean {
  if (raw == null) return true;
  const stripped = String(raw)
    .replace(/&nbsp;/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  return stripped.length === 0;
}

/** Strip `&nbsp;`/HTML, collapse whitespace, trim. Returns "" for empties. */
export function cleanCellText(raw: string | null | undefined): string {
  if (raw == null) return "";
  return String(raw)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── 5. ITR code shape ───────────────────────────────────────
//
// Every legitimate ITR code matches `BGC-{discipline}{digits}{A|B}`.
// Any code that DOESN'T match must be logged loudly, not silently
// mis-bucketed. Discipline = letter after `BGC-`; ab_phase = trailing
// A or B. Same regex is used by the parser + the canary.
export const ITR_CODE_REGEX = /^BGC-([A-Z])\d+([AB])$/i;

export function parseItrCode(code: string): { discipline: string; ab_phase: "A" | "B" } | null {
  const m = String(code || "").trim().match(ITR_CODE_REGEX);
  if (!m) return null;
  return { discipline: m[1].toUpperCase(), ab_phase: m[2].toUpperCase() as "A" | "B" };
}

// ─── 6. Certificate types & query strategy ───────────────────

export type CertGroupBy = "SubSystem" | "SubSystem,Discipline" | "Project";
export type CertLevel =
  | "subsystem"
  | "subsystem/discipline"
  | "system"
  | "system-terminal"      // RFSU (HC) / RFOC (non-HC)
  | "project-terminal";    // FAC

export interface HandoverCertSpec {
  cert_type: string;
  typeId: string;
  /**
   * Numbered handover gate (MCC=1, PCC/PCDAC=2, RFC=2).
   * NULL for terminal certs (RFSU/RFOC/FAC) — they are typed but sit OUTSIDE
   * the MCC→RFC numbered sequence. Do not default to a gate for these.
   */
  gate: number | null;
  groupBy: CertGroupBy;
  level: CertLevel;
  /**
   * Query strategy:
   *   - "per-subsystem": one filtered HandoverSearch per subsystem
   *     (avoids the page-1-only bug; required for subsystem-scoped
   *     and DAC discipline-fanout registers).
   *   - "project": one read per project (FAC has no SubSystem field
   *     at project scope — postback_fired=false is expected).
   */
  queryStrategy: "per-subsystem" | "project";
  /**
   * RFSU vs RFOC is the HC fork:
   *   RFSU = hydrocarbon systems
   *   RFOC = non-hydrocarbon
   * Same HC classification that drives the SoF requirement; the milestone
   * strip shows only the relevant terminal per the system's HC flag.
   */
  hc?: "required" | "excluded";
}

/**
 * Full set of handover certificate TypeIDs captured from the live Handovers
 * menu. Iterate this list — do not look up GUIDs from a parallel map.
 *
 * DAC variants (MCC-DAC, PCDAC) use GroupBy=SubSystem,Discipline → expect
 * per-discipline rows; the gohub_certificates row key includes `discipline`.
 *
 * FAC is project-level final acceptance — GroupBy=Project, not subsystem.
 */
export const HANDOVER_CERTS: HandoverCertSpec[] = [
  { cert_type: "MCC",     typeId: "aafaeac5-e094-df11-b37f-0050ba0820b5", gate: 1,    groupBy: "SubSystem",            level: "subsystem",            queryStrategy: "per-subsystem" },
  { cert_type: "MCC-DAC", typeId: "3662f03d-ac83-e111-bfbc-001ec9b317f3", gate: 1,    groupBy: "SubSystem,Discipline", level: "subsystem/discipline", queryStrategy: "per-subsystem" },
  { cert_type: "PCC",     typeId: "fe342975-e1f7-df11-bfbc-001ec9b317f3", gate: 2,    groupBy: "SubSystem",            level: "subsystem",            queryStrategy: "per-subsystem" },
  { cert_type: "PCDAC",   typeId: "e83502f3-e0f7-df11-bfbc-001ec9b317f3", gate: 2,    groupBy: "SubSystem,Discipline", level: "subsystem/discipline", queryStrategy: "per-subsystem" },
  { cert_type: "RFC",     typeId: "f5317275-0f88-e211-bfbc-001ec9b317f3", gate: 2,    groupBy: "SubSystem",            level: "system",               queryStrategy: "per-subsystem" },
  // Terminal certs — gate is intentionally null.
  { cert_type: "RFSU",    typeId: "19832e28-2e8b-e211-9164-bc305bd9ba06", gate: null, groupBy: "SubSystem",            level: "system-terminal",      queryStrategy: "per-subsystem", hc: "required" },
  { cert_type: "RFOC",    typeId: "4c6baac9-c28a-e411-abe8-005056b430b5", gate: null, groupBy: "SubSystem",            level: "system-terminal",      queryStrategy: "per-subsystem", hc: "excluded" },
  { cert_type: "FAC",     typeId: "fd1838cf-7719-e411-abe4-005056b430b5", gate: null, groupBy: "Project",              level: "project-terminal",     queryStrategy: "project" },
];

export const HANDOVER_CERTS_BY_TYPE: Record<string, HandoverCertSpec> =
  Object.fromEntries(HANDOVER_CERTS.map((c) => [c.cert_type, c]));

export function getHandoverCertSpec(certType: string): HandoverCertSpec | undefined {
  return HANDOVER_CERTS_BY_TYPE[certType];
}

// ─── 7. Canary oracle (structural-invariant assertions) ──────
//
// One known-good subsystem whose extraction we re-run on a schedule.
// The cert dates here are HISTORICAL FACTS (gates completed in 2019,
// immutable) — asserting their presence is a stable liveness signal,
// not a frozen-snapshot bet. Counts/statuses on actively-changing data
// (e.g. outstanding ITRs) MUST NOT be asserted — they will close one
// day and we'd cry wolf.
export const CANARY_ORACLE = {
  tile_name: "WEST QURNA",
  project_code: "C013",
  subsystem_number: "C013-DP18A-08X",
  subsystem_guid: "f6046332-9f41-442d-9924-24e51e4093d2",
  // Historical completed gate dates — immutable.
  expected_cert_dates: {
    MCC: "2019-05-27",
    PCC: "2019-08-13",
    RFC: "2019-08-24",
  } as Record<string, string>,
  // Frozen ITR count is OK here: the live ITR matrix for this subsystem
  // is closed (PCC/RFC accepted). A drift = parser regression.
  expected_itr_total: 33,
  expected_itr_a: 20,
  expected_itr_b: 13,
};
