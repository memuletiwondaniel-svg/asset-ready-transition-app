/**
 * Domain glossary for ORSH platform.
 * Keys are the abbreviated or short terms; values explain them for non-specialists.
 */
export const GLOSSARY: Record<string, string> = {
  // Core modules
  'ORA': 'Operational Readiness Assurance — a structured process ensuring a facility is ready for safe startup and sustained operations.',
  'ORA Plan': 'A phase-specific plan that tracks all operational readiness activities, deliverables, and milestones for a project.',
  'PSSR': 'Pre-Startup Safety Review — a formal safety checklist completed before a facility or system is started up or restarted.',
  'VCR': 'Verification Certificate of Readiness — a certificate confirming that all prerequisites for a project phase or handover are met.',
  'P2A': 'Project-to-Asset handover — the structured transfer of a completed project from the project team to the asset operations team.',
  'ORM': 'Operational Readiness for Maintenance — readiness activities focused on ensuring maintenance support is in place before startup.',
  'SoF': 'Statement of Fitness — a formal declaration that a facility is fit for its intended purpose and safe to operate.',
  'PAC': 'Provisional Acceptance Certificate — confirms a facility has been mechanically completed and is ready for commissioning.',
  'FAC': 'Final Acceptance Certificate — confirms all project obligations, punch-list items, and warranty conditions are fulfilled.',

  // Phases & frameworks
  'DCAF': 'Decision and Controls Assurance Framework — the governance framework defining control points and technical authority sign-offs.',
  'DDP': 'Discipline Delivery Plan — a structured template listing all OR&CSU activities by phase with estimated hours, costs, and responsibilities.',
  'ORMP': 'OR Management Plan — developed for each phase, outlining risks, organisation structure, and activity plans.',
  'CSU': 'Commissioning & Start-Up — the sequence of activities that brings a facility from construction completion to full operation.',

  // Roles
  'TA': 'Technical Authority — a designated expert responsible for approving technical decisions and assuring compliance.',
  'TA2': 'Technical Authority Level 2 — the accountable technical authority for a specific discipline or control point.',
  'ORCSU': 'Operational Readiness, Commissioning & Start-Up — the combined discipline covering all OR and CSU activities.',

  // Sidebar labels
  'Projects': 'Your project portfolio — create and manage VCRs to track operational readiness milestones.',
  'My Tasks': 'Action items assigned to you across all projects and modules.',
  'Executive Dashboard': 'High-level overview of project health, readiness scores, and pending approvals for leadership.',
  'Ask Bob': 'Bob is your AI CoPilot — ask questions about ORSH, get guidance, summarise PSSRs, and more.',
  'OR Maintenance': 'Track maintenance readiness activities — ensuring spares, procedures, and teams are ready before startup.',
};

/**
 * Lookup a glossary definition by term (case-insensitive).
 */
export function getGlossaryDefinition(term: string): string | undefined {
  // Exact match first
  if (GLOSSARY[term]) return GLOSSARY[term];
  // Case-insensitive fallback
  const key = Object.keys(GLOSSARY).find(k => k.toLowerCase() === term.toLowerCase());
  return key ? GLOSSARY[key] : undefined;
}
