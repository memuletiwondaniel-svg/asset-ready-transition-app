/**
 * Default document numbering segments per wizard / document family.
 *
 * Format reminder (9-segment, dash-separated):
 *   {Project}-{Originator}-{Plant}-{Site}-{Unit}-{Discipline}-{DocumentType}-{DocumentNo}-{Sequence}
 *
 * Add new constants here as additional document-producing wizards come online
 * (Critical Documents, etc.). Components MUST import from this module rather
 * than hardcoding segment codes inline.
 */

export const PROCEDURE_DOCUMENT_DEFAULTS = {
  discipline: 'OA',
  document_type: '6039',
  originator: 'BGC',
} as const;
