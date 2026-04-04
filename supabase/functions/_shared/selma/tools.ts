export const SELMA_TOOLS = [
  {
    name: "resolve_document_type",
    description: "Resolve a document type acronym or name to its type code and discipline. Always call this first when the user mentions any document type acronym. Checks the learned acronyms table first, then dms_document_types.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The document type acronym or partial name to resolve (e.g. 'BFD', 'P&ID', 'loop diagram')"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "resolve_project_code",
    description: "Resolve a DP number to one or more Assai project codes. Normalise to DP-XXX format first. Returns all matching active projects — if multiple, search all of them.",
    input_schema: {
      type: "object",
      properties: {
        dp_number: {
          type: "string",
          description: "The DP number in DP-XXX format (e.g. 'DP-223', 'DP-33A', 'DP-164')"
        }
      },
      required: ["dp_number"]
    }
  },
  {
    name: "search_assai_documents",
    description: "Search the Assai DMS using SEARCH_V11 with full session management, pagination, and HTML error detection. Resolve document type and project code first when applicable. Apply the 6-strategy cascade.",
    input_schema: {
      type: "object",
      properties: {
        document_number_pattern: {
          type: "string",
          description: "Document number prefix or exact number (e.g. '6523-%' for all DP223 documents)"
        },
        document_type: {
          type: "string",
          description: "Document type code from resolve_document_type"
        },
        discipline_code: {
          type: "string",
          description: "Discipline/ZV code to filter by"
        },
        title: {
          type: "string",
          description: "Keyword to search in document title — clean engineering terms, no stop words"
        },
        status_code: {
          type: "string",
          description: "Status code to filter by (e.g. 'AFC', 'AFU', 'IFB')"
        },
        company_code: {
          type: "string",
          description: "Company/originator code to filter by"
        },
        max_results: {
          type: "number",
          description: "Maximum results to return (default 50, max 255)"
        }
      },
      required: []
    }
  },
  {
    name: "read_assai_document",
    description: "Retrieve and analyse the full content of a specific Assai document. Downloads via Assai's download pipeline and uses Claude to extract key information. Use when the user wants to understand document content, check completeness, or extract a tag list.",
    input_schema: {
      type: "object",
      properties: {
        document_number: {
          type: "string",
          description: "The exact Assai document number (e.g. '6529-ABBE-EDS-001')"
        },
        analysis_focus: {
          type: "string",
          description: "What to focus on when analysing — optional (e.g. 'check revision status', 'extract tag list')"
        }
      },
      required: ["document_number"]
    }
  },
  {
    name: "discover_project_vendors",
    description: "Discover vendors, suppliers, contractors, and subcontractors on a project. Use this — and only this — when the user asks about vendors or suppliers. Never use search_assai_documents for vendor identification.",
    input_schema: {
      type: "object",
      properties: {
        project_code: {
          type: "string",
          description: "The Assai project code to scan"
        },
        document_number_pattern: {
          type: "string",
          description: "Document number prefix for the project"
        }
      },
      required: ["project_code"]
    }
  },
  {
    name: "learn_acronym",
    description: "Persist a newly learned document type acronym to dms_document_type_acronyms. Call when the user clarifies an acronym or when you resolve an unusual abbreviation.",
    input_schema: {
      type: "object",
      properties: {
        acronym: { type: "string", description: "The acronym to learn, uppercase" },
        full_name: { type: "string", description: "The full document type name" },
        type_code: { type: "string", description: "The resolved document type code" },
        notes: { type: "string", description: "Optional notes" }
      },
      required: ["acronym", "full_name", "type_code"]
    }
  },
  {
    name: "check_vcr_document_readiness",
    description: "Check VCR document readiness across all deliverable categories for a project. Queries critical documents (vcr_document_requirements), operational registers (p2a_vcr_register_selections), and logsheets (p2a_vcr_logsheets). Joins dms_document_types for tier/RLMU metadata. Returns a unified readiness report with counts, gaps, and recommendations.",
    input_schema: {
      type: "object",
      properties: {
        vcr_id: {
          type: "string",
          description: "The VCR plan ID (UUID) to check readiness for"
        },
        category: {
          type: "string",
          description: "Optional filter: 'critical_documents', 'registers', 'logsheets', or omit for all"
        }
      },
      required: ["vcr_id"]
    }
  },
  {
    name: "get_checklist_document_insights",
    description: "Cross-reference VCR/PSSR checklist items with live document status. For each checklist item, identifies which documents, registers, and logsheets are relevant and their current readiness state. Provides actionable recommendations for completing checklist items.",
    input_schema: {
      type: "object",
      properties: {
        vcr_id: {
          type: "string",
          description: "The VCR plan ID (UUID)"
        },
        checklist_item_id: {
          type: "string",
          description: "Optional: specific checklist item ID to analyse. Omit for overview of all items."
        }
      },
      required: ["vcr_id"]
    }
  },
  {
    name: "assign_document_numbers",
    description: "Reserve sequential 9-segment document numbers for VCR deliverables (critical documents, registers, or logsheets) that don't yet have assigned numbers. Uses the project's numbering convention and reserves in dms_reserved_numbers.",
    input_schema: {
      type: "object",
      properties: {
        vcr_id: {
          type: "string",
          description: "The VCR plan ID (UUID)"
        },
        source_table: {
          type: "string",
          description: "Which deliverable table: 'vcr_document_requirements', 'p2a_vcr_register_selections', or 'p2a_vcr_logsheets'"
        },
        source_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of row IDs to assign numbers to. If omitted, assigns to all rows missing document numbers in the source_table for this VCR."
        },
        project_id: {
          type: "string",
          description: "The project UUID for numbering context"
        }
      },
      required: ["vcr_id", "source_table", "project_id"]
    }
  },
  {
    name: "organize_project_documents",
    description: "Organize and display project documentation in a hierarchical view. Groups documents by discipline or by package, showing counts, completion status, and RLMU state for each group. Useful for asset teams to understand what documentation exists and what's missing.",
    input_schema: {
      type: "object",
      properties: {
        vcr_id: {
          type: "string",
          description: "The VCR plan ID (UUID)"
        },
        group_by: {
          type: "string",
          description: "'discipline' or 'package' — how to organize the view"
        }
      },
      required: ["vcr_id", "group_by"]
    }
  }
];
