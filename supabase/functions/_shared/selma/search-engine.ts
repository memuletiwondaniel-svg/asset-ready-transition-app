// ============================================================
// Selma Search Engine V11 — ported from V10 ai-chat/index.ts
// All outer-scope closure variables replaced with SearchContext
// All cookieHeader reads → ctx.sessionManager.getSession()
// All authenticateAssai() re-auth → ctx.sessionManager.getSession(true)
// ============================================================

import { authenticateAssai, ASSAI_UA } from '../assai-auth.ts';

// ============================================================
// SESSION MANAGER
// ============================================================

export class SessionManager {
  private cookieHeader: string = '';
  private queryCount: number = 0;
  private lastAuthTime: number = 0;
  private readonly MAX_QUERIES_BEFORE_REFRESH = 12;
  private readonly MAX_AGE_MS = 90000;

  constructor(
    private loginFn: () => Promise<{ cookies: string }>
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

  poDigits: string;
  effectiveDocType: string;
  moduleParams: Record<string, string>;
  searchBothModules: boolean;
  isMultiTypeSearch: boolean;
  documentTypeCodes: string[];
  useSupDoc: boolean;

  document_number_pattern: string;
  discipline_code: string;
  document_type: string;
  status_code: string;
  company_code: string;
  title: string;

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

export function parseDocuments(html: string, subclass: string): SearchResult[] {
  // Early exit: detect Assai error pages
  if (html.includes('applet:error') || html.includes('error.aweb?message=showErrorInfo')) {
    console.error('parseDocuments: Assai returned an error page — skipping parse');
    return [];
  }

  // Strategy 1: parse myCells JavaScript variable
  const match = html.match(/var\s+myCells\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function|\/\/|$)/m);
  if (match) {
    try {
      const myCells = JSON.parse(match[1]);
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
          subclass,
        }));
      }
    } catch (e) {
      console.error('parseDocuments: myCells parse error, trying TR fallback:', e);
    }
  }

  // Strategy 2: parse raw <tr>/<td> elements
  console.info('parseDocuments: myCells not found, using TR/TD fallback');
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
        subclass,
      });
    }
  }
  if (docs.length > 0) {
    console.info('parseDocuments: TR/TD fallback found ' + docs.length + ' rows');
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
// STATEFUL FUNCTIONS
// ============================================================

export async function initSearch(
  ctx: SearchContext,
  params: Record<string, string>
): Promise<{ hiddenFields: Array<{ name: string; type: string; value: string }>; textFields: Array<{ name: string }> }> {
  const cookie = await ctx.sessionManager.getSession();
  const searchUrl = ctx.assaiBase + '/search.aweb?subclass_type=' + params.subclass_type;
  const searchResp = await fetch(searchUrl, {
    headers: { Cookie: cookie, Accept: 'text/html', 'User-Agent': ctx.ua },
    redirect: 'follow',
  });
  const searchHtml = await searchResp.text();
  const fields = extractHiddenFields(searchHtml);
  const hiddenFields = fields.filter(f => f.type === 'hidden' && f.name && f.value);
  const textFields = fields.filter(f => f.type === 'text' || f.type === '');
  console.info('initSearch: search.aweb GET status ' + searchResp.status + ', html length: ' + searchHtml.length + ', hidden fields: ' + hiddenFields.length);
  return { hiddenFields, textFields };
}

export async function fetchResultPage(
  ctx: SearchContext,
  hiddenFields: Array<{ name: string; type: string; value: string }>,
  textFields: Array<{ name: string }>,
  params: Record<string, string>,
  startRow?: number,
): Promise<string> {
  const cookie = await ctx.sessionManager.getSession();
  const formData = new URLSearchParams();
  for (const f of hiddenFields) formData.set(f.name, f.value);
  for (const f of textFields) formData.set(f.name, '');
  formData.set('subclass_type', params.subclass_type);
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
  const resultResp = await fetch(ctx.assaiBase + '/result.aweb', {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html',
      Referer: searchUrl,
      'User-Agent': ctx.ua,
    },
    body: formData.toString(),
    redirect: 'follow',
  });
  const resultHtml = await resultResp.text();
  console.info('result.aweb POST (start_row=' + (startRow ?? 1) + '): status ' + resultResp.status + ', html length: ' + resultHtml.length);
  return resultHtml;
}

export async function executeFilteredSearch(
  ctx: SearchContext,
  params: Record<string, string>,
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

  const cookie = await ctx.sessionManager.getSession();
  const formData = new URLSearchParams();
  for (const f of subHidden) formData.set(f.name, f.value);
  for (const f of subText) formData.set(f.name, '');
  formData.set('subclass_type', params.subclass_type);
  if (ctx.poDigits) {
    formData.set('purchase_code', ctx.poDigits);
  } else {
    formData.set('number', ctx.document_number_pattern);
  }
  if (ctx.discipline_code) formData.set('discipline_code', ctx.discipline_code);
  if (ctx.effectiveDocType) formData.set('document_type', ctx.effectiveDocType);
  if (ctx.company_code) formData.set('company_code', ctx.company_code);
  if (ctx.title) formData.set('description', ctx.title);
  for (const [k, v] of Object.entries(extraFilters)) {
    formData.set(k, v);
  }
  if (startRow && startRow > 1) formData.set('start_row', String(startRow));

  const searchUrl = ctx.assaiBase + '/search.aweb?subclass_type=' + params.subclass_type;
  const resp = await fetch(ctx.assaiBase + '/result.aweb', {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html',
      Referer: searchUrl,
      'User-Agent': ctx.ua,
    },
    body: formData.toString(),
    redirect: 'follow',
  });
  const html = await resp.text();
  return { docs: parseDocuments(html, params.subclass_type), hiddenFields: subHidden, textFields: subText };
}

export async function paginateFilteredSearch(
  ctx: SearchContext,
  params: Record<string, string>,
  extraFilters: Record<string, string>,
  firstResult: { docs: SearchResult[]; hiddenFields: any[]; textFields: any[] },
  seen: Set<string>,
  allDocs: SearchResult[]
): Promise<void> {
  const pageSize = firstResult.docs.length || ctx.PAGE_CAP;
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
  params: Record<string, string>,
  firstDocs: SearchResult[]
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

  // Strategy 1: Status-split
  const statusCodes = [...new Set(firstDocs.map((d: any) => d.status).filter(Boolean))];
  console.info('paginateByStatusSplit: splitting into ' + statusCodes.length + ' status sub-searches');

  if (statusCodes.length > 1) {
    for (const sc of statusCodes) {
      if (ctx.totalQueryCount >= ctx.MAX_TOTAL_QUERIES || (Date.now() - ctx.sweepStartTime) > ctx.SWEEP_TIME_GUARD_MS) break;
      try {
        const result = await executeFilteredSearch(ctx, params, { status_code: sc });
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
  }

  // Strategy 2: Type-code sweep if status split incomplete
  const expectedFromHeader = ctx.paginationTotalAssaiCount;
  const needsTypeSweep = expectedFromHeader ? allDocs.length < expectedFromHeader :
    statusCodes.some(sc => allDocs.filter(d => d.status === sc).length >= ctx.PAGE_CAP);

  if (needsTypeSweep && ctx.totalQueryCount < ctx.MAX_TOTAL_QUERIES - 5) {
    const cappedStatuses = statusCodes.filter(sc =>
      allDocs.filter(d => d.status === sc).length >= ctx.PAGE_CAP
    );
    console.info('paginateByStatusSplit: starting type-code sweep with re-auth');

    // Re-auth before sweep
    await ctx.sessionManager.getSession(true);
    // label.aweb warmup
    const warmupCookie = await ctx.sessionManager.getSession();
    await fetch(ctx.assaiBase + '/label.aweb', { headers: { Cookie: warmupCookie, 'User-Agent': ctx.ua }, redirect: 'follow' }).catch(() => {});

    // Fetch all active type codes from DB
    let allTypeCodes: string[] = [];
    try {
      const { data: allTypes } = await ctx.supabase
        .from('dms_document_types')
        .select('code')
        .eq('is_active', true)
        .order('code');
      if (allTypes?.length > 0) {
        allTypeCodes = [...new Set(allTypes.map((t: any) => t.code).filter(Boolean))];
      }
    } catch (dbErr) {
      console.warn('paginateByStatusSplit: failed to fetch type codes:', dbErr);
    }

    if (allTypeCodes.length > 0) {
      const typeCountInResults: Record<string, number> = {};
      for (const d of allDocs) {
        const tc = d.type_code || '';
        typeCountInResults[tc] = (typeCountInResults[tc] || 0) + 1;
      }

      const unseenTypes = allTypeCodes.filter(tc => !typeCountInResults[tc]);
      const cappedTypes = allTypeCodes.filter(tc => typeCountInResults[tc] && typeCountInResults[tc] >= ctx.PAGE_CAP);
      const typesToSweep = [...cappedTypes, ...unseenTypes];

      let sweepQueryCount = 0;
      const statusesToSweep = cappedStatuses.length > 0 ? cappedStatuses : [''];

      for (const sweepStatus of statusesToSweep) {
        for (const tc of typesToSweep) {
          if (ctx.totalQueryCount >= ctx.MAX_TOTAL_QUERIES || (Date.now() - ctx.sweepStartTime) > ctx.SWEEP_TIME_GUARD_MS) break;
          if (expectedFromHeader && allDocs.length >= expectedFromHeader) break;

          // Mid-sweep re-auth every 15 queries
          if (sweepQueryCount > 0 && sweepQueryCount % 15 === 0) {
            await ctx.sessionManager.getSession(true);
            const midCookie = await ctx.sessionManager.getSession();
            await fetch(ctx.assaiBase + '/label.aweb', { headers: { Cookie: midCookie, 'User-Agent': ctx.ua }, redirect: 'follow' }).catch(() => {});
          }

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
            if (typeResult.docs.length >= ctx.PAGE_CAP) {
              await paginateFilteredSearch(ctx, params, filters, typeResult, seen, allDocs);
            }
          } catch {
            // Skip silently
          }
        }
        if (ctx.totalQueryCount >= ctx.MAX_TOTAL_QUERIES || (Date.now() - ctx.sweepStartTime) > ctx.SWEEP_TIME_GUARD_MS) break;
      }
    }
  }

  console.info('paginateByStatusSplit: complete. Total unique docs: ' + allDocs.length + ' (queries: ' + ctx.totalQueryCount + ')');
  return allDocs;
}

export async function paginateSearch(
  ctx: SearchContext,
  params: Record<string, string>
): Promise<SearchResult[]> {
  const paginationStartTime = Date.now();
  const { hiddenFields, textFields } = await initSearch(ctx, params);

  const firstHtml = await fetchResultPage(ctx, hiddenFields, textFields, params);
  const firstDocs = parseDocuments(firstHtml, params.subclass_type);
  if (firstDocs.length === 0) return [];

  const totalFromHtml = parseTotalCount(firstHtml);
  ctx.paginationTotalAssaiCount = totalFromHtml;
  console.info('paginateSearch: initial search returned ' + firstDocs.length + ' docs, total: ' + (totalFromHtml ?? 'unknown'));

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
      console.warn('paginateSearch: time guard hit at startRow=' + startRow);
      break;
    }

    await new Promise(r => setTimeout(r, 300));

    try {
      const pageHtml = await fetchResultPage(ctx, hiddenFields, textFields, params, startRow);
      const pageDocs = parseDocuments(pageHtml, params.subclass_type);
      if (pageDocs.length === 0) {
        if (startRow === detectedPageSize + 1) {
          console.warn('paginateSearch: page 2 returned 0 docs — falling back to paginateByStatusSplit');
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
        console.warn('paginateSearch: start_row unsupported (page 2 all duplicates) — falling back');
        return paginateByStatusSplit(ctx, params, firstDocs);
      }
      if (startRow === detectedPageSize + 1 && !totalFromHtml) {
        const page2Total = parseTotalCount(pageHtml);
        if (page2Total) {
          ctx.paginationTotalAssaiCount = page2Total;
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
      title: '',
      revision: '',
      _metadataOnly: true,
    });
  }

  console.info('paginateSearch: complete. Full: ' + firstDocs.length + ', metadata: ' + metadataOnly.length + ', total: ' + allDocs.length);
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
  emitStatus?: (msg: string) => void;
}

export async function executeSearch(
  options: SearchOptions,
  sessionManager: SessionManager,
  supabase: any
): Promise<{ found: boolean; results: SearchResult[]; total_found: number; strategies_tried?: string[]; error?: string }> {
  const documentTypeCodes = options.documentType ? options.documentType.split('+').map((c: string) => c.trim()).filter(Boolean) : [];
  const effectiveDocType = documentTypeCodes.length === 1 ? documentTypeCodes[0] : '';
  const isMultiTypeSearch = documentTypeCodes.length > 1;

  const isPOSearch = (options.documentNumberPattern || '').match(/%-?(\d{5})-?%?$/) || (options.documentNumberPattern || '').match(/^(\d{5})$/);
  const poDigits = isPOSearch?.[1] || '';
  const useSupDoc = options.disciplineCode === 'ZV' || !!poDigits;
  const searchBothModules = !useSupDoc && (!!options.documentType || isMultiTypeSearch) && !options.disciplineCode;

  const moduleParams = useSupDoc
    ? { subclass_type: 'SUP_DOC', clas_seq_nr: '2', suty_seq_nr: '7' }
    : { subclass_type: 'DES_DOC', clas_seq_nr: '1', suty_seq_nr: '1' };

  const ctx: SearchContext = {
    sessionManager,
    assaiBase: 'https://eu.assaicloud.com/AWeu578',
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
    discipline_code: options.disciplineCode || '',
    document_type: options.documentType || '',
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

  console.log('[SEARCH_V11]', { MAX_TOTAL_QUERIES: 80, SWEEP_TIME_GUARD_MS: 90000, poDigits, useSupDoc, searchBothModules, isMultiTypeSearch });

  try {
    let allDocuments: SearchResult[] = [];

    if (isMultiTypeSearch) {
      // Multi-type: separate searches per type code across both modules
      const seen = new Set<string>();
      for (const typeCode of documentTypeCodes) {
        for (const modParams of [
          { subclass_type: 'DES_DOC', clas_seq_nr: '1', suty_seq_nr: '1' },
          { subclass_type: 'SUP_DOC', clas_seq_nr: '2', suty_seq_nr: '7' },
        ]) {
          try {
            await ctx.sessionManager.getSession(true);
            const warmupCookie = await ctx.sessionManager.getSession();
            await fetch(ctx.assaiBase + '/label.aweb', { headers: { Cookie: warmupCookie, 'User-Agent': ctx.ua }, redirect: 'follow' }).catch(() => {});
            const docs = await executeFilteredSearch(ctx, modParams, { document_type: typeCode });
            for (const doc of docs.docs) {
              if (doc.document_number && !seen.has(doc.document_number)) {
                seen.add(doc.document_number);
                allDocuments.push(doc);
              }
            }
          } catch (err) {
            console.error(`search: type=${typeCode} module=${modParams.subclass_type} error:`, err);
          }
        }
      }
    } else {
      allDocuments = await paginateSearch(ctx, moduleParams);

      // Search alt module if searchBothModules or 0 results
      if (searchBothModules || allDocuments.length === 0) {
        const altParams = useSupDoc
          ? { subclass_type: 'DES_DOC', clas_seq_nr: '1', suty_seq_nr: '1' }
          : { subclass_type: 'SUP_DOC', clas_seq_nr: '2', suty_seq_nr: '7' };
        try {
          await ctx.sessionManager.getSession(true);
          const warmupCookie = await ctx.sessionManager.getSession();
          await fetch(ctx.assaiBase + '/label.aweb', { headers: { Cookie: warmupCookie, 'User-Agent': ctx.ua }, redirect: 'follow' }).catch(() => {});
          const altDocs = await paginateSearch(ctx, altParams);
          const seen = new Set(allDocuments.map(d => d.document_number));
          for (const doc of altDocs) {
            if (doc.document_number && !seen.has(doc.document_number)) {
              seen.add(doc.document_number);
              allDocuments.push(doc);
            }
          }
        } catch (altErr) {
          console.error('search: alt module error:', altErr);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // AUTO-ESCALATION: If 0 results, try relaxed searches
    // ═══════════════════════════════════════════════════════════════
    const strategiesTried: string[] = ['initial_search'];

    if (allDocuments.length === 0 && ctx.totalQueryCount < ctx.MAX_TOTAL_QUERIES - 3) {
      // Strategy 1: Retry without discipline_code
      if (ctx.discipline_code && ctx.document_number_pattern) {
        try {
          strategiesTried.push('without_discipline');
          await ctx.sessionManager.getSession(true);
          const wc = await ctx.sessionManager.getSession();
          await fetch(ctx.assaiBase + '/label.aweb', { headers: { Cookie: wc, 'User-Agent': ctx.ua }, redirect: 'follow' }).catch(() => {});
          const savedDiscipline = ctx.discipline_code;
          ctx.discipline_code = '';
          const escDocs1 = await paginateSearch(ctx, moduleParams);
          ctx.discipline_code = savedDiscipline;
          if (escDocs1.length > 0) allDocuments = escDocs1;
        } catch (e) {
          console.error('escalation strategy 1 error:', e);
        }
      }

      // Strategy 2: Title keyword search
      if (allDocuments.length === 0 && ctx.document_type && ctx.document_number_pattern) {
        try {
          const { data: typeInfo } = await supabase
            .from('dms_document_types')
            .select('document_name')
            .eq('code', ctx.document_type.split('+')[0])
            .maybeSingle();
          if (typeInfo?.document_name) {
            strategiesTried.push('title_keyword:' + typeInfo.document_name);
            await ctx.sessionManager.getSession(true);
            const wc = await ctx.sessionManager.getSession();
            await fetch(ctx.assaiBase + '/label.aweb', { headers: { Cookie: wc, 'User-Agent': ctx.ua }, redirect: 'follow' }).catch(() => {});
            const savedTitle = ctx.title;
            const savedDocType = ctx.document_type;
            ctx.title = typeInfo.document_name;
            ctx.document_type = '';
            ctx.effectiveDocType = '';
            const escDocs2 = await paginateSearch(ctx, moduleParams);
            ctx.title = savedTitle;
            ctx.document_type = savedDocType;
            ctx.effectiveDocType = effectiveDocType;
            if (escDocs2.length > 0) allDocuments = escDocs2;
          }
        } catch (e) {
          console.error('escalation strategy 2 error:', e);
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
          const wc = await ctx.sessionManager.getSession();
          await fetch(ctx.assaiBase + '/label.aweb', { headers: { Cookie: wc, 'User-Agent': ctx.ua }, redirect: 'follow' }).catch(() => {});
          const escDocs3 = await paginateSearch(ctx, altModParams);
          if (escDocs3.length > 0) allDocuments = escDocs3;
        } catch (e) {
          console.error('escalation strategy 3 error:', e);
        }
      }
    }

    if (allDocuments.length === 0) {
      return {
        found: false,
        total_found: 0,
        results: [],
        strategies_tried: strategiesTried,
        error: 'No documents found. Strategies tried: ' + strategiesTried.join(', '),
      };
    }

    // Build summary
    const fullDocs = allDocuments.filter(d => !d._metadataOnly);
    const metaDocs = allDocuments.filter(d => d._metadataOnly);
    const statusBreakdown: Record<string, number> = {};
    const typeBreakdown: Record<string, number> = {};
    for (const d of allDocuments) {
      if (d.status) statusBreakdown[d.status] = (statusBreakdown[d.status] || 0) + 1;
      if (d.type_code) typeBreakdown[d.type_code] = (typeBreakdown[d.type_code] || 0) + 1;
    }

    return {
      found: true,
      total_found: allDocuments.length,
      results: fullDocs.slice(0, options.maxResults || 50),
      strategies_tried: strategiesTried,
    };
  } catch (err: any) {
    console.error('[Selma:SEARCH_V11] executeSearch error:', err);
    return { found: false, results: [], total_found: 0, error: err.message };
  }
}
