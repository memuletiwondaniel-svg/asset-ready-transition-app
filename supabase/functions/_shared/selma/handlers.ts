// ============================================================
// Selma Tool Handlers — includes session factory and all 6 tool executors
// ============================================================

import { SessionManager, executeSearch, extractHiddenFields, parseDocuments, type SearchOptions, type SearchResult } from './search-engine.ts';
import { authenticateAssai, ASSAI_UA } from '../assai-auth.ts';

// ============================================================
// SESSION MANAGER FACTORY
// ============================================================

export async function buildSelmaSessionManager(
  supabase: any
): Promise<{ sessionManager: SessionManager; username: string; password: string; assaiBase: string }> {
  const { data: creds, error } = await supabase
    .from('dms_sync_credentials')
    .select('username_encrypted, password_encrypted, base_url, db_name')
    .eq('dms_platform', 'assai')
    .limit(1)
    .single();

  if (error || !creds) throw new Error('Failed to fetch Assai credentials for Selma');

  // Credentials are encrypted — decrypt before use
  const { isEncrypted, decrypt } = await import('../crypto.ts');
  let username: string = creds.username_encrypted || '';
  let password: string = creds.password_encrypted || '';
  if (username && isEncrypted(username)) username = await decrypt(username);
  if (password && isEncrypted(password)) password = await decrypt(password);

  const baseUrl = (creds.base_url || 'https://eu.assaicloud.com').replace(/\/+$/, '');
  const dbName = creds.db_name || 'eu578';
  const assaiBase = baseUrl + '/AW' + dbName;

  const sessionManager = new SessionManager(async () => {
    const result = await authenticateAssai(assaiBase, username, password);
    if (!result.success) throw new Error(`Assai auth failed: status ${result.statusCode}`);
    return { cookies: result.cookies };
  });

  return { sessionManager, username, password, assaiBase };
}

// ============================================================
// TOOL EXECUTOR
// ============================================================

export async function executeSelmaTool(
  name: string,
  input: any,
  supabase: any,
  selmaSession: { sessionManager: SessionManager; username: string; password: string; assaiBase: string },
  emitStatus: (msg: string) => void
): Promise<any> {
  const { sessionManager, username, password, assaiBase } = selmaSession;
  console.log(`[Selma] Tool: ${name}`, JSON.stringify(input));

  switch (name) {

    case 'resolve_document_type': {
      const query = String(input.query || '').trim();
      const cleanQuery = query.toUpperCase().replace(/[^A-Z0-9&]/g, '');

      // Step 1: Exact acronym match
      const { data: acronymMatch } = await supabase
        .from('dms_document_type_acronyms')
        .select('acronym, full_name, type_code, notes, usage_count')
        .eq('acronym', cleanQuery)
        .maybeSingle();

      if (acronymMatch) {
        // Increment usage count (fire-and-forget)
        supabase
          .from('dms_document_type_acronyms')
          .update({ usage_count: (acronymMatch.usage_count || 0) + 1, updated_at: new Date().toISOString() })
          .eq('acronym', cleanQuery)
          .then(() => {});

        // Fetch full type details
        const { data: typeDetails } = await supabase
          .from('dms_document_types')
          .select('code, document_name, document_description, discipline_code')
          .eq('code', acronymMatch.type_code)
          .maybeSingle();

        // Cross-discipline: find ALL codes matching this document type name
        const crossDisciplineCodes = new Set([acronymMatch.type_code]);
        if (typeDetails?.document_name) {
          const { data: crossTypes } = await supabase
            .from('dms_document_types')
            .select('code')
            .eq('document_name', typeDetails.document_name)
            .eq('is_active', true);
          if (crossTypes) {
            for (const ct of crossTypes) crossDisciplineCodes.add(ct.code);
          }
        }

        return {
          found: true,
          source: 'learned_acronyms',
          acronym: acronymMatch.acronym,
          type_code: acronymMatch.type_code,
          full_name: acronymMatch.full_name,
          notes: acronymMatch.notes,
          cross_discipline_codes: [...crossDisciplineCodes],
          combined_code: [...crossDisciplineCodes].join('+'),
          type_details: typeDetails,
        };
      }

      // Step 2: Fuzzy match on dms_document_types
      const { data: types } = await supabase
        .from('dms_document_types')
        .select('id, code, document_name, document_description, discipline_code')
        .eq('is_active', true)
        .or(`code.ilike.%${cleanQuery}%,document_name.ilike.%${query}%`)
        .limit(8);

      if (types && types.length > 0) {
        // Group by document_name to combine cross-discipline codes
        const byName: Record<string, string[]> = {};
        for (const t of types) {
          const name = t.document_name || t.code;
          if (!byName[name]) byName[name] = [];
          byName[name].push(t.code);
        }

        return {
          found: true,
          source: 'dms_document_types',
          matches: types.map((t: any) => ({
            code: t.code,
            document_name: t.document_name,
            discipline_code: t.discipline_code,
          })),
          combined_codes: Object.entries(byName).map(([name, codes]) => ({
            name,
            codes,
            combined: codes.join('+'),
          })),
          query: cleanQuery,
        };
      }

      return { found: false, source: 'none', query: cleanQuery, message: `No document type found matching "${query}". Try a different abbreviation or the full document type name.` };
    }

    case 'resolve_project_code': {
      const raw = String(input.dp_number || '').toUpperCase().replace(/\s+/g, '');
      const normalised = raw.startsWith('DP-') ? raw : raw.replace(/^DP/, 'DP-');
      const withoutHyphen = normalised.replace('DP-', 'DP');
      const numericPart = normalised.replace(/^DP-?/, '');

      const { data: projects } = await supabase
        .from('dms_projects')
        .select('code, project_id, project_name, cabinet, proj_seq_nr')
        .eq('is_active', true)
        .or(`project_id.ilike.%${normalised}%,project_id.ilike.%${withoutHyphen}%,project_id.ilike.%${numericPart}%`)
        .limit(10);

      return { dp_number: normalised, projects: projects || [] };
    }

    case 'search_assai_documents': {
      emitStatus('Searching Assai DMS...');

      // Auto-resolve DP references in document_number_pattern
      let docPattern = input.document_number_pattern || '';
      const dpInPattern = docPattern.match(/^(\d{4})-%-?DP-?\d+-?%?$/i);
      if (dpInPattern) {
        docPattern = dpInPattern[1] + '-%';
      }
      const dpOnly = docPattern.match(/^DP-?(\d+)$/i);
      if (dpOnly) {
        const { data: dpProject } = await supabase
          .from('dms_projects')
          .select('code')
          .ilike('project_id', `%${dpOnly[1]}%`)
          .limit(1)
          .maybeSingle();
        if (dpProject) docPattern = dpProject.code + '-%';
      }

      return await executeSearch(
        {
          documentNumberPattern: docPattern,
          documentType: input.document_type,
          disciplineCode: input.discipline_code,
          title: input.title,
          statusCode: input.status_code,
          companyCode: input.company_code,
          maxResults: input.max_results || 50,
          username,
          password,
          emitStatus,
        } as SearchOptions,
        sessionManager,
        supabase
      );
    }

    case 'read_assai_document': {
      emitStatus(`Reading document ${input.document_number}...`);
      const docNumber = input.document_number;
      const question = input.analysis_focus || 'Summarise this document. Identify key technical details, scope, revision status, and any items requiring attention.';

      // Initialize metadata
      const metadata: Record<string, any> = {
        document_number: docNumber,
        title: 'Unknown',
        status: 'Unknown',
        revision: 'Unknown',
        platform: 'assai',
      };

      // Step 1: Authenticate
      const cookieHeader = await sessionManager.getSession();

      // Step 2: initSearch DES_DOC — extract hidden fields
      const extractFields = (html: string) => {
        const fields = extractHiddenFields(html);
        return {
          hidden: fields.filter(f => f.type === 'hidden' && f.name && f.value),
          text: fields.filter(f => f.type === 'text' || f.type === ''),
        };
      };

      let pkSeqNr: string | null = null;
      let enttSeqNr: string | null = null;
      let activeCookie = cookieHeader;

      try {
        const initUrl = assaiBase + '/search.aweb?subclass_type=DES_DOC';
        const initResp = await fetch(initUrl, {
          headers: { Cookie: activeCookie, Accept: 'text/html', 'User-Agent': ASSAI_UA },
          redirect: 'follow',
        });
        const initHtml = await initResp.text();
        const { hidden, text } = extractFields(initHtml);

        // Search by exact document number
        const searchParams = new URLSearchParams();
        for (const f of hidden) searchParams.set(f.name, f.value);
        for (const f of text) searchParams.set(f.name, '');
        searchParams.set('subclass_type', 'DES_DOC');
        searchParams.set('number', docNumber);

        const searchRes = await fetch(assaiBase + '/result.aweb', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': activeCookie,
            'User-Agent': ASSAI_UA,
            'Referer': initUrl,
          },
          body: searchParams.toString(),
          redirect: 'follow',
        });
        const searchHtml = await searchRes.text();

        // Parse myCells for pk_seq_nr and entt_seq_nr
        const myCellsMatch = searchHtml.match(/var\s+myCells\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function)/);
        if (myCellsMatch) {
          try {
            const myCells = JSON.parse(myCellsMatch[1]);
            if (myCells.length > 0) {
              const row = myCells[0];
              const strip = (s: string) => String(s || '').replace(/<[^>]*>/g, '').trim();
              metadata.title = strip(row[8]) || metadata.title;
              metadata.status = strip(row[6]) || metadata.status;
              metadata.revision = strip(row[4]) || metadata.revision;
              metadata.responsible_engineer = strip(row[11]);
              metadata.company = strip(row[12]);
              metadata.discipline = strip(row[13]);
              metadata.document_type = strip(row[14]);
              metadata.work_package = strip(row[15]);
              metadata.checked_out = strip(row[37] || 'N');
              pkSeqNr = strip(row[33]);
              enttSeqNr = strip(row[34]);
            }
          } catch {}
        }

        // If not found in DES_DOC, try SUP_DOC with fresh session
        if (!pkSeqNr || !enttSeqNr) {
          // Re-auth for SUP_DOC module
          activeCookie = await sessionManager.getSession(true);
          await fetch(assaiBase + '/label.aweb', { headers: { Cookie: activeCookie, 'User-Agent': ASSAI_UA }, redirect: 'follow' }).catch(() => {});

          const supInitUrl = assaiBase + '/search.aweb?subclass_type=SUP_DOC';
          const supInitResp = await fetch(supInitUrl, {
            headers: { Cookie: activeCookie, Accept: 'text/html', 'User-Agent': ASSAI_UA },
            redirect: 'follow',
          });
          const supInitHtml = await supInitResp.text();
          const supFields = extractFields(supInitHtml);

          const supParams = new URLSearchParams();
          for (const f of supFields.hidden) supParams.set(f.name, f.value);
          for (const f of supFields.text) supParams.set(f.name, '');
          supParams.set('subclass_type', 'SUP_DOC');
          supParams.set('number', docNumber);

          const supRes = await fetch(assaiBase + '/result.aweb', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Cookie': activeCookie,
              'User-Agent': ASSAI_UA,
              'Referer': supInitUrl,
            },
            body: supParams.toString(),
            redirect: 'follow',
          });
          const supHtml = await supRes.text();

          const supMatch = supHtml.match(/var\s+myCells\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function)/);
          if (supMatch) {
            try {
              const supCells = JSON.parse(supMatch[1]);
              if (supCells.length > 0) {
                const row = supCells[0];
                const strip = (s: string) => String(s || '').replace(/<[^>]*>/g, '').trim();
                metadata.title = strip(row[8]) || metadata.title;
                metadata.status = strip(row[6]) || metadata.status;
                metadata.revision = strip(row[4]) || metadata.revision;
                metadata.subclass = 'SUP_DOC';
                pkSeqNr = strip(row[33]);
                enttSeqNr = strip(row[34]);
              }
            } catch {}
          }
        }
      } catch (searchErr: any) {
        console.error('read_assai_document search error:', searchErr);
      }

      if (!pkSeqNr || !enttSeqNr || pkSeqNr === '' || enttSeqNr === '') {
        return {
          metadata,
          content_available: false,
          reason: `Document ${docNumber} was not found in Assai (searched across all projects).`,
          question_asked: question
        };
      }

      if (metadata.checked_out === 'Y') {
        return {
          metadata,
          content_available: false,
          reason: 'Document is currently checked out and cannot be downloaded.',
          question_asked: question
        };
      }

      // Step 3: Download document
      let pdfBase64: string | null = null;
      let documentMediaType = 'application/pdf';
      const downloadUrl = assaiBase + '/download.aweb?pk_seq_nr=' + pkSeqNr + '&entt_seq_nr=' + enttSeqNr;

      const attemptDownload = async (cookies: string, label: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        console.log(`read_assai_document: downloading (${label}) pk_seq_nr=${pkSeqNr}, entt_seq_nr=${enttSeqNr}`);
        const res = await fetch(downloadUrl, {
          headers: { 'Cookie': cookies, 'User-Agent': ASSAI_UA },
          signal: controller.signal,
          redirect: 'follow'
        });
        clearTimeout(timeoutId);
        return res;
      };

      try {
        let docRes = await attemptDownload(activeCookie, 'search-session');

        const ct1 = docRes.headers.get('content-type') || '';
        if (!docRes.ok || ct1.includes('text/html')) {
          // Retry with fresh session + search context
          activeCookie = await sessionManager.getSession(true);
          try {
            const initResp2 = await fetch(assaiBase + '/search.aweb?subclass_type=DES_DOC', {
              headers: { Cookie: activeCookie, Accept: 'text/html', 'User-Agent': ASSAI_UA },
              redirect: 'follow',
            });
            const initHtml2 = await initResp2.text();
            const fields2 = extractFields(initHtml2);
            const sp2 = new URLSearchParams();
            for (const f of fields2.hidden) sp2.set(f.name, f.value);
            for (const f of fields2.text) sp2.set(f.name, '');
            sp2.set('subclass_type', 'DES_DOC');
            sp2.set('number', docNumber);
            await fetch(assaiBase + '/result.aweb', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': activeCookie,
                'User-Agent': ASSAI_UA,
                'Referer': assaiBase + '/search.aweb?subclass_type=DES_DOC',
              },
              body: sp2.toString(),
              redirect: 'follow',
            });
          } catch {}
          docRes = await attemptDownload(activeCookie, 'fresh-session');
        }

        if (!docRes.ok) {
          return { metadata, content_available: false, reason: 'Download failed (HTTP ' + docRes.status + ').', question_asked: question };
        }

        const contentType = docRes.headers.get('content-type') || '';
        if (contentType.includes('pdf')) documentMediaType = 'application/pdf';
        else if (contentType.includes('image')) documentMediaType = contentType.split(';')[0].trim();

        const arrayBuffer = await docRes.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        if (bytes.length > 10 * 1024 * 1024) {
          return { metadata, content_available: false, reason: 'Document exceeds 10MB limit.', question_asked: question };
        }

        // HTML error page detection
        if (contentType.includes('text/html')) {
          return { metadata, content_available: false, reason: 'Assai returned an error page instead of the document.', question_asked: question };
        }
        const firstNonWs = bytes.findIndex(b => b !== 0x0D && b !== 0x0A && b !== 0x20 && b !== 0x09);
        if (firstNonWs >= 0 && bytes[firstNonWs] === 0x3C) {
          const firstChunk = new TextDecoder().decode(bytes.slice(0, 500)).toLowerCase();
          if (firstChunk.includes('<!doctype') || firstChunk.includes('<html') || firstChunk.includes('applet:error')) {
            return { metadata, content_available: false, reason: 'Assai returned an error page instead of the document.', question_asked: question };
          }
        }

        // PDF magic byte validation
        const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
        if (!isPdf && documentMediaType === 'application/pdf') {
          const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;
          const isOle = bytes[0] === 0xD0 && bytes[1] === 0xCF;
          if (isZip || isOle) {
            return { metadata, content_available: false, reason: 'Document is in Office format (Excel/Word), not PDF.', question_asked: question };
          }
          return { metadata, content_available: false, reason: 'Downloaded file is not a valid PDF.', question_asked: question };
        }

        // Base64 encode
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        pdfBase64 = btoa(binary);
      } catch (fetchErr: any) {
        if (fetchErr?.name === 'AbortError') {
          return { metadata, content_available: false, reason: 'Download timed out (>15s).', question_asked: question };
        }
        return { metadata, content_available: false, reason: 'Download failed: ' + (fetchErr?.message || 'Unknown error'), question_asked: question };
      }

      // Step 4: Claude inner-call for content analysis
      if (pdfBase64) {
        try {
          const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
          if (!ANTHROPIC_KEY) {
            return { metadata, content_available: false, reason: 'AI reading service not configured.', question_asked: question };
          }

          const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_KEY,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 2000,
              messages: [{
                role: "user",
                content: [
                  {
                    type: "document",
                    source: { type: "base64", media_type: documentMediaType, data: pdfBase64 }
                  },
                  { type: "text", text: question }
                ]
              }]
            }),
          });

          if (!claudeRes.ok) {
            const errText = await claudeRes.text();
            console.error('Claude document reading error:', claudeRes.status, errText.substring(0, 300));
            return { metadata, content_available: false, reason: 'AI could not process the document.', question_asked: question };
          }

          const claudeResult = await claudeRes.json();
          const textContent = (claudeResult.content || [])
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text)
            .join('\n');

          return {
            metadata,
            content_available: true,
            document_content_answer: textContent,
            question_asked: question,
            note: 'This answer is based on the actual document content fetched live from Assai DMS.'
          };
        } catch (claudeErr) {
          console.error('Claude document reading exception:', claudeErr);
          return { metadata, content_available: false, reason: 'AI reading encountered an error.', question_asked: question };
        }
      }

      return { metadata, content_available: false, reason: 'Document content could not be retrieved.', question_asked: question };
    }

    case 'discover_project_vendors': {
      emitStatus('Discovering project vendors...');
      const projectCode = input.project_code;
      if (!projectCode) return { error: 'project_code is required.' };

      // Resolve DP number to Assai code
      let resolvedCode = projectCode;
      let resolvedProjectId: string | null = null;

      const dpMatch = projectCode.match(/DP[- ]?(\d+)/i);
      if (dpMatch) {
        const dpNum = dpMatch[1];
        const { data: dmsProj } = await supabase
          .from('dms_projects')
          .select('code, project_id')
          .ilike('code', `%${dpNum}%`)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (dmsProj) resolvedCode = dmsProj.code;

        const { data: proj } = await supabase
          .from('projects')
          .select('id')
          .ilike('project_code', `%${dpNum}%`)
          .limit(1)
          .maybeSingle();
        resolvedProjectId = proj?.id || null;
      }

      if (!resolvedProjectId) {
        const { data: proj } = await supabase
          .from('projects')
          .select('id')
          .or(`id.eq.${projectCode},project_code.ilike.%${projectCode}%`)
          .limit(1)
          .maybeSingle();
        resolvedProjectId = proj?.id || null;
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const discoverRes = await fetch(`${supabaseUrl}/functions/v1/discover-vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          project_code: resolvedCode,
          project_id: resolvedProjectId,
          document_number_pattern: input.document_number_pattern,
        }),
      });

      const discoverData = await discoverRes.json();
      if (!discoverRes.ok) return { error: discoverData.error || 'Failed to discover vendors' };
      return discoverData;
    }

    case 'learn_acronym': {
      const { error } = await supabase
        .from('dms_document_type_acronyms')
        .upsert({
          acronym: String(input.acronym).toUpperCase(),
          full_name: input.full_name,
          type_code: input.type_code,
          notes: input.notes || null,
          is_learned: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'acronym' });

      if (error) return { success: false, error: error.message };
      return { success: true, learned: String(input.acronym).toUpperCase() };
    }

    default:
      return { error: `Unknown Selma tool: ${name}` };
  }
}
