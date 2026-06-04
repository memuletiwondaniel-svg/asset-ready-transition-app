// Pure HTML/RadAjax/RadGrid parsers — no runtime deps (no supabase, no
// fetch). Lives in its own module so unit tests can import without
// pulling in npm packages.

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Parse a RadAjax/MS-AJAX delta response. Format is a stream of
// `length|type|id|content|` segments. We concatenate the HTML of every
// `updatePanel` segment. If the payload doesn't look like a delta (e.g.
// server returned a full-page fallback), pass it through so callers can
// still try to scrape it.
export function parseRadAjaxDelta(delta: string): string {
  if (!delta) return "";
  if (!/^\s*\d+\s*\|/.test(delta)) return delta;
  const panels: string[] = [];
  let i = 0;
  const n = delta.length;
  while (i < n) {
    const pipe1 = delta.indexOf("|", i);
    if (pipe1 < 0) break;
    const len = parseInt(delta.slice(i, pipe1), 10);
    if (!Number.isFinite(len)) break;
    const pipe2 = delta.indexOf("|", pipe1 + 1);
    if (pipe2 < 0) break;
    const type = delta.slice(pipe1 + 1, pipe2);
    const pipe3 = delta.indexOf("|", pipe2 + 1);
    if (pipe3 < 0) break;
    const contentStart = pipe3 + 1;
    const contentEnd = contentStart + len;
    if (contentEnd > n) break;
    const content = delta.slice(contentStart, contentEnd);
    if (type === "updatePanel") panels.push(content);
    i = contentEnd + 1;
  }
  return panels.join("\n");
}

export interface GridRow {
  [key: string]: string;
}

export function parseRadGridTable(html: string, headerOverrides?: string[]): GridRow[] {
  const rows: GridRow[] = [];

  // Locate the rgMasterTable opening tag, then bracket-match nested
  // <table>/</table> pairs. RadGrid embeds sub-tables (pager, filter)
  // so a naive non-greedy regex truncates the body before any data rows.
  const openRe = /<table[^>]*class="[^"]*rgMasterTable[^"]*"[^>]*>/i;
  const openMatch = openRe.exec(html);
  let tableHtml = "";
  if (openMatch) {
    const startContent = openMatch.index + openMatch[0].length;
    let depth = 1;
    const scan = /<table\b|<\/table>/gi;
    scan.lastIndex = startContent;
    let m: RegExpExecArray | null;
    let endIdx = -1;
    while ((m = scan.exec(html)) !== null) {
      if (m[0].toLowerCase().startsWith("</")) {
        depth--;
        if (depth === 0) { endIdx = m.index; break; }
      } else {
        depth++;
      }
    }
    tableHtml = endIdx > 0 ? html.slice(startContent, endIdx) : html.slice(startContent);
  } else {
    const fallback = html.match(/<table[^>]*id="[^"]*_GridData[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (!fallback) return rows;
    tableHtml = fallback[1];
  }

  // Headers — prefer standalone `<th class="rgHeader">` cells (the
  // CompletionsGrid layout). Fall back to the legacy thead / `<tr
  // rgHeader>` scrape for grids following the older pattern.
  const headers: string[] = [];
  const thRgRe = /<th\b[^>]*class="[^"]*\brgHeader\b[^"]*"[^>]*>([\s\S]*?)<\/th>/gi;
  let thRgMatch: RegExpExecArray | null;
  while ((thRgMatch = thRgRe.exec(tableHtml)) !== null) {
    const text = thRgMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    headers.push(text);
  }
  if (headers.length === 0) {
    const headerRowMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)
      || tableHtml.match(/<tr[^>]*class="[^"]*rgHeader[^"]*"[^>]*>([\s\S]*?)<\/tr>/i);
    if (headerRowMatch) {
      const thRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let thMatch;
      while ((thMatch = thRegex.exec(headerRowMatch[1])) !== null) {
        const text = thMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        headers.push(text);
      }
    }
  }

  const effectiveHeaders = headerOverrides || headers;

  // Data rows: rgRow / rgAltRow scoped directly to the master-table
  // content (nested rgCommandTable / pager have their own tbody so
  // first-tbody scoping can grab the wrong one).
  const rowRegex = /<tr[^>]*class="[^"]*\brg(?:Row|AltRow)\b[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const text = cellMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      cells.push(decodeHtmlEntities(text));
    }
    if (cells.length > 0) {
      const row: GridRow = {};
      const keyCount = Math.max(effectiveHeaders.length, cells.length);
      for (let i = 0; i < keyCount; i++) {
        const key = effectiveHeaders[i] && effectiveHeaders[i].length > 0
          ? effectiveHeaders[i]
          : `c${i}`;
        row[key] = cells[i] ?? "";
      }
      rows.push(row);
    }
  }

  return rows;
}
