// Shared RegisterReader extraction core.
// Production (compute-vcr-insights) and the eval harness (run-insight-eval)
// both import from here so evaluated behaviour matches production behaviour.

export interface RegisterSchemaBase {
  schema_key: string;
  doc_match: RegExp;
  row_unit: "page" | "table_row";
  system_prompt: string;
  record_shape: string;
}
export interface TableRowSchema extends RegisterSchemaBase {
  row_unit: "table_row";
  record_key: string;
  closed_field: string;
  /** Schema-level: closed cell must contain a recognisable date token */
  requires_date?: boolean;
  /**
   * Option B — schema-level compound close-out predicate.
   * When provided, this is the ONLY authority on whether a row counts as
   * closed. Avoids false-greens on anomaly rows (name+date present but the
   * as-left position is wrong, or there's a written anomaly). Row is closed
   * iff the predicate returns true. Falls back to the generic closed_field
   * check when absent.
   */
  closed_predicate?: (row: Record<string, any>) => boolean;
  labels: {
    docType: string;
    countLabel: string;
    countUnit: string;
    outstandingLabel: string;
    outstandingItem: string;
  };
}
export interface PageRegisterSchema extends RegisterSchemaBase {
  row_unit: "page";
}
export type RegisterSchema = TableRowSchema | PageRegisterSchema;

export const SCHEMA_SU_NOTIFICATION_OI: TableRowSchema = {
  schema_key: "su_notification",
  doc_match: /(notification|acknowledg|start[\s_-]*up.*(comms|notice|ack))/i,
  row_unit: "table_row",
  record_key: "unit",
  closed_field: "acknowledged",
  requires_date: true,
  labels: {
    docType: "notification sheet",
    countLabel: "Units acknowledged",
    countUnit: "units",
    outstandingLabel: "Awaiting acknowledgement",
    outstandingItem: "acknowledgement",
  },
  record_shape:
    '{"unit":"string","notified":"string (date or method, or empty)",' +
    '"acknowledged":"string (acknowledger name + date, or empty if outstanding)",' +
    '"source_page":"integer (1-based page in the PDF)"}',
  system_prompt:
    'You are extracting a start-up NOTIFICATION & ACKNOWLEDGMENT sheet from a ' +
    'PDF. Each row is one affected unit or department (Operations, Maintenance, ' +
    'HSE, Utilities, Marine, …). Columns typically include UNIT/DEPARTMENT, ' +
    'NOTIFIED (date or method), and ACKNOWLEDGED (name + date). A unit counts ' +
    'as ACKNOWLEDGED only when the acknowledgement cell carries a non-empty ' +
    'value (name and/or date). Placeholders such as "—", "-", "N/A", "TBD", ' +
    '"pending", or blank all count as NOT acknowledged. Do not invent units. ' +
    'source_page is the 1-based page where you read the row. Return STRICT ' +
    'JSON, no prose, no markdown:\n' +
    '{"records":[{"unit":"string","notified":"string","acknowledged":"string",' +
    '"source_page":number}]}',
};

// ─────────────────────────────────────────────────────────────────────────
// LOLC — Locked Open / Locked Closed valve register (Phase 3B pilot).
// One row per valve. A line is CLOSED iff:
//   • verification cell carries BOTH a verifier name AND a date token,
//   • as_left_position is non-empty and matches required_position
//     (LO↔"open"/"locked open" and LC↔"closed"/"locked closed") when a
//     required_position was given by the source register,
//   • anomaly cell is empty / "none" / "n/a" (any real text = anomaly).
// Option B: schema-level closed_predicate — the ONLY authority so a row
// with a name+date but the WRONG position or a written anomaly never counts
// as closed. Rejects false-greens.
// ─────────────────────────────────────────────────────────────────────────
const NAME_TOKEN = /[A-Za-z]{2,}/;
const ANOMALY_EMPTY = /^(|none|n\/?a|nil|no anomaly|no anomalies|-|—|not applicable)$/i;

function positionsMatch(required: string, asLeft: string): boolean {
  const r = (required || "").trim().toLowerCase();
  const a = (asLeft || "").trim().toLowerCase();
  if (!a) return false;
  if (!r) return true; // no required position specified → any non-empty as-left is fine
  const wantOpen = /(^|[^a-z])(lo|open)([^a-z]|$)/.test(r) && !/closed/.test(r);
  const wantClosed = /(^|[^a-z])(lc|closed)([^a-z]|$)/.test(r);
  const isOpen = /(^|[^a-z])(lo|open)([^a-z]|$)/.test(a) && !/closed/.test(a);
  const isClosed = /(^|[^a-z])(lc|closed)([^a-z]|$)/.test(a);
  if (wantOpen && isOpen) return true;
  if (wantClosed && isClosed) return true;
  return false;
}

function lolcRowClosed(row: Record<string, any>): boolean {
  const verification = String(row?.verification ?? "").trim();
  if (!verification) return false;
  if (!NAME_TOKEN.test(verification)) return false;
  if (!DATE_TOKEN.test(verification)) return false;
  const s = verification.toLowerCase();
  for (const p of PLACEHOLDER_SUBSTRINGS) {
    if (s.includes(p)) return false;
  }
  const required = String(row?.required_position ?? "").trim();
  const asLeft = String(row?.as_left_position ?? "").trim();
  if (!positionsMatch(required, asLeft)) return false;
  const anomaly = String(row?.anomaly ?? "").trim();
  if (anomaly && !ANOMALY_EMPTY.test(anomaly)) return false;
  return true;
}

export const SCHEMA_LOLC_OI16: TableRowSchema = {
  schema_key: "lolc",
  doc_match: /(lolc|locked[\s_-]*(open|closed)|l\.o\.l\.c|car[\s_-]*seal)/i,
  row_unit: "table_row",
  record_key: "tag_no",
  closed_field: "verification",
  closed_predicate: lolcRowClosed,
  labels: {
    docType: "LOLC valve register",
    countLabel: "Valves verified",
    countUnit: "valves",
    outstandingLabel: "Outstanding valves",
    outstandingItem: "verification",
  },
  record_shape:
    '{"tag_no":"string (valve tag)",' +
    '"required_position":"string (LO / LC / Locked Open / Locked Closed / empty)",' +
    '"as_left_position":"string (LO / LC / Open / Closed / empty)",' +
    '"verification":"string (verifier name + date, or empty if outstanding)",' +
    '"anomaly":"string (any noted anomaly, or empty/None)",' +
    '"source_page":"integer (1-based page in the PDF)"}',
  system_prompt:
    'You are extracting a LOCKED OPEN / LOCKED CLOSED (LOLC) valve register ' +
    'from a PDF. Each row is one valve. Typical columns: VALVE TAG NO, ' +
    'REQUIRED POSITION (LO=Locked Open, LC=Locked Closed), AS-LEFT POSITION ' +
    '(what the field verifier found), VERIFICATION (verifier name + date), ' +
    'and ANOMALY / REMARKS. A row counts as VERIFIED only when the verification ' +
    'cell has a real verifier name AND date, the as-left position matches the ' +
    'required position, and no anomaly is written. Placeholders such as "—", ' +
    '"-", "N/A", "TBD", "pending", or blank in verification count as ' +
    'OUTSTANDING. Do not invent valves. source_page is the 1-based page where ' +
    'you read the row. Return STRICT JSON, no prose, no markdown:\n' +
    '{"records":[{"tag_no":"string","required_position":"string",' +
    '"as_left_position":"string","verification":"string","anomaly":"string",' +
    '"source_page":number}]}',
};

// ─────────────────────────────────────────────────────────────────────────
// AUDIT_ACTIONS — Fire & Safety Audit action-tracker register (HS-06).
// One row per audit finding / action. A line is CLOSED iff:
//   • status cell reads closed / complete / verified (not open/in progress),
//   • close-out cell has BOTH a signer name AND a date token,
//   • no placeholder ("pending", "tbd", …) in close-out,
//   • overdue/anomaly cell is empty / none / n/a.
// Option B: schema-level closed_predicate is the ONLY authority so a row
// showing "Closed" but missing signer+date, or carrying an overdue flag,
// never counts as closed.
// ─────────────────────────────────────────────────────────────────────────
const AUDIT_STATUS_CLOSED = /(^|[^a-z])(closed|complete[d]?|verified|resolved|actioned)([^a-z]|$)/i;
const AUDIT_STATUS_OPEN = /(open|in[\s_-]*progress|outstanding|ongoing|deferred|pending)/i;

function auditActionRowClosed(row: Record<string, any>): boolean {
  const status = String(row?.status ?? "").trim();
  if (!status) return false;
  if (AUDIT_STATUS_OPEN.test(status.toLowerCase())) return false;
  if (!AUDIT_STATUS_CLOSED.test(status)) return false;
  const closeout = String(row?.close_out ?? "").trim();
  if (!closeout) return false;
  if (!NAME_TOKEN.test(closeout)) return false;
  if (!DATE_TOKEN.test(closeout)) return false;
  const lower = closeout.toLowerCase();
  for (const p of PLACEHOLDER_SUBSTRINGS) {
    if (lower.includes(p)) return false;
  }
  const overdue = String(row?.overdue ?? "").trim();
  if (overdue && !ANOMALY_EMPTY.test(overdue)) return false;
  return true;
}

export const SCHEMA_AUDIT_ACTIONS_HS06: TableRowSchema = {
  schema_key: "audit_actions",
  doc_match: /(fire[\s_&-]*safety.*audit|audit.*action|safety[\s_-]*audit.*(register|tracker|log))/i,
  row_unit: "table_row",
  record_key: "action_no",
  closed_field: "close_out",
  closed_predicate: auditActionRowClosed,
  labels: {
    docType: "Fire & Safety Audit action register",
    countLabel: "Actions closed",
    countUnit: "actions",
    outstandingLabel: "Open audit actions",
    outstandingItem: "close-out",
  },
  record_shape:
    '{"action_no":"string (action id, e.g. FSA-001)",' +
    '"finding":"string (short description of the audit finding)",' +
    '"responsible":"string (name or discipline)",' +
    '"target_date":"string (target date, or empty)",' +
    '"status":"string (Open / In Progress / Closed / Verified / etc.)",' +
    '"close_out":"string (closer name + date, or empty if outstanding)",' +
    '"overdue":"string (any overdue/anomaly flag, or empty)",' +
    '"source_page":"integer (1-based page in the PDF)"}',
  system_prompt:
    'You are extracting a FIRE & SAFETY AUDIT action-tracker register from a ' +
    'PDF. Each row is one audit finding / action. Typical columns: ACTION NO, ' +
    'FINDING / DESCRIPTION, RESPONSIBLE, TARGET DATE, STATUS (Open / In ' +
    'Progress / Closed / Verified), CLOSE-OUT (closer name + date), and any ' +
    'OVERDUE or ANOMALY / REMARKS flag. An action counts as CLOSED only when ' +
    'the status cell reads closed/complete/verified, the close-out cell has a ' +
    'real closer name AND date, and no overdue flag is written. Placeholders ' +
    'such as "—", "-", "N/A", "TBD", "pending", or blank in close-out count ' +
    'as OPEN. Do not invent actions. source_page is the 1-based page where ' +
    'you read the row. Return STRICT JSON, no prose, no markdown:\n' +
    '{"records":[{"action_no":"string","finding":"string",' +
    '"responsible":"string","target_date":"string","status":"string",' +
    '"close_out":"string","overdue":"string","source_page":number}]}',
};

// ─────────────────────────────────────────────────────────────────────────
// PUNCHLIST — Construction / Commissioning punchlist register (TI Scope).
// One row per punch item. A line is CLOSED iff:
//   • status cell reads closed / complete / cleared / accepted / signed-off,
//   • closed_by cell carries BOTH a signer name AND a date token,
//   • no placeholder ("pending", "tbd", "awaiting", …) in closed_by,
//   • remarks/anomaly cell is empty / none / n/a (any real text = anomaly).
// Punch category (A / B) does NOT affect the closed predicate — both A and
// B items are individually signed off; category only drives readiness gates
// elsewhere.
// Option B: schema-level closed_predicate is the ONLY authority.
// ─────────────────────────────────────────────────────────────────────────
const PUNCH_STATUS_CLOSED = /(^|[^a-z])(closed|complete[d]?|cleared|accepted|signed[\s_-]*off|resolved|actioned)([^a-z]|$)/i;
const PUNCH_STATUS_OPEN = /(open|in[\s_-]*progress|outstanding|ongoing|deferred|pending|raised)/i;

function punchlistRowClosed(row: Record<string, any>): boolean {
  const status = String(row?.status ?? "").trim();
  if (!status) return false;
  if (PUNCH_STATUS_OPEN.test(status.toLowerCase())) return false;
  if (!PUNCH_STATUS_CLOSED.test(status)) return false;
  const closer = String(row?.closed_by ?? "").trim();
  if (!closer) return false;
  if (!NAME_TOKEN.test(closer)) return false;
  if (!DATE_TOKEN.test(closer)) return false;
  const lower = closer.toLowerCase();
  for (const p of PLACEHOLDER_SUBSTRINGS) {
    if (lower.includes(p)) return false;
  }
  const remarks = String(row?.remarks ?? "").trim();
  if (remarks && !ANOMALY_EMPTY.test(remarks)) return false;
  return true;
}

export const SCHEMA_PUNCHLIST_TI: TableRowSchema = {
  schema_key: "punchlist",
  doc_match: /(punch[\s_-]*list|punch[\s_-]*item|punch[\s_-]*register|outstanding[\s_-]*work|snag[\s_-]*list)/i,
  row_unit: "table_row",
  record_key: "item_no",
  closed_field: "closed_by",
  closed_predicate: punchlistRowClosed,
  labels: {
    docType: "punchlist register",
    countLabel: "Punch items cleared",
    countUnit: "items",
    outstandingLabel: "Open punch items",
    outstandingItem: "close-out",
  },
  record_shape:
    '{"item_no":"string (punch item id, e.g. P-001)",' +
    '"description":"string (short punch description)",' +
    '"category":"string (A / B or empty)",' +
    '"discipline":"string (Mech / Elec / Instr / Piping / etc., or empty)",' +
    '"raised_by":"string (raiser name + date, or empty)",' +
    '"target_close":"string (target date, or empty)",' +
    '"status":"string (Open / In Progress / Closed / Cleared / Signed-Off / etc.)",' +
    '"closed_by":"string (closer name + date, or empty if outstanding)",' +
    '"remarks":"string (any anomaly / remarks, or empty)",' +
    '"source_page":"integer (1-based page in the PDF)"}',
  system_prompt:
    'You are extracting a CONSTRUCTION / COMMISSIONING PUNCHLIST register ' +
    'from a PDF. Each row is one punch item. Typical columns: ITEM NO, ' +
    'DESCRIPTION, CATEGORY (A/B), DISCIPLINE, RAISED BY, TARGET CLOSE, ' +
    'STATUS (Open / In Progress / Closed / Cleared / Signed-Off), CLOSED BY ' +
    '(closer name + date), and REMARKS. An item counts as CLOSED only when ' +
    'the status cell reads closed/cleared/signed-off, the closed-by cell has ' +
    'a real closer name AND date, and no outstanding remark is written. ' +
    'Placeholders such as "—", "-", "N/A", "TBD", "pending", or blank in ' +
    'closed-by count as OPEN. Do not invent items. source_page is the ' +
    '1-based page where you read the row. Return STRICT JSON, no prose, no ' +
    'markdown:\n' +
    '{"records":[{"item_no":"string","description":"string",' +
    '"category":"string","discipline":"string","raised_by":"string",' +
    '"target_close":"string","status":"string","closed_by":"string",' +
    '"remarks":"string","source_page":number}]}',
};

export const TABLE_ROW_SCHEMAS: Record<string, TableRowSchema> = {
  su_notification: SCHEMA_SU_NOTIFICATION_OI,
  lolc: SCHEMA_LOLC_OI16,
  audit_actions: SCHEMA_AUDIT_ACTIONS_HS06,
  punchlist: SCHEMA_PUNCHLIST_TI,
};

const PLACEHOLDER_SUBSTRINGS = [
  "pending", "tbd", "awaiting", "to follow", "n/a", "not yet", "outstanding", "none",
];
const DATE_TOKEN =
  /(\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\s\-\/](?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s\-\/]?\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{2,4}\b)/i;

export function isRowClosed(
  row: Record<string, any>,
  field: string,
  opts?: { requiresDate?: boolean },
): boolean {
  const v = row?.[field];
  if (v === true) return true;
  if (v == null) return false;
  const raw = String(v).trim();
  if (!raw) return false;
  const s = raw.toLowerCase();
  if (["—", "-", "na"].includes(s)) return false;
  // Substring placeholder rejection anywhere in the cell
  for (const p of PLACEHOLDER_SUBSTRINGS) {
    if (s.includes(p)) return false;
  }
  if (opts?.requiresDate) {
    if (!DATE_TOKEN.test(raw)) return false;
  }
  return true;
}

/**
 * Schema-aware close-out. Uses the schema's closed_predicate when set
 * (Option B), otherwise falls back to the generic closed_field/requires_date
 * check. Callers (production + eval harness) go through here so behaviour
 * stays identical across both.
 */
export function isRowClosedForSchema(
  row: Record<string, any>,
  schema: TableRowSchema,
): boolean {
  if (schema.closed_predicate) return schema.closed_predicate(row);
  return isRowClosed(row, schema.closed_field, { requiresDate: !!schema.requires_date });
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

// Single-shot table-row extraction. Identical body to production; returns raw
// records (deduping is done by callers so eval sees the same processed rows).
export async function tableRowExtract(
  lovableKey: string,
  pdfBytes: Uint8Array,
  filename: string,
  schema: TableRowSchema,
  timeoutMs = 45_000,
): Promise<Array<Record<string, any>> | null> {
  const b64 = bytesToBase64(pdfBytes);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  let r: Response | null = null;
  try {
    r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: schema.system_prompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract every row from this ${schema.labels.docType}.` },
              { type: "file", file: { filename, file_data: `data:application/pdf;base64,${b64}` } },
            ],
          },
        ],
      }),
    });
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(to);
  }
  if (!r || !r.ok) return null;
  try {
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(typeof txt === "string" ? txt : "{}");
    return Array.isArray(parsed?.records) ? parsed.records : [];
  } catch (_e) {
    return null;
  }
}

// Dedupe by record_key, last-wins per field. Matches production behaviour.
export function dedupeByKey<T extends Record<string, any>>(
  records: T[],
  key: string,
): T[] {
  const byKey = new Map<string, T>();
  for (const rec of records) {
    const k = String(rec?.[key] || "").trim();
    if (!k) continue;
    const prev = byKey.get(k) || ({} as T);
    byKey.set(k, { ...prev, ...rec });
  }
  return Array.from(byKey.values());
}
