// ============================================================
// Selma Tool Handlers — full port from V10 ai-chat/index.ts
// Includes session factory and all 6 tool executors
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
  }, assaiBase);

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

    // ════════════════════════════════════════════════════════════
    // RESOLVE DOCUMENT TYPE — full port with Levenshtein + cross-discipline
    // ════════════════════════════════════════════════════════════
    case 'resolve_document_type': {
      try {
        const query = input.query || '';
        if (!query) return { found: false, message: 'Please provide a document type name or abbreviation to look up.' };

        const cleanQuery = query.trim().toUpperCase().replace(/[^A-Z0-9&]/g, '');
        console.log('resolve_document_type: raw query:', query, '→ cleanQuery:', cleanQuery);

        // Step 1a: Exact acronym match
        const { data: acronymMatch, error: acronymError } = await supabase
          .from('dms_document_type_acronyms')
          .select('acronym, type_code, full_name, notes, usage_count')
          .eq('acronym', cleanQuery)
          .maybeSingle();

        console.log('resolve_document_type: acronym lookup result:', acronymMatch ? `FOUND ${acronymMatch.acronym}→${acronymMatch.type_code}` : 'no match', 'error:', acronymError);

        if (acronymMatch && !acronymError) {
          // Increment usage count (fire-and-forget)
          supabase
            .from('dms_document_type_acronyms')
            .update({ usage_count: (acronymMatch.usage_count || 0) + 1, updated_at: new Date().toISOString() })
            .eq('acronym', cleanQuery)
            .then(() => {});

          const { data: typeDetails } = await supabase
            .from('dms_document_types')
            .select('code, document_name, document_description, tier')
            .eq('code', acronymMatch.type_code)
            .maybeSingle();

          // Cross-discipline auto-combine
          const crossDisciplineCodes = new Set([acronymMatch.type_code]);
          const allMatches: Array<{code: string; name: string; description: string | null; tier: string | null}> = [{
            code: acronymMatch.type_code,
            name: acronymMatch.full_name,
            description: typeDetails?.document_description?.substring(0, 200) ?? acronymMatch.notes,
            tier: typeDetails?.tier ?? null
          }];

          if (typeDetails?.document_name) {
            const nameWords = typeDetails.document_name.split(/\s+/);
            const stem = nameWords.length > 2 ? nameWords.slice(0, -1).join(' ') : typeDetails.document_name;
            console.log(`resolve_document_type: stem-based cross-discipline query using: "${stem}"`);
            const { data: crossMatches } = await supabase
              .from('dms_document_types')
              .select('code, document_name, document_description, tier')
              .ilike('document_name', `%${stem}%`)
              .eq('is_active', true)
              .limit(10);

            if (crossMatches) {
              for (const m of crossMatches) {
                if (!crossDisciplineCodes.has(m.code)) {
                  crossDisciplineCodes.add(m.code);
                  allMatches.push({ code: m.code, name: m.document_name, description: m.document_description?.substring(0, 200) ?? null, tier: m.tier ?? null });
                }
              }
            }
          }

          const combinedCode = Array.from(crossDisciplineCodes).join('+');
          return { found: true, count: allMatches.length, source: 'acronym_lookup', matches: allMatches, instruction: `Use code "${combinedCode}" as the document_type filter in search_assai_documents` };
        }

        // Step 1b: full_name keyword match in acronyms table
        const STOP_WORDS = new Set(['of', 'for', 'the', 'a', 'an', 'and', 'in', 'on', 'to', 'is', 'by']);
        const queryKeywords = query.split(/\s+/).filter((w: string) => !STOP_WORDS.has(w.toLowerCase()) && w.length > 1);

        let fullNameMatch: any[] | null = null;
        if (queryKeywords.length >= 2) {
          const { data: broadMatch } = await supabase
            .from('dms_document_type_acronyms')
            .select('acronym, type_code, full_name, notes, usage_count')
            .or(`full_name.ilike.%${queryKeywords[0]}%,notes.ilike.%${queryKeywords[0]}%`)
            .limit(20);
          if (broadMatch && broadMatch.length > 0) {
            fullNameMatch = broadMatch.filter((row: any) => {
              const nameLower = row.full_name.toLowerCase();
              const notesLower = (row.notes || '').toLowerCase();
              return queryKeywords.slice(1).every((kw: string) => {
                const kwLower = kw.toLowerCase();
                return nameLower.includes(kwLower) || notesLower.includes(kwLower);
              });
            });
            if (fullNameMatch!.length === 0) fullNameMatch = null;
          }
        } else if (queryKeywords.length === 1) {
          const { data: singleMatch } = await supabase
            .from('dms_document_type_acronyms')
            .select('acronym, type_code, full_name, notes, usage_count')
            .or(`full_name.ilike.%${queryKeywords[0]}%,notes.ilike.%${queryKeywords[0]}%`)
            .limit(3);
          fullNameMatch = singleMatch;
        } else {
          const { data: fallbackMatch } = await supabase
            .from('dms_document_type_acronyms')
            .select('acronym, type_code, full_name, notes, usage_count')
            .or(`full_name.ilike.%${query}%,notes.ilike.%${query}%`)
            .limit(3);
          fullNameMatch = fallbackMatch;
        }

        if (fullNameMatch && fullNameMatch.length > 0) {
          supabase
            .from('dms_document_type_acronyms')
            .update({ usage_count: (fullNameMatch[0].usage_count || 0) + 1, updated_at: new Date().toISOString() })
            .eq('acronym', fullNameMatch[0].acronym)
            .then(() => {});

          if (fullNameMatch.length === 1) {
            const match = fullNameMatch[0];
            const { data: typeDetails } = await supabase
              .from('dms_document_types')
              .select('code, document_name, document_description, tier')
              .eq('code', match.type_code)
              .maybeSingle();

            const crossDisciplineCodes = new Set([match.type_code]);
            const allMatches: Array<{code: string; name: string; description: string | null; tier: string | null}> = [{
              code: match.type_code, name: match.full_name,
              description: typeDetails?.document_description?.substring(0, 200) ?? match.notes,
              tier: typeDetails?.tier ?? null
            }];

            if (typeDetails?.document_name) {
              const nameWords = typeDetails.document_name.split(/\s+/);
              const stem = nameWords.length > 2 ? nameWords.slice(0, -1).join(' ') : typeDetails.document_name;
              const { data: crossMatches } = await supabase
                .from('dms_document_types')
                .select('code, document_name, document_description, tier')
                .ilike('document_name', `%${stem}%`)
                .eq('is_active', true)
                .limit(10);
              if (crossMatches) {
                for (const m of crossMatches) {
                  if (!crossDisciplineCodes.has(m.code)) {
                    crossDisciplineCodes.add(m.code);
                    allMatches.push({ code: m.code, name: m.document_name, description: m.document_description?.substring(0, 200) ?? null, tier: m.tier ?? null });
                  }
                }
              }
            }
            const combinedCode = Array.from(crossDisciplineCodes).join('+');
            return { found: true, count: allMatches.length, source: 'acronym_fullname_lookup', matches: allMatches, instruction: `Use code "${combinedCode}" as the document_type filter in search_assai_documents` };
          }

          return {
            found: true, count: fullNameMatch.length, source: 'acronym_fullname_lookup',
            matches: fullNameMatch.map((m: any) => ({ code: m.type_code, name: m.full_name, description: m.notes, tier: null })),
            instruction: 'Multiple acronym matches — confirm with user which document type they mean'
          };
        }

        // Step 2: Search document_name in dms_document_types
        const { data: nameMatches } = await supabase
          .from('dms_document_types')
          .select('code, document_name, document_description, tier')
          .ilike('document_name', `%${query}%`)
          .eq('is_active', true)
          .order('document_name')
          .limit(8);

        if (nameMatches && nameMatches.length > 0) {
          if (nameMatches.length === 1) {
            const singleMatch = nameMatches[0];
            const crossCodes = new Set([singleMatch.code]);
            const combinedMatches = [{ code: singleMatch.code, name: singleMatch.document_name, description: singleMatch.document_description?.substring(0, 150) ?? null, tier: singleMatch.tier ?? null }];
            const nameWords = singleMatch.document_name.split(/\s+/);
            const stem = nameWords.length > 2 ? nameWords.slice(0, -1).join(' ') : singleMatch.document_name;
            const { data: crossMatches } = await supabase
              .from('dms_document_types')
              .select('code, document_name, document_description, tier')
              .ilike('document_name', `%${stem}%`)
              .eq('is_active', true)
              .limit(10);
            if (crossMatches) {
              for (const m of crossMatches) {
                if (!crossCodes.has(m.code)) {
                  crossCodes.add(m.code);
                  combinedMatches.push({ code: m.code, name: m.document_name, description: m.document_description?.substring(0, 150) ?? null, tier: m.tier ?? null });
                }
              }
            }
            const combinedCode = Array.from(crossCodes).join('+');
            return { found: true, count: combinedMatches.length, source: 'name_search', matches: combinedMatches, instruction: `Use code "${combinedCode}" as the document_type filter in search_assai_documents` };
          }
          return {
            found: true, count: nameMatches.length, source: 'name_search',
            matches: nameMatches.map((d: any) => ({ code: d.code, name: d.document_name, description: d.document_description?.substring(0, 150), tier: d.tier })),
            instruction: 'Multiple matches — confirm which document type the user means before searching'
          };
        }

        // Step 3: description search
        const { data: descMatches } = await supabase
          .from('dms_document_types')
          .select('code, document_name, document_description, tier')
          .ilike('document_description', `%${query}%`)
          .eq('is_active', true)
          .order('document_name')
          .limit(5);

        if (descMatches && descMatches.length > 0) {
          return {
            found: true, count: descMatches.length, source: 'description_search',
            matches: descMatches.map((d: any) => ({ code: d.code, name: d.document_name, description: d.document_description?.substring(0, 150), tier: d.tier })),
            instruction: 'These matched on description text — confirm with the user which document type they mean before searching'
          };
        }

        // Step 4: Levenshtein fuzzy matching
        const { data: allAcronyms } = await supabase
          .from('dms_document_type_acronyms')
          .select('acronym, type_code, full_name, notes');

        if (allAcronyms && allAcronyms.length > 0) {
          const levenshtein = (a: string, b: string): number => {
            const m = a.length, n = b.length;
            const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
            for (let i = 0; i <= m; i++) dp[i][0] = i;
            for (let j = 0; j <= n; j++) dp[0][j] = j;
            for (let i = 1; i <= m; i++) {
              for (let j = 1; j <= n; j++) {
                dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
              }
            }
            return dp[m][n];
          };

          const scored = allAcronyms.map((a: any) => ({
            ...a,
            distance: levenshtein(cleanQuery, a.acronym),
            similarity: 1 - (levenshtein(cleanQuery, a.acronym) / Math.max(cleanQuery.length, a.acronym.length))
          })).filter((a: any) => a.similarity >= 0.6).sort((a: any, b: any) => b.similarity - a.similarity);

          if (scored.length > 0 && scored[0].similarity >= 0.75) {
            const best = scored[0];
            if (best.similarity >= 0.85) {
              const { data: typeDetails } = await supabase
                .from('dms_document_types')
                .select('code, document_name, document_description, tier')
                .eq('code', best.type_code)
                .maybeSingle();

              return {
                found: true, count: 1, source: 'fuzzy_match', fuzzy_confidence: best.similarity,
                original_query: query, matched_acronym: best.acronym,
                matches: [{ code: best.type_code, name: best.full_name, description: typeDetails?.document_description?.substring(0, 200) ?? best.notes, tier: typeDetails?.tier ?? null }],
                instruction: `Fuzzy matched "${query}" to "${best.acronym}" (${best.full_name}) with ${Math.round(best.similarity * 100)}% confidence. Use code "${best.type_code}" as the document_type filter.`
              };
            }
            return {
              found: false,
              suggestions: scored.slice(0, 3).map((s: any) => ({ acronym: s.acronym, full_name: s.full_name, type_code: s.type_code, similarity: Math.round(s.similarity * 100) + '%' })),
              message: `No exact match for "${query}". Did you mean one of these? ${scored.slice(0, 3).map((s: any) => `${s.acronym} (${s.full_name})`).join(', ')}. Ask the user to confirm.`
            };
          }
        }

        return { found: false, message: `No document type found for "${query}". Ask the user to clarify — they may be using a project-specific abbreviation not yet in the system.` };
      } catch (err) {
        console.error('resolve_document_type error:', err);
        return { error: String(err) };
      }
    }

    // ════════════════════════════════════════════════════════════
    // RESOLVE PROJECT CODE
    // ════════════════════════════════════════════════════════════
    case 'resolve_project_code': {
      const raw = String(input.dp_number || '').toUpperCase().replace(/\s+/g, '');
      const normalised = raw.startsWith('DP-') ? raw : raw.replace(/^DP/, 'DP-');
      const withoutHyphen = normalised.replace('DP-', 'DP');

      const { data: projects } = await supabase
        .from('dms_projects')
        .select('code, project_id, project_name, cabinet, proj_seq_nr')
        .eq('is_active', true)
        .or(`project_id.ilike.${normalised},project_id.ilike.${withoutHyphen}`)
        .limit(10);

      return { dp_number: normalised, projects: projects || [] };
    }

    // ════════════════════════════════════════════════════════════
    // SEARCH ASSAI DOCUMENTS — delegates to search engine
    // ════════════════════════════════════════════════════════════
    case 'search_assai_documents': {
      emitStatus('Searching Assai DMS...');

      // Auto-resolve DP project references in document_number_pattern
      let docNumPattern = input.document_number_pattern || '';
      const dpInPattern = docNumPattern.match(/^(\d{4})-%-?DP-?\d+-?%?$/i);
      if (dpInPattern) {
        docNumPattern = dpInPattern[1] + '-%';
        console.log('[Selma] stripped DP reference from pattern, using:', docNumPattern);
      }
      const dpOnly = docNumPattern.match(/^DP-?(\d+)$/i);
      if (dpOnly) {
        const dpNum = dpOnly[1];
        const { data: dpProject } = await supabase
          .from('dms_projects')
          .select('code')
          .ilike('project_id', `%${dpNum}%`)
          .limit(1)
          .maybeSingle();
        if (dpProject) {
          docNumPattern = dpProject.code + '-%';
          console.log('[Selma] resolved DP-' + dpNum + ' to project code:', dpProject.code);
        }
      }

      return await executeSearch(
        {
          documentNumberPattern: docNumPattern,
          documentType: input.document_type,
          disciplineCode: input.discipline_code,
          title: input.title,
          statusCode: input.status_code,
          companyCode: input.company_code,
          maxResults: input.max_results || 50,
          username,
          password,
          assaiBase,
          emitStatus,
        } as SearchOptions,
        sessionManager,
        supabase
      );
    }

    // ════════════════════════════════════════════════════════════
    // READ ASSAI DOCUMENT — full 7-stage pipeline
    // ════════════════════════════════════════════════════════════
    case 'read_assai_document': {
      emitStatus(`Reading document ${input.document_number}...`);
      try {
        const docNumber = String(input.document_number || '').trim();
        const analysisFocus = input.analysis_focus || '';
        const question = analysisFocus
          ? `Analyse this document. Focus: ${analysisFocus}. Extract key information, tag lists, and assess fitness for handover.`
          : 'Analyse this document thoroughly. Extract key information including: purpose and scope, tag lists (if engineering), key findings or requirements, revision history context, and assess overall fitness for handover.';

        if (!docNumber) return { error: 'No document number provided' };

        const metadata: any = {
          document_number: docNumber,
          title: '',
          revision: '',
          status: '',
          subclass: 'DES_DOC',
        };

        // STAGE 1: Search DES_DOC for pk_seq_nr and entt_seq_nr
        let cookieHeader = await sessionManager.getSession();
        let pkSeqNr: string | null = null;
        let enttSeqNr: string | null = null;

        // extractHiddenFields for read handler (reuse from search-engine)
        const extractFieldsFromHtml = (html: string) => {
          const fields = extractHiddenFields(html);
          return {
            hidden: fields.filter(f => f.type === 'hidden' && f.name && f.value),
            text: fields.filter(f => f.type === 'text' || f.type === ''),
          };
        };

        try {
          const initUrl = assaiBase + '/search.aweb?subclass_type=DES_DOC';
          const initResp = await fetch(initUrl, {
            headers: { Cookie: cookieHeader, Accept: 'text/html', 'User-Agent': ASSAI_UA },
            redirect: 'follow',
          });
          const initHtml = await initResp.text();
          const { hidden: hiddenFieldsRead, text: textFieldsRead } = extractFieldsFromHtml(initHtml);
          console.log(`read_assai_document: initSearch OK, hidden=${hiddenFieldsRead.length}, text=${textFieldsRead.length}`);

          const searchParams = new URLSearchParams();
          for (const f of hiddenFieldsRead) searchParams.set(f.name, f.value);
          for (const f of textFieldsRead) searchParams.set(f.name, '');
          searchParams.set('subclass_type', 'DES_DOC');
          searchParams.set('number', docNumber);

          const searchRes = await fetch(assaiBase + '/result.aweb', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Cookie': cookieHeader,
              'User-Agent': ASSAI_UA,
              'Referer': initUrl,
            },
            body: searchParams.toString(),
            redirect: 'follow',
          });
          const searchHtml = await searchRes.text();

          const myCellsMatch = searchHtml.match(/var\s+myCells\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function)/);
          if (myCellsMatch) {
            try {
              const myCells = JSON.parse(myCellsMatch[1]);
              if (myCells.length > 0) {
                const row = myCells[0];
                const strip = (s: any) => String(s || '').replace(/<[^>]*>/g, '').trim();
                metadata.title = strip(row[8]) || metadata.title;
                metadata.status = strip(row[6]) || metadata.status;
                metadata.revision = strip(row[4]) || metadata.revision;
                metadata.responsible_engineer = strip(row[11]);
                metadata.company = strip(row[12]);
                metadata.discipline = strip(row[13]);
                metadata.document_type = strip(row[14]);
                metadata.work_package = strip(row[15]);
                metadata.priority = strip(row[9]);
                metadata.checked_out = strip(row[37] || 'N');
                pkSeqNr = strip(row[33]);
                enttSeqNr = strip(row[34]);
                console.log(`read_assai_document: DES_DOC found pk_seq_nr=${pkSeqNr}, entt_seq_nr=${enttSeqNr}`);
              }
            } catch (parseErr) {
              console.error('read_assai_document: myCells parse error:', parseErr);
            }
          }

          // STAGE 2: SUP_DOC hardening if not found in DES_DOC
          if (!pkSeqNr || !enttSeqNr) {
            // Re-auth for SUP_DOC module
            cookieHeader = await sessionManager.getSession(true);

            const supInitUrl = assaiBase + '/search.aweb?subclass_type=SUP_DOC';
            const supInitResp = await fetch(supInitUrl, {
              headers: { Cookie: cookieHeader, Accept: 'text/html', 'User-Agent': ASSAI_UA },
              redirect: 'follow',
            });
            const supInitHtml = await supInitResp.text();
            const { hidden: supHidden, text: supText } = extractFieldsFromHtml(supInitHtml);

            const supSearchParams = new URLSearchParams();
            for (const f of supHidden) supSearchParams.set(f.name, f.value);
            for (const f of supText) supSearchParams.set(f.name, '');
            supSearchParams.set('subclass_type', 'SUP_DOC');
            supSearchParams.set('clas_seq_nr', '2');
            supSearchParams.set('suty_seq_nr', '7');
            supSearchParams.set('number', docNumber);

            const supRes = await fetch(assaiBase + '/result.aweb', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookieHeader,
                'User-Agent': ASSAI_UA,
                'Referer': supInitUrl,
              },
              body: supSearchParams.toString(),
              redirect: 'follow',
            });
            const supHtml = await supRes.text();
            const supMatch = supHtml.match(/var\s+myCells\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function)/);
            if (supMatch) {
              try {
                const supCells = JSON.parse(supMatch[1]);
                if (supCells.length > 0) {
                  const row = supCells[0];
                  const strip = (s: any) => String(s || '').replace(/<[^>]*>/g, '').trim();
                  metadata.title = strip(row[8]) || metadata.title;
                  metadata.status = strip(row[6]) || metadata.status;
                  metadata.revision = strip(row[4]) || metadata.revision;
                  metadata.subclass = 'SUP_DOC';
                  pkSeqNr = strip(row[33]);
                  enttSeqNr = strip(row[34]);
                }
              } catch { /* ignore parse errors */ }
            }
          }
        } catch (searchErr: any) {
          console.error('read_assai_document search error:', searchErr);
        }

        if (!pkSeqNr || !enttSeqNr || pkSeqNr === '' || enttSeqNr === '') {
          return {
            metadata,
            content_available: false,
            reason: `Document ${docNumber} was not found in Assai (searched across all projects). The document number may be incorrect or the document may not exist in the system.`,
            question_asked: question
          };
        }

        if (metadata.checked_out === 'Y') {
          return { metadata, content_available: false, reason: 'Document is currently checked out by another user and cannot be downloaded.', question_asked: question };
        }

        // STAGE 3: Download via deterministic REST endpoint
        // Uses /get/download/{PROJECT}/DOCS/{doc_number} — simple, reliable
        // Falls back across project scopes: BGC_PROJ → BGC_OPS → ISG
        let pdfBase64: string | null = null;
        let documentMediaType = 'application/pdf';

        // Fetch available cabinet names (NOT numeric codes) from dms_projects
        // The REST download URL requires cabinet names like BGC_PROJ, BGC_OPS, ISG
        const FALLBACK_CABINETS = ['BGC_PROJ', 'BGC_OPS', 'ISG'];
        let projectCodes: string[] = FALLBACK_CABINETS;
        try {
          const { data: cabinetRows } = await supabase
            .from('dms_projects')
            .select('cabinet')
            .eq('is_active', true);
          if (cabinetRows && cabinetRows.length > 0) {
            const uniqueCabinets = [...new Set(cabinetRows.map((r: any) => r.cabinet).filter(Boolean))];
            if (uniqueCabinets.length > 0) {
              projectCodes = uniqueCabinets as string[];
            }
          }
        } catch { /* use fallback */ }

        // Prioritize cabinet matching the document's originator
        // e.g. doc "6529-BGC-..." → try BGC_PROJ first
        const docParts = docNumber.split('-');
        if (docParts.length >= 2) {
          const originator = docParts[1].toUpperCase();
          const prioritized = projectCodes.filter(c => c.toUpperCase().startsWith(originator));
          const rest = projectCodes.filter(c => !c.toUpperCase().startsWith(originator));
          projectCodes = [...prioritized, ...rest];
        }
        console.log(`read_assai_document: Will try cabinets in order: ${projectCodes.join(', ')}`);

        const attemptRestDownload = async (cookies: string, project: string, label: string) => {
          const url = assaiBase + '/get/download/' + project + '/DOCS/' + docNumber;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          console.log(`read_assai_document: REST download (${label}) ${url}`);
          const res = await fetch(url, {
            headers: { 'Cookie': cookies, 'User-Agent': ASSAI_UA },
            signal: controller.signal,
            redirect: 'manual', // DON'T follow redirects — 302 means auth failed
          });
          clearTimeout(timeoutId);
          // If redirected, it means session is invalid for this endpoint
          if (res.status === 302 || res.status === 301) {
            const location = res.headers.get('location') || '';
            console.log(`read_assai_document: ${label} redirected to ${location} — session not valid for REST download`);
            return null; // signal auth failure
          }
          return res;
        };

        // Helper: check if response is a real file (not an HTML error page)
        const isValidFileResponse = (res: Response, bytes: Uint8Array): { valid: boolean; reason?: string; isAuthIssue?: boolean } => {
          const ct = res.headers.get('content-type') || '';
          
          if (ct.includes('text/html') || bytes.length < 500) {
            const snippet = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 1000))).toLowerCase();
            console.log(`read_assai_document: HTML/small response detected (${bytes.length} bytes), snippet: ${snippet.substring(0, 200)}`);
            
            // Detect auth/session redirects vs actual errors
            if (snippet.includes('login') || snippet.includes('session') || snippet.includes('redirect') || snippet.includes('available projects')) {
              return { valid: false, reason: 'Session expired or project context not set — retrying with fresh auth.', isAuthIssue: true };
            }
            if (snippet.includes('<!doctype') || snippet.includes('<html') || snippet.includes('error') || snippet.includes('applet:error')) {
              return { valid: false, reason: 'Assai returned an HTML page instead of the document file. This may be a session or access issue — not a missing file.', isAuthIssue: true };
            }
            // Small non-HTML response could still be valid (e.g., tiny text file)
            if (ct.includes('text/html') && bytes.length < 500) {
              return { valid: false, reason: 'Assai returned a small HTML response — likely a session redirect.', isAuthIssue: true };
            }
          }
          if (bytes.length > 10 * 1024 * 1024) {
            return { valid: false, reason: 'Document file exceeds 10MB limit.' };
          }
          return { valid: true };
        };

        try {
          let downloadSuccess = false;
          let downloadFailReason = '';
          let fileBytes: Uint8Array | null = null;
          let fileContentType = '';

          // Try each project scope with current session, then fresh session
          let triedFreshSession = false;
          for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt === 1) {
              if (triedFreshSession) break;
              // Second pass: get completely fresh session
              console.log('read_assai_document: all projects failed on first pass, retrying with fresh auth');
              cookieHeader = await sessionManager.getSession(true);
              triedFreshSession = true;
            }

            for (const project of projectCodes) {
              try {
                const docRes = await attemptRestDownload(cookieHeader, project, `attempt${attempt}-${project}`);

                // null means redirect (auth failure) — skip to next project or retry with fresh session
                if (!docRes) {
                  downloadFailReason = 'REST endpoint redirected to login — session not authenticated for download.';
                  continue;
                }

                if (!docRes.ok) {
                  const errBody = await docRes.text();
                  console.log(`read_assai_document: ${project} HTTP ${docRes.status}, body: ${errBody.substring(0, 150)}`);
                  continue;
                }

                const bytes = new Uint8Array(await docRes.arrayBuffer());
                console.log(`read_assai_document: ${project} returned ${bytes.length} bytes, ct=${docRes.headers.get('content-type')}`);
                
                const validation = isValidFileResponse(docRes, bytes);
                if (!validation.valid) {
                  downloadFailReason = validation.reason || 'Invalid file response';
                  console.log(`read_assai_document: ${project} invalid: ${downloadFailReason}`);
                  if (validation.isAuthIssue && !triedFreshSession) {
                    // Auth issue detected — break inner loop to trigger fresh session retry
                    break;
                  }
                  continue; // try next project scope
                }

                // Valid file!
                fileBytes = bytes;
                fileContentType = docRes.headers.get('content-type') || '';
                downloadSuccess = true;
                console.log(`read_assai_document: SUCCESS via REST ${project}, ${bytes.length} bytes`);
                break;
              } catch (projErr: any) {
                if (projErr?.name === 'AbortError') {
                  downloadFailReason = 'Download timed out (>15s).';
                } else {
                  console.warn(`read_assai_document: ${project} error:`, projErr?.message);
                  downloadFailReason = projErr?.message || 'Download failed';
                }
              }
            }
            if (downloadSuccess) break;
          }

          // If REST endpoint failed, fall back to legacy download.aweb with search context
          if (!downloadSuccess && pkSeqNr && enttSeqNr) {
            console.log('read_assai_document: REST endpoints exhausted, trying legacy download.aweb with search context');
            try {
              cookieHeader = await sessionManager.getSession(true);
              
              // Re-establish search context (required for download.aweb)
              const subclassType = metadata.subclass || 'DES_DOC';
              try {
                const initResp = await fetch(assaiBase + '/search.aweb?subclass_type=' + subclassType, {
                  headers: { Cookie: cookieHeader, Accept: 'text/html', 'User-Agent': ASSAI_UA },
                  redirect: 'follow',
                });
                const initHtml = await initResp.text();
                const fields = extractHiddenFields(initHtml);
                const sp = new URLSearchParams();
                for (const f of fields.filter((f: any) => f.type === 'hidden' && f.name && f.value)) sp.set(f.name, f.value);
                for (const f of fields.filter((f: any) => f.type === 'text' || f.type === '')) sp.set(f.name, '');
                sp.set('subclass_type', subclassType);
                sp.set('number', docNumber);
                await fetch(assaiBase + '/result.aweb', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader, 'User-Agent': ASSAI_UA },
                  body: sp.toString(),
                  redirect: 'follow',
                });
                console.log('read_assai_document: legacy search context established');
              } catch (ctxErr) {
                console.warn('read_assai_document: failed to establish search context:', ctxErr);
              }

              const legacyUrl = assaiBase + '/download.aweb?pk_seq_nr=' + pkSeqNr + '&entt_seq_nr=' + enttSeqNr;
              const controller = new AbortController();
              const tid = setTimeout(() => controller.abort(), 15000);
              const legRes = await fetch(legacyUrl, {
                headers: { 'Cookie': cookieHeader, 'User-Agent': ASSAI_UA },
                signal: controller.signal,
                redirect: 'follow',
              });
              clearTimeout(tid);
              if (legRes.ok) {
                const bytes = new Uint8Array(await legRes.arrayBuffer());
                console.log(`read_assai_document: legacy returned ${bytes.length} bytes, ct=${legRes.headers.get('content-type')}`);
                const validation = isValidFileResponse(legRes, bytes);
                if (validation.valid) {
                  fileBytes = bytes;
                  fileContentType = legRes.headers.get('content-type') || '';
                  downloadSuccess = true;
                  console.log(`read_assai_document: SUCCESS via legacy download.aweb, ${bytes.length} bytes`);
                } else {
                  downloadFailReason = validation.reason || downloadFailReason;
                }
              } else {
                console.log(`read_assai_document: legacy download.aweb HTTP ${legRes.status}`);
                await legRes.text();
              }
            } catch (legErr: any) {
              console.warn('read_assai_document: legacy fallback error:', legErr?.message);
            }
          }

          if (!downloadSuccess || !fileBytes) {
            // Return metadata with actionable guidance AND links using the best cabinet
            const bestCabinet = projectCodes[0] || 'BGC_PROJ';
            return {
              metadata,
              content_available: false,
              reason: downloadFailReason || 'Document file could not be retrieved — this is likely a session or access issue, NOT a missing file.',
              actionable_guidance: 'The document exists in Assai and has a file attached. The download failed due to a session or access restriction. Try again in a moment, or ask an Assai administrator to check access permissions.',
              assai_open_link: `https://eu.assaicloud.com/AWeu578/get/details/${bestCabinet}/DOCS/${docNumber}`,
              assai_download_link: `https://eu.assaicloud.com/AWeu578/get/download/${bestCabinet}/DOCS/${docNumber}`,
              question_asked: question,
            };
          }

          // Determine media type from content-type or magic bytes
          if (fileContentType.includes('pdf')) documentMediaType = 'application/pdf';
          else if (fileContentType.includes('image')) documentMediaType = fileContentType.split(';')[0].trim();
          else documentMediaType = 'application/pdf';

          console.log(`read_assai_document: downloaded ${fileBytes.length} bytes, first4=[${fileBytes[0]},${fileBytes[1]},${fileBytes[2]},${fileBytes[3]}]`);

          // STAGE 4 & 5: Magic byte validation
          const isPdf = fileBytes[0] === 0x25 && fileBytes[1] === 0x50 && fileBytes[2] === 0x44 && fileBytes[3] === 0x46;
          if (!isPdf && documentMediaType === 'application/pdf') {
            const isZip = fileBytes[0] === 0x50 && fileBytes[1] === 0x4B;
            const isOle = fileBytes[0] === 0xD0 && fileBytes[1] === 0xCF;
            if (isZip || isOle) {
              return { metadata, content_available: false, reason: 'Document is in Office format (Excel/Word), not PDF. Direct AI reading is only supported for PDF files.', question_asked: question };
            }
            return { metadata, content_available: false, reason: 'Downloaded file is not a valid PDF (unexpected format).', question_asked: question };
          }

          // STAGE 6: Base64 encoding
          let binary = '';
          for (let i = 0; i < fileBytes.length; i++) {
            binary += String.fromCharCode(fileBytes[i]);
          }
          pdfBase64 = btoa(binary);
        } catch (fetchErr: any) {
          console.error('read_assai_document: download error:', fetchErr?.name, fetchErr?.message);
          if (fetchErr?.name === 'AbortError') {
            return { metadata, content_available: false, reason: 'Download timed out (>15s).', question_asked: question };
          }
          return { metadata, content_available: false, reason: 'Failed to download from Assai: ' + (fetchErr?.message || 'Unknown error'), question_asked: question };
        }

        // STAGE 7: Claude inner-call for document analysis
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
                    { type: "document", source: { type: "base64", media_type: documentMediaType, data: pdfBase64 } },
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
      } catch (err) {
        console.error('read_assai_document error:', err);
        return { error: String(err) };
      }
    }

    // ════════════════════════════════════════════════════════════
    // DISCOVER PROJECT VENDORS
    // ════════════════════════════════════════════════════════════
    case 'discover_project_vendors': {
      emitStatus('Discovering project vendors...');
      const { data, error } = await supabase.functions.invoke('discover-vendors', {
        body: {
          project_code: input.project_code,
          document_number_pattern: input.document_number_pattern,
        }
      });
      if (error) return { error: error.message };
      return data;
    }

    // ════════════════════════════════════════════════════════════
    // LEARN ACRONYM
    // ════════════════════════════════════════════════════════════
    case 'learn_acronym': {
      const { error } = await supabase
        .from('dms_document_type_acronyms')
        .upsert({
          acronym: String(input.acronym).toUpperCase().replace(/[^A-Z0-9&]/g, ''),
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
