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

export const TABLE_ROW_SCHEMAS: Record<string, TableRowSchema> = {
  su_notification: SCHEMA_SU_NOTIFICATION_OI,
};

export function isRowClosed(row: Record<string, any>, field: string): boolean {
  const v = row?.[field];
  if (v === true) return true;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  if (!s) return false;
  return !["—", "-", "n/a", "na", "tbd", "pending", "outstanding", "none"].includes(s);
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
