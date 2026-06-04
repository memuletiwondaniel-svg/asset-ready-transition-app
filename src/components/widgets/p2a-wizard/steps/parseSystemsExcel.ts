import ExcelJS from 'exceljs';
import type { WizardSystem } from './SystemsImportStep';

/**
 * Parse an Excel/CSV file into WizardSystem[].
 * Looks at the first worksheet, uses the first row as headers, and maps
 * fuzzy header names → system_id / name / description / is_hydrocarbon.
 */
export async function parseSystemsExcel(file: File): Promise<WizardSystem[]> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();

  if (file.name.toLowerCase().endsWith('.csv')) {
    // ExcelJS csv reader needs a stream; do a tiny manual parse instead.
    const text = new TextDecoder().decode(buf);
    return parseDelimited(text);
  }

  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim().toLowerCase();
  });

  const idx = pickColumns(headers);
  if (idx.systemId === -1 && idx.name === -1) return [];

  const out: WizardSystem[] = [];
  const seen = new Set<string>();
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const systemId = idx.systemId !== -1 ? cellString(row.getCell(idx.systemId + 1).value) : '';
    const name = idx.name !== -1 ? cellString(row.getCell(idx.name + 1).value) : '';
    const description = idx.desc !== -1 ? cellString(row.getCell(idx.desc + 1).value) : '';
    const hcRaw = idx.hc !== -1 ? cellString(row.getCell(idx.hc + 1).value) : '';
    const finalSysId = systemId || name;
    const finalName = name || systemId;
    if (!finalSysId || seen.has(finalSysId)) return;
    seen.add(finalSysId);
    out.push({
      id: `excel-${Date.now()}-${rowNumber}`,
      system_id: finalSysId,
      name: finalName,
      description,
      is_hydrocarbon: parseBool(hcRaw),
    });
  });

  return out;
}

function pickColumns(headers: string[]) {
  const find = (...needles: string[]) =>
    headers.findIndex(h => needles.some(n => h.includes(n)));
  return {
    systemId: find('system id', 'system_id', 'systemid', 'tag', 'code', 'id'),
    name: find('name', 'description', 'title'),
    desc: find('description', 'notes', 'remark'),
    hc: find('hydrocarbon', 'hc'),
  };
}

function cellString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object' && v !== null && 'text' in (v as Record<string, unknown>)) {
    return String((v as { text: unknown }).text ?? '').trim();
  }
  if (typeof v === 'object' && v !== null && 'result' in (v as Record<string, unknown>)) {
    return String((v as { result: unknown }).result ?? '').trim();
  }
  return String(v).trim();
}

function parseBool(v: string): boolean {
  const s = v.toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1' || s === 'hc';
}

function parseDelimited(text: string): WizardSystem[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delim).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const idx = pickColumns(headers);
  if (idx.systemId === -1 && idx.name === -1) return [];
  const out: WizardSystem[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
    const systemId = idx.systemId !== -1 ? cols[idx.systemId] || '' : '';
    const name = idx.name !== -1 ? cols[idx.name] || '' : '';
    const description = idx.desc !== -1 ? cols[idx.desc] || '' : '';
    const hcRaw = idx.hc !== -1 ? cols[idx.hc] || '' : '';
    const finalSysId = systemId || name;
    const finalName = name || systemId;
    if (!finalSysId || seen.has(finalSysId)) continue;
    seen.add(finalSysId);
    out.push({
      id: `csv-${Date.now()}-${i}`,
      system_id: finalSysId,
      name: finalName,
      description,
      is_hydrocarbon: parseBool(hcRaw),
    });
  }
  return out;
}
