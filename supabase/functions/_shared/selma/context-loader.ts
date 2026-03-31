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
===`;
}
