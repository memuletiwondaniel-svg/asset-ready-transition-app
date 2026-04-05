/**
 * Fred Context Loader — Runtime knowledge injection
 * Loads relevant domain knowledge from fred_domain_knowledge based on query context.
 */

/** Detect relevant categories from query text */
function detectRelevantCategories(query: string): string[] {
  const lower = query.toLowerCase();
  const categories: string[] = [];

  if (/\bitr\b|inspection test|bgc-[imepx]\d/i.test(lower)) categories.push('blank_itrs');
  if (/\blosh\b|boundary|system.*drawing|limit.*handover/i.test(lower)) categories.push('losh_drawings');
  if (/\bprocedure|management|approval|gate|workflow/i.test(lower)) categories.push('completions_procedure');
  if (/\blogic|sequence|philosophy/i.test(lower)) categories.push('logic_way');
  if (/\bcsu|masterclass|commissioning.*train|pre-?comm/i.test(lower)) categories.push('csu_masterclass');
  if (/\brepetitive|failure.*pattern|recurring|chronic/i.test(lower)) categories.push('repetitive_failure');
  if (/\blesson|learnt|learned|best practice|what.*went.*wrong/i.test(lower)) categories.push('lessons_learnt');
  if (/\bflaw|defect|non-?conform/i.test(lower)) categories.push('flaws_database');
  if (/\bincident|csi|startup.*incident|commissioning.*incident/i.test(lower)) categories.push('csi_database');
  if (/\bctp|test procedure|commissioning test/i.test(lower)) categories.push('ctps');
  if (/\bsat\b|fat\b|sit\b|factory accept|site accept|system integration test/i.test(lower)) categories.push('sat_fat_sit');
  if (/\bcsu plan|commissioning plan|startup plan|resource plan/i.test(lower)) categories.push('csu_plans');
  if (/\bhazop|omar|risk.*assess|safety.*study|safeguard/i.test(lower)) categories.push('hazop_omar');

  // If nothing specific matched, load general procedures + lessons
  if (categories.length === 0) {
    categories.push('completions_procedure', 'lessons_learnt');
  }

  return categories;
}

/** Detect relevant tags from query text */
function detectRelevantTags(query: string): string[] {
  const lower = query.toLowerCase();
  const tags: string[] = [];

  if (/\bpiping\b/i.test(lower)) tags.push('piping');
  if (/\belectrical\b/i.test(lower)) tags.push('electrical');
  if (/\binstrument/i.test(lower)) tags.push('instrument');
  if (/\bmechanical\b/i.test(lower)) tags.push('mechanical');
  if (/\bmcc\b/i.test(lower)) tags.push('mcc');
  if (/\bpcc\b/i.test(lower)) tags.push('pcc');
  if (/\brfc\b/i.test(lower)) tags.push('rfc');
  if (/\brfsu\b/i.test(lower)) tags.push('rfsu');
  if (/\bfac\b/i.test(lower)) tags.push('fac');
  if (/\bcommissioning\b/i.test(lower)) tags.push('commissioning');
  if (/\bpre-?commissioning\b/i.test(lower)) tags.push('pre-commissioning');
  if (/\bconstruction\b/i.test(lower)) tags.push('construction');

  // ITR code detection
  const itrMatch = lower.match(/\b[imepx]\d{2}[ab]?\b/i);
  if (itrMatch) tags.push(`itr-${itrMatch[0].toLowerCase()}`);

  return tags;
}

/**
 * Build Fred's domain knowledge context block for system prompt injection.
 * Returns a formatted string of relevant knowledge entries.
 */
export async function buildFredKnowledgeContext(supabase: any, query: string): Promise<string> {
  const categories = detectRelevantCategories(query);
  const tags = detectRelevantTags(query);

  // Query 1: By category match (primary)
  const { data: categoryRows } = await supabase
    .from('fred_domain_knowledge')
    .select('category, knowledge_type, title, content, tags, confidence')
    .in('category', categories)
    .gt('confidence', 0.3)
    .order('confidence', { ascending: false })
    .limit(15);

  // Query 2: By tag overlap (supplementary) — only if we have tags
  let tagRows: any[] = [];
  if (tags.length > 0) {
    const { data } = await supabase
      .from('fred_domain_knowledge')
      .select('category, knowledge_type, title, content, tags, confidence')
      .overlaps('tags', tags)
      .gt('confidence', 0.3)
      .order('confidence', { ascending: false })
      .limit(10);
    tagRows = data || [];
  }

  // Merge and deduplicate
  const seen = new Set<string>();
  const allRows: any[] = [];
  for (const row of [...(categoryRows || []), ...tagRows]) {
    if (!seen.has(row.title)) {
      seen.add(row.title);
      allRows.push(row);
    }
  }

  if (allRows.length === 0) return '';

  // Format knowledge blocks by type
  const grouped: Record<string, any[]> = {};
  for (const row of allRows) {
    const type = row.knowledge_type || 'general';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(row);
  }

  const typeLabels: Record<string, string> = {
    procedure: '📋 PROCEDURES & PROCESSES',
    lesson: '💡 LESSONS LEARNT',
    itr_template: '📝 ITR TEMPLATES',
    test_criteria: '🔬 TEST CRITERIA',
    incident: '⚠️ INCIDENT INTELLIGENCE',
    failure_pattern: '🔄 FAILURE PATTERNS',
    risk_pattern: '🛡️ RISK & HAZARD PATTERNS',
    plan_template: '📅 PLAN TEMPLATES',
    acceptance_criteria: '✅ ACCEPTANCE CRITERIA',
  };

  let block = `\n\n=== FRED DOMAIN KNOWLEDGE (${allRows.length} entries) ===\n`;
  block += `Relevant to: ${categories.join(', ')}${tags.length ? ` | Tags: ${tags.join(', ')}` : ''}\n`;

  for (const [type, rows] of Object.entries(grouped)) {
    block += `\n${typeLabels[type] || type.toUpperCase()}:\n`;
    for (const row of rows.slice(0, 8)) {
      const summary = typeof row.content === 'object'
        ? JSON.stringify(row.content).slice(0, 500)
        : String(row.content).slice(0, 500);
      block += `  • ${row.title}: ${summary}\n`;
    }
  }

  block += `\n=== END DOMAIN KNOWLEDGE ===`;
  return block;
}
