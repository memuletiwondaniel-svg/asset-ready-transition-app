/**
 * PSSR & VCR Agent Assignment Matrix
 * 
 * Defines which agent LEADS each checklist item and which agents SUPPORT.
 * The lead agent takes primary responsibility and only consults supporting agents.
 * 
 * Source: PSSR_VCR_Agent_Assignment_Matrix.xlsx (user-approved configuration)
 */

export type AgentCode = 'selma' | 'fred' | 'ivan' | 'hannah' | 'alex' | 'bob';

export interface AgentAssignment {
  lead: AgentCode | null;
  support: AgentCode[];
}

export interface ChecklistItemAssignment {
  id: string;
  category: string;
  topic: string;
  question: string;
  supportingEvidence: string;
  agents: AgentAssignment;
}

// ─── PSSR Checklist Items ───────────────────────────────────────────────────

export const pssrAssignments: ChecklistItemAssignment[] = [
  // Design Integrity
  {
    id: 'pssr-di-1',
    category: 'Design Integrity',
    topic: 'DEM 1',
    question: 'Does the design and construction of the new or modified asset comply with the approved engineering standards and requirements?',
    supportingEvidence: 'DEM 1 Compliance Report',
    agents: { lead: 'selma', support: ['ivan'] },
  },
  {
    id: 'pssr-di-2',
    category: 'Design Integrity',
    topic: 'DEM 2',
    question: 'Does the design and construction comply with the Process Safety Basic Requirements (DEM-2)?',
    supportingEvidence: 'DEM 2 Compliance Report',
    agents: { lead: 'selma', support: ['ivan'] },
  },
  {
    id: 'pssr-di-3',
    category: 'Design Integrity',
    topic: 'HSSE Case',
    question: 'Has Operational ALARP been demonstrated, including SIMOPS and MOPO requirements, and documented in the Operational HSSE Case?',
    supportingEvidence: 'Operations HSSE Case / ALARP Report',
    agents: { lead: 'selma', support: ['ivan'] },
  },

  // Technical Integrity
  {
    id: 'pssr-ti-1',
    category: 'Technical Integrity',
    topic: 'Scope',
    question: 'Have all agreed scopes been completed, verified, and accepted, with no outstanding works that could impact system readiness, safety, or handover to Operations?',
    supportingEvidence: 'Completions Dossiers / Reports',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-ti-2',
    category: 'Technical Integrity',
    topic: 'MoCs',
    question: 'Have all MOC actions been completed and verified on site, and have any remaining actions been checked to ensure they pose no safety or operational risk?',
    supportingEvidence: 'Project MOC Report',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-ti-3',
    category: 'Technical Integrity',
    topic: 'Safeguarding',
    question: 'Have all Safeguarding and Emergency Shutdown systems been successfully tested and confirmed to be in service?',
    supportingEvidence: 'Cause & Effect Sheet',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-ti-4',
    category: 'Technical Integrity',
    topic: 'FGS',
    question: 'Are all Fire and Gas (F&G) systems fully tested and confirmed to be in service?',
    supportingEvidence: 'FGS Cause & Effect Sheet',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-ti-5',
    category: 'Technical Integrity',
    topic: 'Flange Mgmt',
    question: 'Has a tightness review been completed, confirming all required flange torquing, and have any additional tightness checks been performed where needed?',
    supportingEvidence: 'Flange Management Report',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-ti-6',
    category: 'Technical Integrity',
    topic: 'Relief Valves',
    question: 'Are all Relief Valves in service, correctly lined-up, tagged, and within valid certification?',
    supportingEvidence: 'PSV Certificates',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-ti-7',
    category: 'Technical Integrity',
    topic: 'Leak Test',
    question: 'Have all applicable equipment been leak-tested and confirmed oxygen-free?',
    supportingEvidence: 'Leak Test Report',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-ti-8',
    category: 'Technical Integrity',
    topic: 'Cleanliness',
    question: 'Is the equipment clean, dry, and confirmed to meet the required dew point?',
    supportingEvidence: 'Cleanliness & Dryness Report',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-ti-9',
    category: 'Technical Integrity',
    topic: 'Cathodic Protection',
    question: 'Is the Cathodic Protection (CP) System in service and functioning correctly?',
    supportingEvidence: 'DCVG and CIPS Reports',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-ti-10',
    category: 'Technical Integrity',
    topic: 'Ex Register',
    question: 'Have all Ex (Hazardous Area) Equipment been inspected and confirmed to be within valid certification?',
    supportingEvidence: 'Ex Register',
    agents: { lead: 'fred', support: ['ivan'] },
  },

  // Operating Integrity
  {
    id: 'pssr-oi-1',
    category: 'Operating Integrity',
    topic: 'PSSR Walkdown',
    question: 'Has a PSSR walkdown been carried out and all Priority 1 actions closed out?',
    supportingEvidence: 'Action Close-Out Report',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-oi-2',
    category: 'Operating Integrity',
    topic: 'Documentation',
    question: 'Have Red-Line Mark-Ups (RLMU/RLMP) for all Tier 1 and 2 Critical Documents been made available to the Asset?',
    supportingEvidence: 'Tier 1 & 2 Documents',
    agents: { lead: 'fred', support: ['selma', 'ivan'] },
  },
  {
    id: 'pssr-oi-3',
    category: 'Operating Integrity',
    topic: 'PTW',
    question: 'Have all open permits been fully suspended or closed?',
    supportingEvidence: '',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-oi-4',
    category: 'Operating Integrity',
    topic: 'Overrides',
    question: 'Have all overrides been reviewed and documented in the Override Register?',
    supportingEvidence: 'Override Register',
    agents: { lead: 'fred', support: ['selma', 'ivan'] },
  },
  {
    id: 'pssr-oi-5',
    category: 'Operating Integrity',
    topic: 'Resourcing',
    question: 'Has the required Operations & Maintenance Organization been identified and resourced?',
    supportingEvidence: 'Organization Chart (with names)',
    agents: { lead: 'hannah', support: ['ivan'] },
  },
  {
    id: 'pssr-oi-6',
    category: 'Operating Integrity',
    topic: 'Training',
    question: 'Have all identified and agreed training requirements been completed?',
    supportingEvidence: 'Training Records',
    agents: { lead: 'hannah', support: [] },
  },
  {
    id: 'pssr-oi-7',
    category: 'Operating Integrity',
    topic: 'Procedures',
    question: 'Are the Initial Start-Up and Normal Operating Procedures approved for use and formally handed over to the Asset?',
    supportingEvidence: 'Start-Up & Normal Operating Procedures',
    agents: { lead: 'ivan', support: ['selma'] },
  },
  {
    id: 'pssr-oi-8',
    category: 'Operating Integrity',
    topic: 'Alarms',
    question: 'Has the Variable Table been updated and implemented, and have all inhibited alarms been reactivated?',
    supportingEvidence: 'Variable Table',
    agents: { lead: 'fred', support: ['selma', 'ivan'] },
  },
  {
    id: 'pssr-oi-9',
    category: 'Operating Integrity',
    topic: 'Isolations',
    question: 'Have all process and electrical isolations been reviewed, confirmed safe, and verified as correctly in place?',
    supportingEvidence: 'Isolation Register',
    agents: { lead: 'ivan', support: ['fred'] },
  },
  {
    id: 'pssr-oi-10',
    category: 'Operating Integrity',
    topic: 'LOLC',
    question: 'Has the Locked Open / Locked Closed (LOLC) register been fully updated and verified in the field?',
    supportingEvidence: 'LOLC Register',
    agents: { lead: 'ivan', support: ['selma'] },
  },
  {
    id: 'pssr-oi-11',
    category: 'Operating Integrity',
    topic: 'Temp Equipment',
    question: 'Have all Temporary Equipment items been removed from site, or—where still required—been certified and recorded in the Temporary Equipment Register?',
    supportingEvidence: 'Temp Equipment Register',
    agents: { lead: 'fred', support: ['selma'] },
  },
  {
    id: 'pssr-oi-12',
    category: 'Operating Integrity',
    topic: 'Housekeeping',
    question: 'Have all combustible materials, temporary piping, scaffolding materials, and shutdown materials been fully removed from site?',
    supportingEvidence: '',
    agents: { lead: 'fred', support: [] },
  },
  {
    id: 'pssr-oi-13',
    category: 'Operating Integrity',
    topic: 'Vents & Drains',
    question: 'Have all vent and drain checks been completed—confirming drains, vents, plugs, and caps are correctly installed—and are all sewers uncovered and free of debris?',
    supportingEvidence: '',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-oi-14',
    category: 'Operating Integrity',
    topic: 'Start-Up Org',
    question: 'Is the start-up organization fully defined, adequately resourced, and supported by the required specialist vendors?',
    supportingEvidence: 'SU Organization Chart',
    agents: { lead: 'hannah', support: [] },
  },
  {
    id: 'pssr-oi-15',
    category: 'Operating Integrity',
    topic: 'Communication',
    question: 'Have all affected units and departments been notified of the planned start-up activities?',
    supportingEvidence: 'SU Notification email',
    agents: { lead: 'hannah', support: [] },
  },
  {
    id: 'pssr-oi-16',
    category: 'Operating Integrity',
    topic: 'Incidence',
    question: 'Has a detailed assessment of the incident or equipment failure been completed, with all actions closed or fully mitigated?',
    supportingEvidence: 'RCA Report',
    agents: { lead: 'ivan', support: ['selma'] },
  },
  {
    id: 'pssr-oi-17',
    category: 'Operating Integrity',
    topic: 'Maintenance',
    question: 'Have all outstanding Preventive and corrective maintenance been executed and closed out on the CMMS?',
    supportingEvidence: 'PM and CM workorders',
    agents: { lead: null, support: ['alex'] },
  },

  // Management Systems
  {
    id: 'pssr-ms-1',
    category: 'Management Systems',
    topic: 'CMMS',
    question: 'Has the Asset Register, Preventive Maintenance (PM) routines, and Bills of Materials (BOMs) been fully built, validated, and loaded into the CMMS?',
    supportingEvidence: 'ARB, PM and BOM Report',
    agents: { lead: 'alex', support: [] },
  },
  {
    id: 'pssr-ms-2',
    category: 'Management Systems',
    topic: 'CMMS',
    question: 'Have all applicable Preventive Maintenance (PM) routines been fully activated in the CMMS?',
    supportingEvidence: 'PM Scheduling Report',
    agents: { lead: 'alex', support: [] },
  },
  {
    id: 'pssr-ms-3',
    category: 'Management Systems',
    topic: 'IMS',
    question: 'Is the Integrity Management System (IMS/PLSS) updated to reflect the additional scope and activated?',
    supportingEvidence: 'IMS/PLSS Report',
    agents: { lead: 'alex', support: [] },
  },
  {
    id: 'pssr-ms-4',
    category: 'Management Systems',
    topic: 'FSR',
    question: 'Is the Facility Status Report (FSR) or similar, updated to reflect the integrity status of the new or modified facility?',
    supportingEvidence: 'FSR Dashboard screenshot',
    agents: { lead: 'alex', support: [] },
  },
  {
    id: 'pssr-ms-5',
    category: 'Management Systems',
    topic: 'Registers',
    question: 'Are all Operational Registers fully updated, accurate, and verified?',
    supportingEvidence: 'Operational Registers',
    agents: { lead: 'ivan', support: ['selma'] },
  },
  {
    id: 'pssr-ms-6',
    category: 'Management Systems',
    topic: 'Logsheets',
    question: 'Are the Operator Logsheets updated to reflect the current scope and available for use?',
    supportingEvidence: 'Operator Logsheets',
    agents: { lead: 'ivan', support: ['selma'] },
  },

  // Health & Safety
  {
    id: 'pssr-hs-1',
    category: 'Health & Safety',
    topic: 'Emergency Response',
    question: 'Have Emergency Response (ER) Teams been notified of the start-up, and are they fully resourced and equipped to respond?',
    supportingEvidence: 'Email confirmation from ERT Lead',
    agents: { lead: 'hannah', support: [] },
  },
  {
    id: 'pssr-hs-2',
    category: 'Health & Safety',
    topic: 'Site Access',
    question: 'Have Site Access Controls been fully implemented, and have all prerequisites for safe site access been fully met?',
    supportingEvidence: '',
    agents: { lead: 'ivan', support: [] },
  },
  {
    id: 'pssr-hs-3',
    category: 'Health & Safety',
    topic: 'Site Access',
    question: 'Are all Escape Routes clearly marked and free of obstruction?',
    supportingEvidence: '',
    agents: { lead: 'fred', support: ['ivan'] },
  },
  {
    id: 'pssr-hs-4',
    category: 'Health & Safety',
    topic: 'Fire Audit',
    question: 'Has a Fire & Safety Audit been completed with all actions closed out, and are all safety-critical equipment correctly located and in service?',
    supportingEvidence: 'Fire Audit Report',
    agents: { lead: null, support: ['selma', 'fred', 'ivan'] },
  },
];

// ─── VCR Prerequisites ─────────────────────────────────────────────────────

export const vcrAssignments: ChecklistItemAssignment[] = [
  // Documentation & Information
  {
    id: 'vcr-doc-1',
    category: 'Documentation',
    topic: 'RLMU Tier 1/2',
    question: 'RLMU Tier 1/2 Documents are uploaded in Assai and available for operators use. Hard copies handed over to Ops.',
    supportingEvidence: 'Assai DMS',
    agents: { lead: 'fred', support: ['selma'] },
  },
  {
    id: 'vcr-doc-2',
    category: 'Documentation',
    topic: 'SOPs',
    question: 'Standard Operating Procedures (in English & Arabic) are approved for use and available in Assai for Operators Use.',
    supportingEvidence: 'Assai DMS',
    agents: { lead: 'ivan', support: ['selma'] },
  },
  {
    id: 'vcr-doc-3',
    category: 'Documentation',
    topic: 'Registers & Logsheets',
    question: 'All Operational Registers and log sheets have been provided and handed over to operations.',
    supportingEvidence: 'Registers / Logsheets',
    agents: { lead: 'ivan', support: ['selma'] },
  },
  {
    id: 'vcr-doc-4',
    category: 'Documentation',
    topic: 'Software & Licenses',
    question: 'All relevant software, system backups, and licenses have been successfully transferred from the Project team to the Asset team.',
    supportingEvidence: 'Transfer records',
    agents: { lead: 'fred', support: ['selma'] },
  },

  // Technical & Completion
  {
    id: 'vcr-tech-5',
    category: 'Technical',
    topic: 'Scope Completion',
    question: 'All construction & commissioning scope been completed as far as reasonably practicable: All outstanding work documented in PL, risk assessed, and gap closure plan agreed.',
    supportingEvidence: 'Punchlist / Completions',
    agents: { lead: 'fred', support: [] },
  },
  {
    id: 'vcr-tech-6',
    category: 'Technical',
    topic: '72-Hr Test',
    question: 'A 72-Hour performance test has been successfully carried out and verified against agreed criteria.',
    supportingEvidence: 'Test Report',
    agents: { lead: 'fred', support: [] },
  },
  {
    id: 'vcr-tech-7',
    category: 'Technical',
    topic: 'Cathodic Protection',
    question: 'Cathodic Protection fully commissioned.',
    supportingEvidence: 'CIPS DVCG Report',
    agents: { lead: 'fred', support: [] },
  },
  {
    id: 'vcr-tech-8',
    category: 'Technical',
    topic: 'Alarms & VT',
    question: 'Alarm prioritization and variable table have been implemented on the DCS. VT is available for Operator Use.',
    supportingEvidence: 'VT Report',
    agents: { lead: 'fred', support: ['selma'] },
  },
  {
    id: 'vcr-tech-9',
    category: 'Technical',
    topic: 'Overrides',
    question: 'All temporary overrides and inhibits have been removed and where still required, risk assessed, mutually agreed, and registered in the override register.',
    supportingEvidence: 'Override Register',
    agents: { lead: 'fred', support: ['selma'] },
  },

  // Management of Change
  {
    id: 'vcr-moc-10',
    category: 'MoC',
    topic: 'STQs & MOCs',
    question: 'All STQs and MOCs have been implemented and verified on site. Outstanding actions risk-assessed, agreed and transferred into Asset eMOC system.',
    supportingEvidence: 'MOC Report',
    agents: { lead: null, support: ['selma', 'ivan'] },
  },
  {
    id: 'vcr-moc-11',
    category: 'MoC',
    topic: 'HAZOP Actions',
    question: 'All open actions from HAZOPs, Audit reviews (e.g. PSSR) have been closed or where still open, risk-assessed with closure plan agreed and documented in OWL.',
    supportingEvidence: 'OWL / Action Tracker',
    agents: { lead: null, support: ['selma', 'ivan'] },
  },

  // Maintenance & Systems
  {
    id: 'vcr-maint-12',
    category: 'Maintenance',
    topic: 'CMMS',
    question: 'The Computerized Maintenance Management System (CMMS) has been developed – ARB, PMs, MM and BOMs.',
    supportingEvidence: 'CMMS Report',
    agents: { lead: 'alex', support: ['selma'] },
  },
  {
    id: 'vcr-maint-13',
    category: 'Maintenance',
    topic: 'PM Activation',
    question: 'Preventive Maintenance (PM) Routines have been activated.',
    supportingEvidence: 'PM Schedule',
    agents: { lead: 'alex', support: [] },
  },
  {
    id: 'vcr-maint-14',
    category: 'Maintenance',
    topic: 'IMS',
    question: 'The Integrity Management System (IMS) has been setup and activated.',
    supportingEvidence: 'IMS Report',
    agents: { lead: 'alex', support: ['selma', 'ivan'] },
  },
  {
    id: 'vcr-maint-15',
    category: 'Maintenance',
    topic: 'IAP/Production',
    question: 'The IAP and Production Management systems have been updated to reflect the new facility.',
    supportingEvidence: 'System screenshots',
    agents: { lead: null, support: ['selma'] },
  },
  {
    id: 'vcr-maint-16',
    category: 'Maintenance',
    topic: 'Spares',
    question: '2Y Operating Spares have been Procured & available as Inventory in the warehouse.',
    supportingEvidence: 'Inventory Report',
    agents: { lead: 'alex', support: [] },
  },
  {
    id: 'vcr-maint-17',
    category: 'Maintenance',
    topic: 'Special Tools',
    question: 'Special Tools, Laptops etc required to execute maintenance activities have been handed over from Project to Asset.',
    supportingEvidence: 'Handover list',
    agents: { lead: 'alex', support: [] },
  },
  {
    id: 'vcr-maint-18',
    category: 'Maintenance',
    topic: 'Consumables',
    question: 'The Project has handed over all consumables and leftover commissioning spares to the Operations team.',
    supportingEvidence: 'Handover list',
    agents: { lead: 'alex', support: [] },
  },

  // People & Organization
  {
    id: 'vcr-people-19',
    category: 'People',
    topic: 'Training',
    question: 'The Operations Team have been trained and are competent to operate the facility.',
    supportingEvidence: 'Training Records',
    agents: { lead: null, support: ['hannah'] },
  },
  {
    id: 'vcr-people-20',
    category: 'People',
    topic: 'Support Contracts',
    question: 'Post-handover operational support, including operation and maintenance service contracts, has been agreed and is in place.',
    supportingEvidence: 'Contracts',
    agents: { lead: null, support: [] },
  },
];

// ─── Utility Functions ──────────────────────────────────────────────────────

/** Get all PSSR/VCR items where an agent is the lead */
export const getItemsWhereAgentLeads = (agentCode: AgentCode) =>
  [...pssrAssignments, ...vcrAssignments].filter(item => item.agents.lead === agentCode);

/** Get all PSSR/VCR items where an agent provides support */
export const getItemsWhereAgentSupports = (agentCode: AgentCode) =>
  [...pssrAssignments, ...vcrAssignments].filter(item => item.agents.support.includes(agentCode));

/** Get agent assignment for a specific checklist item */
export const getAssignmentById = (id: string) =>
  [...pssrAssignments, ...vcrAssignments].find(item => item.id === id);

/** Summary stats per agent */
export const getAgentAssignmentStats = (agentCode: AgentCode) => {
  const all = [...pssrAssignments, ...vcrAssignments];
  return {
    leadCount: all.filter(i => i.agents.lead === agentCode).length,
    supportCount: all.filter(i => i.agents.support.includes(agentCode)).length,
    totalInvolved: all.filter(i => i.agents.lead === agentCode || i.agents.support.includes(agentCode)).length,
  };
};