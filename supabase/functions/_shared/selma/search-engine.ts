// ============================================================
// Selma Search Engine V11 — full port from V10 ai-chat/index.ts
// All outer-scope closure variables replaced with SearchContext
// All cookieHeader reads → ctx.sessionManager.getSession()
// All authenticateAssai() re-auth → ctx.sessionManager.getSession(true)
// label.aweb warmup preserved after every forced re-auth
// ============================================================

import { authenticateAssai, ASSAI_UA } from '../assai-auth.ts';

// ============================================================
// SESSION MANAGER
// ============================================================

export class SessionManager {
  private cookieHeader: string = '';
  private queryCount: number = 0;
  private lastAuthTime: number = 0;
  private readonly MAX_QUERIES_BEFORE_REFRESH = 50;
  private readonly MAX_AGE_MS = 90000;

  constructor(
    private loginFn: () => Promise<{ cookies: string }>,
    private assaiBase: string = ''
  ) {}

  async getSession(forceRefresh = false): Promise<string> {
    const now = Date.now();
    const needsRefresh =
      forceRefresh ||
      !this.cookieHeader ||
      this.queryCount >= this.MAX_QUERIES_BEFORE_REFRESH ||
      (now - this.lastAuthTime) > this.MAX_AGE_MS;

    if (needsRefresh) {
      const result = await this.loginFn();
      this.cookieHeader = result.cookies;
      this.queryCount = 0;
      this.lastAuthTime = Date.now();
      // label.aweb warmup after every (re-)auth — MUST include subclass_type
      // All working Assai integrations (discover-vendors, parse-sdr, check-sdr-completeness)
      // pass subclass_type on label.aweb. Without it, the module context is not initialised
      // and subsequent result POSTs return the login page instead of search results.
      if (this.assaiBase) {
        await fetch(this.assaiBase + '/label.aweb?subclass_type=DES_DOC', {
          headers: { Cookie: this.cookieHeader, 'User-Agent': ASSAI_UA },
          redirect: 'follow',
        }).catch(() => {});
      }
    }

    this.queryCount++;
    return this.cookieHeader;
  }

  resetCount(): void {
    this.queryCount = 0;
  }
}

// ============================================================
// SEARCH CONTEXT
// ============================================================

export interface SearchContext {
  sessionManager: SessionManager;
  assaiBase: string;
  ua: string;
  username: string;
  password: string;

  // Derived constants
  poDigits: string;
  effectiveDocType: string | undefined;
  moduleParams: { subclass_type: string; clas_seq_nr: string; suty_seq_nr: string };
  searchBothModules: boolean;
  isMultiTypeSearch: boolean;
  documentTypeCodes: string[];
  useSupDoc: boolean;

  // Mutable search params
  document_number_pattern: string;
  discipline_code: string | undefined;
  document_type: string | undefined;
  status_code: string;
  company_code: string;
  title: string;

  // Mutable state
  totalQueryCount: number;
  paginationTotalAssaiCount: number | null;
  sweepStartTime: number;

  SWEEP_TIME_GUARD_MS: number;
  MAX_TOTAL_QUERIES: number;
  PAGE_CAP: number;

  emitStatus: (msg: string) => void;
  supabase: any;
  maxResults: number;
}

export interface SearchResult {
  document_number: string;
  title: string;
  revision: string;
  revision_date?: string;
  status: string;
  priority?: string;
  responsible_engineer?: string;
  company?: string;
  discipline?: string;
  type_code?: string;
  work_package?: string;
  purchase_order?: string;
  pk_seq_nr?: string;
  entt_seq_nr?: string;
  subclass?: string;
  download_url?: string;
  _metadataOnly?: boolean;
}

// ============================================================
// PURE FUNCTIONS
// ============================================================

const stripHtml = (s: string) => String(s || '').replace(/<[^>]*>/g, '').trim();

export function extractHiddenFields(html: string): Array<{ name: string; type: string; value: string }> {
  const fields: Array<{ name: string; type: string; value: string }> = [];
  const inputRegex = /<input[^>]*>/gi;
  let m;
  while ((m = inputRegex.exec(html)) !== null) {
    const tag = m[0];
    const name = tag.match(/name=["']([^"']+)["']/i)?.[1] ?? '';
    if (!name) continue;
    const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? 'text';
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? '';
    fields.push({ name, type, value });
  }
  return fields;
}

export function parseDocuments(html: string, subclass?: string): SearchResult[] {
  // Early exit: detect Assai error pages
  if (html.includes('applet:error') || html.includes('error.aweb?message=showErrorInfo')) {
    console.error('parseDocuments: Assai returned an error page — skipping parse');
    return [];
  }

  // Strategy 1: parse myCells JavaScript variable
  // Use a robust extraction: find "var myCells = [" then bracket-match to find the closing "];"
  let myCellsJson: string | null = null;
  const myCellsStart = html.indexOf('var myCells');
  if (myCellsStart >= 0) {
    const bracketStart = html.indexOf('[', myCellsStart);
    if (bracketStart >= 0) {
      let depth = 0;
      let end = -1;
      for (let i = bracketStart; i < html.length; i++) {
        if (html[i] === '[') depth++;
        else if (html[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end > bracketStart) {
        myCellsJson = html.substring(bracketStart, end + 1);
      }
    }
  }

  if (myCellsJson) {
    try {
      const myCells = JSON.parse(myCellsJson);
      if (myCells.length > 0) {
        console.info('parseDocuments: myCells strategy found ' + myCells.length + ' rows');
        return myCells.map((row: any) => ({
          document_number: stripHtml(row[3]),
          revision: stripHtml(row[4]),
          revision_date: stripHtml(row[5]),
          status: stripHtml(row[6]),
          title: stripHtml(row[8]),
          priority: stripHtml(row[9]),
          responsible_engineer: stripHtml(row[11]),
          company: stripHtml(row[12]),
          discipline: stripHtml(row[13]),
          type_code: stripHtml(row[14]),
          work_package: stripHtml(row[15]),
          purchase_order: stripHtml(row[16]),
          pk_seq_nr: stripHtml(row[33]),
          entt_seq_nr: stripHtml(row[34]),
          subclass: subclass || '',
        }));
      }
    } catch (e) {
      console.error('parseDocuments: myCells parse error (json length=' + myCellsJson.length + '), trying TR fallback:', e);
    }
  }

  // Strategy 2: parse raw <tr>/<td> elements
  console.info('parseDocuments: myCells not found, using TR/TD fallback. HTML preview: ' + html.substring(0, 1000));
  const docs: SearchResult[] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      cells.push(stripHtml(tdMatch[1]));
    }
    if (cells.length >= 8) {
      const headerKeywords = ['document number', 'title', 'revision', 'status', 'date', 'description'];
      const isHeader = cells.slice(0, 5).some(c => headerKeywords.includes(c.toLowerCase()));
      if (isHeader) continue;
      if (!cells[0] && !cells[1] && !cells[2]) continue;
      docs.push({
        document_number: cells[3] || cells[2] || '',
        revision: cells[4] || cells[3] || '',
        revision_date: cells[5] || cells[4] || '',
        status: cells[6] || cells[5] || '',
        title: cells[8] || cells[7] || cells[6] || '',
        priority: cells[9] || '',
        responsible_engineer: cells[11] || '',
        company: cells[12] || '',
        discipline: cells[13] || '',
        type_code: cells[14] || '',
        work_package: cells[15] || '',
        purchase_order: cells[16] || '',
        pk_seq_nr: cells.length > 33 ? cells[33] : '',
        entt_seq_nr: cells.length > 34 ? cells[34] : '',
        subclass: subclass || '',
      });
    }
  }
  if (docs.length > 0) {
    console.info('parseDocuments: TR/TD fallback found ' + docs.length + ' rows');
  } else {
    console.warn('parseDocuments: no documents found with either strategy');
  }
  return docs;
}

export function parseTotalCount(html: string): number | null {
  const m = html.match(/(?:showing|results?)\s+\d+\s*(?:[-–]|to)\s+\d+\s+of\s+(\d+)/i);
  if (m) return parseInt(m[1], 10);
  const m2 = html.match(/(\d+)\s+of\s+(\d+)\s*(?:record|result|row|item|document|entr)/i);
  if (m2) return parseInt(m2[2], 10);
  return null;
}

// ============================================================
// STATEFUL FUNCTIONS — ported from V10
// ============================================================

export async function initSearch(
  ctx: SearchContext,
  params: { subclass_type: string; clas_seq_nr: string; suty_seq_nr: string }
): Promise<{ hiddenFields: Array<{ name: string; type: string; value: string }>; textFields: Array<{ name: string }> }> {
  const cookieHeader = await ctx.sessionManager.getSession();

  // Module warmup: label.aweb with subclass_type BEFORE search.aweb GET
  // This matches the pattern used by all working Assai integrations (discover-vendors, parse-sdr, check-sdr-completeness):
  //   1. label.aweb?subclass_type=X  (warmup)
  //   2. search.aweb?subclass_type=X (GET form)
  //   3. result.aweb POST            (get results)
  // Without this, result.aweb returns the application frame instead of search results.
  await fetch(ctx.assaiBase + '/label.aweb?subclass_type=' + params.subclass_type, {
    headers: { Cookie: cookieHeader, 'User-Agent': ctx.ua },
    redirect: 'follow',
  }).catch(() => {});

  const searchUrl = ctx.assaiBase + '/search.aweb?subclass_type=' + params.subclass_type + 
    '&clas_seq_nr=' + params.clas_seq_nr + '&suty_seq_nr=' + params.suty_seq_nr;
  const searchResp = await fetch(searchUrl, {
    headers: { Cookie: cookieHeader, Accept: 'text/html', 'User-Agent': ctx.ua },
    redirect: 'follow',
  });
  const searchHtml = await searchResp.text();
  const fields = extractHiddenFields(searchHtml);
  const hiddenFields = fields.filter(f => f.type === 'hidden' && f.name && f.value);
  const textFields = fields.filter(f => f.type === 'text' || f.type === '');
  console.info('initSearch: label+search.aweb GET status ' + searchResp.status + ', html length: ' + searchHtml.length + ', hidden fields: ' + hiddenFields.length + ', subclass: ' + params.subclass_type);
  return { hiddenFields, textFields };
}

export async function fetchResultPage(
  ctx: SearchContext,
  hiddenFields: Array<{ name: string; type: string; value: string }>,
  textFields: Array<{ name: string }>,
  params: { subclass_type: string; clas_seq_nr: string; suty_seq_nr: string },
  startRow?: number,
): Promise<string> {
  const cookieHeader = await ctx.sessionManager.getSession();
  const formData = new URLSearchParams();
  for (const f of hiddenFields) formData.set(f.name, f.value);
  for (const f of textFields) formData.set(f.name, '');
  formData.set('subclass_type', params.subclass_type);
  formData.set('number_of_results', '500'); // Maximize results per page — Assai default is 100
  if (ctx.poDigits) {
    formData.set('purchase_code', ctx.poDigits);
  } else {
    formData.set('number', ctx.document_number_pattern);
  }
  if (ctx.discipline_code) formData.set('discipline_code', ctx.discipline_code);
  if (ctx.effectiveDocType) formData.set('document_type', ctx.effectiveDocType);
  if (ctx.status_code) formData.set('status_code', ctx.status_code);
  if (ctx.company_code) formData.set('company_code', ctx.company_code);
  if (ctx.title) formData.set('description', ctx.title);
  if (startRow && startRow > 1) formData.set('start_row', String(startRow));

  const searchUrl = ctx.assaiBase + '/search.aweb?subclass_type=' + params.subclass_type;
  // Use result.aweb — searchresult.aweb returns 404 in this context
  // (searchresult.aweb works in discover-vendors because it passes action:"search" 
  // and doesn't use hidden fields from search.aweb form)
  const resultUrl = ctx.assaiBase + '/result.aweb';
  const resultResp = await fetch(resultUrl, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html',
      Referer: searchUrl,
      'User-Agent': ctx.ua,
    },
    body: formData.toString(),
    redirect: 'follow',
  });
  let resultHtml = await resultResp.text();
  console.info('result.aweb POST (start_row=' + (startRow ?? 1) + '): status ' + resultResp.status + ', html length: ' + resultHtml.length);

  // Login-page detection — if Assai returned the login page, force session refresh and retry once
  if (resultHtml.includes('type="password"') || resultHtml.includes('id="password"') || resultHtml.includes('loginForm')) {
    console.warn('[Selma:SEARCH_V11] fetchResultPage returned login page — forcing session refresh');
    const freshCookie = await ctx.sessionManager.getSession(true);
    const retryResp = await fetch(resultUrl, {
      method: 'POST',
      headers: {
        Cookie: freshCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html',
        Referer: searchUrl,
        'User-Agent': ctx.ua,
      },
      body: formData.toString(),
      redirect: 'follow',
    });
    resultHtml = await retryResp.text();
    console.info('[Selma:SEARCH_V11] fetchResultPage retry: status ' + retryResp.status + ', html length: ' + resultHtml.length);
  }

  return resultHtml;
}

export async function executeFilteredSearch(
  ctx: SearchContext,
  params: { subclass_type: string; clas_seq_nr: string; suty_seq_nr: string },
  extraFilters: Record<string, string>,
  startRow?: number,
  reuseSession?: { hiddenFields: any[]; textFields: any[] },
): Promise<{ docs: SearchResult[]; hiddenFields: any[]; textFields: any[] }> {
  if (ctx.totalQueryCount >= ctx.MAX_TOTAL_QUERIES) return { docs: [], hiddenFields: [], textFields: [] };
  ctx.totalQueryCount++;
  await new Promise(r => setTimeout(r, 300));

  let subHidden: any[], subText: any[];
  if (reuseSession) {
    subHidden = reuseSession.hiddenFields;
    subText = reuseSession.textFields;
  } else {
    const init = await initSearch(ctx, params);
    subHidden = init.hiddenFields;
    subText = init.textFields;
  }
  
  // Build form payload using hidden fields from initSearch
  const cookieHeader = await ctx.sessionManager.getSession();
  const formData = new URLSearchParams();
  for (const f of subHidden) formData.set(f.name, f.value);
  for (const f of subText) formData.set(f.name, '');
  formData.set('subclass_type', params.subclass_type);
  if (ctx.poDigits) {
    formData.set('purchase_code', ctx.poDigits);
  } else if (ctx.document_number_pattern) {
    formData.set('number', ctx.document_number_pattern);
  }
  if (ctx.discipline_code) formData.set('discipline_code', ctx.discipline_code);
  if (ctx.title) formData.set('description', ctx.title);
  // Apply extra filters (overrides)
  for (const [k, v] of Object.entries(extraFilters)) {
    formData.set(k, v);
  }
  if (startRow && startRow > 1) formData.set('start_row', String(startRow));

  const searchUrl = ctx.assaiBase + '/search.aweb?subclass_type=' + params.subclass_type;
  const resp = await fetch(ctx.assaiBase + '/result.aweb', {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html',
      Referer: searchUrl,
      'User-Agent': ctx.ua,
    },
    body: formData.toString(),
    redirect: 'follow',
  });
  const html = await resp.text();
  console.info('executeFilteredSearch: result.aweb POST status=' + resp.status + ', html length: ' + html.length + ', filters: ' + JSON.stringify(extraFilters));
  const docs = parseDocuments(html, params.subclass_type);
  return { docs, hiddenFields: subHidden, textFields: subText };
}

export async function paginateFilteredSearch(
  ctx: SearchContext,
  params: { subclass_type: string; clas_seq_nr: string; suty_seq_nr: string },
  extraFilters: Record<string, string>,
  firstResult: { docs: SearchResult[]; hiddenFields: any[]; textFields: any[] },
  seen: Set<string>,
  allDocs: SearchResult[],
): Promise<void> {
  // Add first page docs
  for (const doc of firstResult.docs) {
    if (doc.document_number && !seen.has(doc.document_number)) {
      seen.add(doc.document_number);
      allDocs.push(doc);
    }
  }
  
  if (firstResult.docs.length < ctx.PAGE_CAP) return;
  
  const pageSize = firstResult.docs.length;
  let startRow = pageSize + 1;
  let consecutiveEmpty = 0;
  
  while (consecutiveEmpty < 2) {
    if (ctx.totalQueryCount >= ctx.MAX_TOTAL_QUERIES || (Date.now() - ctx.sweepStartTime) > ctx.SWEEP_TIME_GUARD_MS) break;
    
    const pageResult = await executeFilteredSearch(ctx, params, extraFilters, startRow, firstResult);
    const newDocs = pageResult.docs.filter((d: any) => d.document_number && !seen.has(d.document_number));
    
    if (newDocs.length === 0) {
      consecutiveEmpty++;
      if (startRow === pageSize + 1) break;
    } else {
      consecutiveEmpty = 0;
      for (const doc of newDocs) {
        seen.add(doc.document_number);
        allDocs.push(doc);
      }
      console.info('paginateFilteredSearch: start_row=' + startRow + ' returned ' + newDocs.length + ' new docs (total: ' + allDocs.length + ')');
    }
    
    startRow += pageSize;
    if (startRow > 10000) break;
  }
}

export async function paginateByStatusSplit(
  ctx: SearchContext,
  params: { subclass_type: string; clas_seq_nr: string; suty_seq_nr: string },
  firstDocs: SearchResult[],
): Promise<SearchResult[]> {
  ctx.sweepStartTime = Date.now();
  
  const allDocs: SearchResult[] = [];
  const seen = new Set<string>();
  for (const doc of firstDocs) {
    if (doc.document_number && !seen.has(doc.document_number)) {
      seen.add(doc.document_number);
      allDocs.push(doc);
    }
  }

  // Strategy 1: status-split
  const statusCodes = [...new Set(firstDocs.map((d: any) => d.status).filter(Boolean))];
  console.info('paginateByStatusSplit: splitting into ' + statusCodes.length + ' status sub-searches: ' + statusCodes.join(', '));

  if (statusCodes.length > 1) {
    for (const sc of statusCodes) {
      if (ctx.totalQueryCount >= ctx.MAX_TOTAL_QUERIES || (Date.now() - ctx.sweepStartTime) > ctx.SWEEP_TIME_GUARD_MS) break;
      console.info('paginateByStatusSplit: sub-search for status=' + sc);
      try {
        const result = await executeFilteredSearch(ctx, params, { status_code: sc });
        console.info('paginateByStatusSplit: status=' + sc + ' returned ' + result.docs.length + ' docs');
        for (const doc of result.docs) {
          if (doc.document_number && !seen.has(doc.document_number)) {
            seen.add(doc.document_number);
            allDocs.push(doc);
          }
        }
        if (result.docs.length >= ctx.PAGE_CAP) {
          await paginateFilteredSearch(ctx, params, { status_code: sc }, result, seen, allDocs);
        }
      } catch (subErr) {
        console.error('paginateByStatusSplit: sub-search for status=' + sc + ' failed:', subErr);
      }
    }
    console.info('paginateByStatusSplit: after status split, total unique docs: ' + allDocs.length);
  }

  // Strategy 2: type-code sweep from DB if still capped
  const expectedFromHeader = ctx.paginationTotalAssaiCount;
  const needsTypeSweep = expectedFromHeader ? allDocs.length < expectedFromHeader :
    statusCodes.some(sc => {
      const countForStatus = allDocs.filter(d => d.status === sc).length;
      return countForStatus >= ctx.PAGE_CAP;
    });

  if (needsTypeSweep && ctx.totalQueryCount < ctx.MAX_TOTAL_QUERIES - 5) {
    const cappedStatuses = statusCodes.filter(sc => {
      const countForStatus = allDocs.filter(d => d.status === sc).length;
      return countForStatus >= ctx.PAGE_CAP;
    });
    console.info('paginateByStatusSplit: status split incomplete (' + allDocs.length + ' found' +
      (expectedFromHeader ? ', expected ~' + expectedFromHeader : '') + '), capped statuses: ' + cappedStatuses.join(', ') +
      ', starting type-code sweep (no re-auth — preserving session context)');

    // DO NOT force re-auth here — it destroys the Assai server-side search context
    // that result.aweb depends on. The SessionManager will auto-refresh if needed.

    // Fetch ALL active document type codes from DB
    let allTypeCodes: string[] = [];
    try {
      const { data: allTypes } = await ctx.supabase
        .from('dms_document_types')
        .select('code')
        .eq('is_active', true)
        .order('code');
      if (allTypes && allTypes.length > 0) {
        allTypeCodes = [...new Set(allTypes.map((t: any) => t.code).filter(Boolean))];
        console.info('paginateByStatusSplit: fetched ' + allTypeCodes.length + ' type codes from dms_document_types');
      }
    } catch (dbErr) {
      console.warn('paginateByStatusSplit: failed to fetch type codes from DB:', dbErr);
    }

    if (allTypeCodes.length > 0) {
      const typeCountInResults: Record<string, number> = {};
      for (const d of allDocs) {
        const tc = d.type_code || '';
        typeCountInResults[tc] = (typeCountInResults[tc] || 0) + 1;
      }

      const unseenTypes = allTypeCodes.filter(tc => !typeCountInResults[tc]);
      const cappedTypes = allTypeCodes.filter(tc => typeCountInResults[tc] && typeCountInResults[tc]! >= ctx.PAGE_CAP);
      const typesToSweep = [...cappedTypes, ...unseenTypes];

      console.info('paginateByStatusSplit: sweeping ' + typesToSweep.length + ' types (' + cappedTypes.length + ' capped, ' + unseenTypes.length + ' unseen)');

      let sweepQueryCount = 0;
      const statusesToSweep = cappedStatuses.length > 0 ? cappedStatuses : [''];

      for (const sweepStatus of statusesToSweep) {
        for (const tc of typesToSweep) {
          if (ctx.totalQueryCount >= ctx.MAX_TOTAL_QUERIES || (Date.now() - ctx.sweepStartTime) > ctx.SWEEP_TIME_GUARD_MS) break;
          if (expectedFromHeader && allDocs.length >= expectedFromHeader) break;

      // NO forced re-auth during sweep — it destroys the Assai server-side search context.
          // SessionManager auto-refreshes at MAX_QUERIES_BEFORE_REFRESH=50 if needed.

          try {
            const filters: Record<string, string> = { document_type: tc };
            if (sweepStatus) filters.status_code = sweepStatus;

            const typeResult = await executeFilteredSearch(ctx, params, filters);
            sweepQueryCount++;
            for (const doc of typeResult.docs) {
              if (doc.document_number && !seen.has(doc.document_number)) {
                seen.add(doc.document_number);
                allDocs.push(doc);
              }
            }
          } catch (sweepErr) {
            console.error('paginateByStatusSplit: sweep error for type=' + tc + ':', sweepErr);
          }
        }
      }
      console.info('paginateByStatusSplit: after type-code sweep, total unique docs: ' + allDocs.length);
    }
  }

  return allDocs;
}

export async function paginateSearch(
  ctx: SearchContext,
  params: { subclass_type: string; clas_seq_nr: string; suty_seq_nr: string },
): Promise<SearchResult[]> {
  const paginationStartTime = Date.now();
  const { hiddenFields, textFields } = await initSearch(ctx, params);
  console.info('[SEARCH_V11] PO=' + (ctx.poDigits || 'none') + ', number=' + ctx.document_number_pattern);

  const firstHtml = await fetchResultPage(ctx, hiddenFields, textFields, params);
  const firstDocs = parseDocuments(firstHtml, params.subclass_type);
  if (firstDocs.length === 0) return [];

  const totalFromHtml = parseTotalCount(firstHtml);
  ctx.paginationTotalAssaiCount = totalFromHtml;
  console.info('[SEARCH_V11] initial search returned ' + firstDocs.length + ' docs, parsed total: ' + (totalFromHtml ?? 'unknown'));

  // Fix 1D — diagnostic logging at escalation decision point
  console.log(
    `[Selma:SEARCH_V11] paginateSearch — firstDocs: ${firstDocs.length}, ` +
    `parsedTotal: ${totalFromHtml ?? 'unknown'}, PAGE_CAP: ${ctx.PAGE_CAP}, ` +
    `escalating to pagination: ${firstDocs.length >= ctx.PAGE_CAP}, ` +
    `totalQueryCount: ${ctx.totalQueryCount}`
  );

  if (firstDocs.length < ctx.PAGE_CAP) return firstDocs;

  // Sequential start_row pagination
  const estimatedTotal = totalFromHtml || 10000;
  const detectedPageSize = firstDocs.length;
  const allDocs = [...firstDocs];
  const metadataOnly: Array<{ document_number: string; type_code: string; status: string }> = [];
  let startRow = detectedPageSize + 1;
  const TIME_GUARD_MS = 120000;

  while (startRow <= estimatedTotal) {
    if (Date.now() - paginationStartTime > TIME_GUARD_MS) {
      console.warn('paginateSearch: time guard hit at startRow=' + startRow + ', collected ' + (allDocs.length + metadataOnly.length) + ' of ' + estimatedTotal);
      break;
    }

    await new Promise(r => setTimeout(r, 300));

    try {
      const pageHtml = await fetchResultPage(ctx, hiddenFields, textFields, params, startRow);
      const pageDocs = parseDocuments(pageHtml, params.subclass_type);
      if (pageDocs.length === 0) {
        if (startRow === detectedPageSize + 1) {
          console.warn('paginateSearch: page 2 returned 0 parseable docs — falling back to paginateByStatusSplit');
          return paginateByStatusSplit(ctx, params, firstDocs);
        }
        break;
      }

      const existingNums = new Set([
        ...allDocs.map((d: any) => d.document_number),
        ...metadataOnly.map(d => d.document_number),
      ]);
      const newDocs = pageDocs.filter((d: any) => d.document_number && !existingNums.has(d.document_number));

      if (newDocs.length === 0 && startRow === detectedPageSize + 1) {
        console.warn('paginateSearch: start_row pagination unsupported (page 2 all duplicates) — falling back to paginateByStatusSplit');
        return paginateByStatusSplit(ctx, params, firstDocs);
      }
      if (startRow === detectedPageSize + 1 && !totalFromHtml) {
        const page2Total = parseTotalCount(pageHtml);
        if (page2Total) {
          ctx.paginationTotalAssaiCount = page2Total;
          console.info('paginateSearch: got total from page 2: ' + page2Total);
        }
      }

      if (newDocs.length === 0) break;

      for (const doc of newDocs) {
        metadataOnly.push({
          document_number: doc.document_number,
          type_code: doc.type_code || '',
          status: doc.status || '',
        });
      }

      startRow += detectedPageSize;
    } catch (pageErr) {
      console.error('paginateSearch: page fetch error at startRow=' + startRow + ':', pageErr);
      break;
    }
  }

  for (const meta of metadataOnly) {
    allDocs.push({
      document_number: meta.document_number,
      type_code: meta.type_code,
      status: meta.status,
      title: '', revision: '',
      _metadataOnly: true,
    });
  }

  console.info('paginateSearch: sequential pagination complete. Full docs: ' + firstDocs.length + ', metadata-only: ' + metadataOnly.length + ', total: ' + allDocs.length + ' of ' + totalFromHtml);
  return allDocs;
}

// ============================================================
// TOP-LEVEL ENTRY POINT
// ============================================================

export interface SearchOptions {
  documentNumberPattern?: string;
  documentType?: string;
  disciplineCode?: string;
  title?: string;
  statusCode?: string;
  companyCode?: string;
  maxResults?: number;
  username: string;
  password: string;
  assaiBase: string;
  emitStatus?: (msg: string) => void;
}

export async function executeSearch(
  options: SearchOptions,
  sessionManager: SessionManager,
  supabase: any
): Promise<{ found: boolean; results: SearchResult[]; totalFound: number; total_assai_count?: number; status_summary?: Record<string, number>; type_summary?: Record<string, any>; error?: string; strategies_tried?: string[]; [key: string]: any }> {
  // Handle multi-code document_type (e.g. "2365+C01")
  const documentTypeCodes = options.documentType ? options.documentType.split('+').map((c: string) => c.trim()).filter(Boolean) : [];
  const effectiveDocType = documentTypeCodes.length === 1 ? documentTypeCodes[0] : undefined;
  const isMultiTypeSearch = documentTypeCodes.length > 1;

  // Determine module
  const isPOSearch = (options.documentNumberPattern || '').match(/%-?(\d{5})-?%?$/) || (options.documentNumberPattern || '').match(/^(\d{5})$/);
  const poDigits = isPOSearch?.[1] || '';
  const useSupDoc = options.disciplineCode === 'ZV' || !!poDigits;
  const searchBothModules = !useSupDoc && (!!options.documentType || isMultiTypeSearch) && !options.disciplineCode;

  const moduleParams = useSupDoc
    ? { subclass_type: 'SUP_DOC', clas_seq_nr: '2', suty_seq_nr: '7' }
    : { subclass_type: 'DES_DOC', clas_seq_nr: '1', suty_seq_nr: '1' };

  const ctx: SearchContext = {
    sessionManager,
    assaiBase: options.assaiBase,
    ua: ASSAI_UA,
    username: options.username,
    password: options.password,
    poDigits,
    effectiveDocType,
    moduleParams,
    searchBothModules,
    isMultiTypeSearch,
    documentTypeCodes,
    useSupDoc,
    document_number_pattern: options.documentNumberPattern || '',
    discipline_code: options.disciplineCode,
    document_type: options.documentType,
    status_code: options.statusCode || '',
    company_code: options.companyCode || '',
    title: options.title || '',
    totalQueryCount: 0,
    paginationTotalAssaiCount: null,
    sweepStartTime: Date.now(),
    SWEEP_TIME_GUARD_MS: 90000,
    MAX_TOTAL_QUERIES: 80,
    PAGE_CAP: 100,
    emitStatus: options.emitStatus || (() => {}),
    supabase,
    maxResults: options.maxResults || 50,
  };

  console.log('[SEARCH_V11]', { MAX_TOTAL_QUERIES: 80, SWEEP_TIME_GUARD_MS: 90000, strategy: 'status+type-combo-with-reauth' });

  try {
    let allDocuments: SearchResult[] = [];

    if (isMultiTypeSearch) {
      console.log('[SEARCH_V11] multi-type search with codes: ' + documentTypeCodes.join(', '));
      const seen = new Set<string>();
      for (const typeCode of documentTypeCodes) {
        for (const modParams of [
          { subclass_type: 'DES_DOC', clas_seq_nr: '1', suty_seq_nr: '1' },
          { subclass_type: 'SUP_DOC', clas_seq_nr: '2', suty_seq_nr: '7' },
        ]) {
          try {
            await ctx.sessionManager.getSession(true);
            const result = await executeFilteredSearch(ctx, modParams, { document_type: typeCode });
            console.log(`[SEARCH_V11] type=${typeCode} module=${modParams.subclass_type} returned ${result.docs.length} docs`);
            for (const doc of result.docs) {
              if (doc.document_number && !seen.has(doc.document_number)) {
                seen.add(doc.document_number);
                allDocuments.push(doc);
              }
            }
          } catch (err) {
            console.error(`[SEARCH_V11] type=${typeCode} module=${modParams.subclass_type} error:`, err);
          }
        }
      }
    } else {
      allDocuments = await paginateSearch(ctx, moduleParams);
      console.log('[SEARCH_V11] primary search returned ' + allDocuments.length + ' docs total');

      if (searchBothModules || allDocuments.length === 0) {
        const altParams = useSupDoc
          ? { subclass_type: 'DES_DOC', clas_seq_nr: '1', suty_seq_nr: '1' }
          : { subclass_type: 'SUP_DOC', clas_seq_nr: '2', suty_seq_nr: '7' };
        try {
          await ctx.sessionManager.getSession(true);
          const altDocs = await paginateSearch(ctx, altParams);
          const seen = new Set(allDocuments.map(d => d.document_number));
          for (const doc of altDocs) {
            if (doc.document_number && !seen.has(doc.document_number)) {
              seen.add(doc.document_number);
              allDocuments.push(doc);
            }
          }
          console.log('[SEARCH_V11] after alt module merge, total docs:', allDocuments.length);
        } catch (altErr) {
          console.error('[SEARCH_V11] alt module search error:', altErr);
        }
      }
    }

    // Auto-escalation
    const strategiesTried: string[] = ['initial_search'];

    if (allDocuments.length === 0 && ctx.totalQueryCount < ctx.MAX_TOTAL_QUERIES - 3) {
      console.log('[SEARCH_V11] 0 results — starting auto-escalation');

      // Strategy 1: Retry without discipline_code
      if (ctx.discipline_code && ctx.document_number_pattern) {
        try {
          strategiesTried.push('without_discipline');
          await ctx.sessionManager.getSession(true);
          const savedDiscipline = ctx.discipline_code;
          ctx.discipline_code = undefined;
          const escDocs1 = await paginateSearch(ctx, moduleParams);
          ctx.discipline_code = savedDiscipline;
          if (escDocs1.length > 0) {
            allDocuments = escDocs1;
            console.log('[SEARCH_V11] escalation without discipline found ' + escDocs1.length + ' docs');
          }
        } catch (esc1Err) {
          console.error('[SEARCH_V11] escalation strategy 1 error:', esc1Err);
        }
      }

      // Strategy 2: Title keyword search
      if (allDocuments.length === 0 && ctx.document_type && ctx.document_number_pattern) {
        try {
          const { data: typeInfo } = await supabase
            .from('dms_document_types')
            .select('document_name')
            .eq('code', (ctx.document_type || '').split('+')[0])
            .maybeSingle();

          if (typeInfo?.document_name) {
            strategiesTried.push('title_keyword:' + typeInfo.document_name);
            await ctx.sessionManager.getSession(true);
            const savedTitle = ctx.title;
            const savedDocType = ctx.document_type;
            ctx.title = typeInfo.document_name;
            ctx.document_type = undefined;
            ctx.effectiveDocType = undefined;
            const escDocs2 = await paginateSearch(ctx, moduleParams);
            ctx.title = savedTitle;
            ctx.document_type = savedDocType;
            ctx.effectiveDocType = effectiveDocType;
            if (escDocs2.length > 0) {
              allDocuments = escDocs2;
              console.log('[SEARCH_V11] escalation title keyword found ' + escDocs2.length + ' docs');
            }
          }
        } catch (esc2Err) {
          console.error('[SEARCH_V11] escalation strategy 2 error:', esc2Err);
        }
      }

      // Strategy 3: Alternate module
      if (allDocuments.length === 0 && !searchBothModules && !isMultiTypeSearch) {
        try {
          strategiesTried.push('alternate_module');
          const altModParams = useSupDoc
            ? { subclass_type: 'DES_DOC', clas_seq_nr: '1', suty_seq_nr: '1' }
            : { subclass_type: 'SUP_DOC', clas_seq_nr: '2', suty_seq_nr: '7' };
          await ctx.sessionManager.getSession(true);
          const escDocs3 = await paginateSearch(ctx, altModParams);
          if (escDocs3.length > 0) {
            allDocuments = escDocs3;
            console.log('[SEARCH_V11] escalation alt module found ' + escDocs3.length + ' docs');
          }
        } catch (esc3Err) {
          console.error('[SEARCH_V11] escalation strategy 3 error:', esc3Err);
        }
      }
    }

    if (allDocuments.length === 0) {
      return { found: false, results: [], totalFound: 0, total_found: 0, message: 'No documents found matching the search criteria in Assai. Strategies tried: ' + strategiesTried.join(', ') + '.', search_pattern: ctx.document_number_pattern, strategies_tried: strategiesTried };
    }

    // Build summaries
    const statusSummary: Record<string, number> = {};
    const typeSummary: Record<string, { count: number; statuses: Record<string, number> }> = {};
    const fullDocuments: SearchResult[] = [];
    const assaiBaseForUrls = options.assaiBase;

    allDocuments.forEach((d: any) => {
      if (!d._metadataOnly && d.pk_seq_nr && d.entt_seq_nr) {
        d.download_url = assaiBaseForUrls + '/download.aweb?pk_seq_nr=' + d.pk_seq_nr + '&entt_seq_nr=' + d.entt_seq_nr;
      }
      if (!d._metadataOnly) fullDocuments.push(d);
      if (d.status) statusSummary[d.status] = (statusSummary[d.status] || 0) + 1;
      if (d.type_code) {
        if (!typeSummary[d.type_code]) typeSummary[d.type_code] = { count: 0, statuses: {} };
        typeSummary[d.type_code].count++;
        if (d.status) typeSummary[d.type_code].statuses[d.status] = (typeSummary[d.type_code].statuses[d.status] || 0) + 1;
      }
    });

    const totalSwept = allDocuments.length;
    const realTotal = ctx.paginationTotalAssaiCount || totalSwept;
    const breakdownComplete = !ctx.paginationTotalAssaiCount || totalSwept >= ctx.paginationTotalAssaiCount;

    return {
      found: true,
      results: fullDocuments.slice(0, 100),
      totalFound: fullDocuments.length,
      total_found: fullDocuments.length,
      total_assai_count: realTotal,
      breakdown_complete: breakdownComplete,
      breakdown_coverage: totalSwept + ' of ' + realTotal,
      search_pattern: ctx.document_number_pattern,
      filters_applied: { discipline_code: ctx.discipline_code, document_type: ctx.document_type, status_code: ctx.status_code, company_code: ctx.company_code },
      status_summary: statusSummary,
      type_summary: typeSummary,
      documents: fullDocuments.slice(0, 100),
      capped: fullDocuments.length > 100,
      capped_message: fullDocuments.length > 100
        ? `Showing first 100 of ${fullDocuments.length} detailed documents. Breakdown table reflects all ${totalSwept} documents analyzed.`
        : null,
      note: !breakdownComplete
        ? `Breakdown covers ${totalSwept} of ${realTotal} documents. Apply a type or status filter for complete results on a specific category.`
        : `Complete breakdown of all ${realTotal} documents.`,
      strategies_tried: strategiesTried,
    };
  } catch (err: any) {
    console.error('[SEARCH_V11] executeSearch error:', err);
    return { found: false, results: [], totalFound: 0, error: 'Assai search failed: ' + (err.message || String(err)) };
  }
}
