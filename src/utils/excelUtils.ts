import ExcelJS from 'exceljs';

/**
 * Read an Excel/CSV file buffer and return rows as JSON objects (keyed by header row).
 * Supports optional `range` to skip rows before the header.
 */
export async function readExcelFile<T = Record<string, any>>(
  buffer: ArrayBuffer,
  options?: { range?: number; headerRow?: number; rawArrays?: boolean }
): Promise<{ sheetNames: string[]; data: T[]; rawRows?: any[][] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  const sheetNames = workbook.worksheets.map(ws => ws.name);

  if (!sheet || sheet.rowCount === 0) {
    return { sheetNames, data: [], rawRows: [] };
  }

  const headerRowIdx = (options?.range ?? options?.headerRow ?? 0) + 1; // ExcelJS is 1-indexed
  const rawRows: any[][] = [];

  // Collect all rows as arrays
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rawRows.push(row.values as any[]);
  });

  if (options?.rawArrays) {
    // Return 0-indexed arrays (strip the leading undefined from ExcelJS)
    const cleaned = rawRows.map(r => {
      const arr = Array.isArray(r) ? r.slice(1) : r;
      return arr;
    });
    return { sheetNames, data: [] as T[], rawRows: cleaned };
  }

  // Build header from the specified row
  const allRows: any[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const vals = (row.values as any[]).slice(1); // remove leading undefined
    allRows.push(vals);
  });

  const startIdx = (options?.range ?? options?.headerRow ?? 0);
  if (startIdx >= allRows.length) return { sheetNames, data: [] };

  const headers = allRows[startIdx].map((h: any) => String(h ?? ''));
  const data: T[] = [];

  for (let i = startIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const obj: Record<string, any> = {};
    headers.forEach((header, colIdx) => {
      if (header) {
        obj[header] = row[colIdx] ?? undefined;
      }
    });
    // Skip completely empty rows
    if (Object.values(obj).some(v => v !== undefined && v !== null && v !== '')) {
      data.push(obj as T);
    }
  }

  return { sheetNames, data, rawRows: allRows };
}

/**
 * Write JSON data to an Excel file and trigger download.
 */
export async function writeExcelFile(
  filename: string,
  sheets: Array<{
    name: string;
    data?: Record<string, any>[];
    aoa?: any[][];
    columns?: Array<{ width: number }>;
  }>
) {
  const workbook = new ExcelJS.Workbook();

  for (const sheetDef of sheets) {
    const ws = workbook.addWorksheet(sheetDef.name);

    if (sheetDef.aoa) {
      // Array of arrays
      sheetDef.aoa.forEach(row => {
        ws.addRow(row);
      });
    } else if (sheetDef.data && sheetDef.data.length > 0) {
      // JSON data — add header row then data rows
      const headers = Object.keys(sheetDef.data[0]);
      ws.addRow(headers);
      sheetDef.data.forEach(item => {
        ws.addRow(headers.map(h => item[h] ?? ''));
      });

      // Bold header row
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
    }

    // Set column widths
    if (sheetDef.columns) {
      sheetDef.columns.forEach((col, idx) => {
        const wsCol = ws.getColumn(idx + 1);
        wsCol.width = col.width;
      });
    }
  }

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
