export async function buildDmsConfigSnapshot(supabase: any): Promise<string> {
  const [projectsRes, disciplinesRes, docTypesRes, statusRes] = await Promise.all([
    supabase
      .from('dms_projects')
      .select('code, project_id, project_name, cabinet, proj_seq_nr')
      .eq('is_active', true)
      .order('project_name'),
    supabase
      .from('dms_disciplines')
      .select('code, name')
      .eq('is_active', true)
      .order('code'),
    supabase
      .from('dms_document_types')
      .select('id, code, document_name, discipline_code')
      .eq('is_active', true)
      .order('code'),
    supabase
      .from('dms_status_codes')
      .select('code, description')   // description — NOT name (name column does not exist)
      .order('code'),
  ]);

  const projects = projectsRes.data || [];
  const disciplines = disciplinesRes.data || [];
  const docTypes = docTypesRes.data || [];
  const statuses = statusRes.data || [];

  const projectList = projects.map((p: any) =>
    `  - ${p.project_name} | project_id: ${p.project_id} | cabinet: ${p.cabinet} | proj_seq_nr: ${p.proj_seq_nr} | code: ${p.code}`
  ).join('\n') || '  (none loaded)';

  const docTypeList = docTypes.map((t: any) =>
    `  ${t.code} → ${t.document_name} (discipline: ${t.discipline_code || 'N/A'})`
  ).join('\n') || '  (none loaded)';

  // Load learned document type knowledge
  const { data: knowledgeRows } = await supabase
    .from('selma_document_type_knowledge')
    .select('type_code, type_name, purpose, key_themes, handover_relevance, cross_references, selma_tips')
    .gt('confidence', 0.4)
    .order('confidence', { ascending: false })
    .limit(30);

  const knowledge = knowledgeRows || [];
  const knowledgeBlock = knowledge.length > 0
    ? `\n\nDOCUMENT TYPE EXPERTISE (${knowledge.length} types learned):\n` +
      knowledge.map((k: any) => {
        const themes = Array.isArray(k.key_themes) ? k.key_themes.slice(0, 5).join(', ') : '';
        const refs = Array.isArray(k.cross_references) ? k.cross_references.join(', ') : '';
        return `  ${k.type_code} (${k.type_name}): ${k.purpose || ''}${themes ? ` | Themes: ${themes}` : ''}${refs ? ` | Refs: ${refs}` : ''}${k.selma_tips ? ` | Tip: ${k.selma_tips}` : ''}`;
      }).join('\n')
    : '';

  return `

=== ORSH LIVE CONFIGURATION ===
ASSAI INSTANCE: https://eu.assaicloud.com/AWeu578/
DATABASE: eu578 | PROJECT CABINET: BGC_PROJ
proj_seq_nr is resolved per project from the table — never hardcode it.

ACTIVE PROJECTS (${projects.length}):
${projectList}

DOCUMENT TYPES (${docTypes.length}):
${docTypeList}

DISCIPLINES: ${disciplines.map((d: any) => `${d.code}=${d.name}`).join(', ')}
STATUS CODES: ${statuses.map((s: any) => `${s.code}=${s.description}`).join(', ')}
${knowledgeBlock}
===`;
}
