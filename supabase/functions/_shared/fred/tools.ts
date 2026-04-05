/**
 * Fred's GoCompletions Tool Definitions
 * 5 core tools for completions intelligence
 */

export const FRED_GOCOMPLETIONS_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_completions_tags",
      description: "Search equipment tags in GoCompletions by system, subsystem, discipline, tag number, or module. Returns tag list with ITR codes, description, discipline, sub-system, and completion status. Use this when users ask about specific tags, equipment, or want to find items in a subsystem.",
      parameters: {
        type: "object",
        properties: {
          tag_number: { type: "string", description: "Tag number or partial tag number to search (e.g. 'C017-403PIT-002')" },
          sub_system: { type: "string", description: "Sub-system code to filter by (e.g. '100-01', '960-08')" },
          system: { type: "string", description: "System code to filter by (e.g. '100', '960')" },
          discipline: { type: "string", description: "Discipline code: I=Instrument, M=Mechanical, E=Electrical, P=Piping, X=Painting" },
          project_code: { type: "string", description: "BGC project code (e.g. 'BNGL', 'ZB'). Default: BNGL" },
          max_results: { type: "number", description: "Maximum results to return (default 50, max 200)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_completion_status",
      description: "Get system or subsystem completion status from GoCompletions. Returns MC/PC/COM totals, ITR counts (total vs complete vs outstanding), A-punch and B-punch outstanding counts. This is the primary status overview tool.",
      parameters: {
        type: "object",
        properties: {
          project_code: { type: "string", description: "BGC project code (e.g. 'BNGL'). Default: BNGL" },
          system: { type: "string", description: "Optional system code to filter (e.g. '100')" },
          itr_class: { type: "string", enum: ["All", "A", "B"], description: "ITR class filter: All, A (Mechanical Completion), B (Pre-Commissioning). Default: All" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_punchlist_details",
      description: "Get punchlist items from GoCompletions for a subsystem or tag. Returns punch items with category (A=safety blocker, B=non-critical), tag, discipline, actionee, responsibility, raised/cleared dates, and status. A-punch items BLOCK progression to next phase unless exception granted.",
      parameters: {
        type: "object",
        properties: {
          sub_system: { type: "string", description: "Sub-system code (e.g. '100-02')" },
          tag_number: { type: "string", description: "Specific tag number" },
          project_code: { type: "string", description: "BGC project code. Default: BNGL" },
          category: { type: "string", enum: ["A", "B", "both"], description: "Punch category filter. Default: both" },
          status: { type: "string", enum: ["open", "closed", "all"], description: "Status filter. Default: open" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_handover_certificate_status",
      description: "Get handover certificate status (MCC, PCC, RFC, RFSU, FAC, MCC-DAC, PCDAC, RFOC) from GoCompletions. Returns certificate ref, subsystem, tags count, total ITRs, outstanding ITRs, generated date, accepted date. Outstanding ITRs > 0 means subsystem is NOT ready for next phase.",
      parameters: {
        type: "object",
        properties: {
          certificate_type: {
            type: "string",
            enum: ["MCC", "PCC", "RFC", "RFSU", "FAC", "MCC-DAC", "PCDAC", "RFOC"],
            description: "Certificate type to query"
          },
          sub_system: { type: "string", description: "Optional subsystem filter" },
          project_code: { type: "string", description: "BGC project code. Default: BNGL" },
        },
        required: ["certificate_type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_itr_for_equipment",
      description: "Look up which Inspection Test Records (ITRs) are required for a specific equipment type. Uses the BGC ITR-to-Equipment Type Allocation Matrix (Rev 04A). Returns A-ITRs (Mechanical Completion phase) and B-ITRs (Pre-Commissioning phase) required.",
      parameters: {
        type: "object",
        properties: {
          equipment_type: {
            type: "string",
            description: "Equipment type (e.g. 'Pressure Transmitter', 'Centrifugal Pump', 'SDV', 'PSV', 'LV Cable', 'Heat Exchanger')"
          },
          discipline: {
            type: "string",
            enum: ["instrument", "mechanical", "electrical", "piping"],
            description: "Discipline filter (optional — auto-detected from equipment type if not provided)"
          },
        },
        required: ["equipment_type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_document_readiness",
      description: "Query Selma (Document Intelligence Agent) via A2A protocol to check document readiness for a subsystem or discipline. Returns status of as-built P&IDs, datasheets, operating procedures, and other Tier 1/2 documents relevant to the completions dossier. Use this when assessing overall readiness for MCC/PCC/RFSU or when identifying documentation gaps blocking handover.",
      parameters: {
        type: "object",
        properties: {
          sub_system: { type: "string", description: "Sub-system code (e.g. '100-01', '960-08')" },
          project_code: { type: "string", description: "BGC project code (e.g. 'BNGL'). Default: BNGL" },
          discipline: { type: "string", description: "Optional discipline filter: instrument, mechanical, electrical, piping" },
          certificate_phase: { 
            type: "string", 
            enum: ["MCC", "PCC", "RFSU", "FAC"],
            description: "Which handover phase to check document readiness for. Determines which document types are critical."
          },
        },
        required: ["sub_system"],
      },
    },
  },
];

/** Tool names for TOOL_AGENT_MAP and SPECIALIST_TOOL_NAMES */
export const FRED_GOC_TOOL_NAMES = [
  'search_completions_tags',
  'get_completion_status',
  'get_punchlist_details',
  'get_handover_certificate_status',
  'lookup_itr_for_equipment',
  'check_document_readiness',
];
