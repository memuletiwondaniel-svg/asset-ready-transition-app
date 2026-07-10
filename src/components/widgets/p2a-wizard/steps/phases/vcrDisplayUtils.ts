/**
 * Truncate a full VCR code (e.g. "VCR-DP300-01" or "VCR-DP300-01: OSBL")
 * to short form ("VCR-01") for compact display within a single-project
 * context. Any trailing ": name" suffix is stripped so callers can compose
 * "(name)" separately without producing "VCR-01: OSBL (OSBL)".
 * The full code is retained in data; this is purely cosmetic.
 */
export const shortVCRCode = (code: string | undefined): string => {
  if (!code) return '';
  // Strip trailing ": something" suffix first.
  const stripped = code.replace(/\s*:\s*.+$/, '');
  // Match VCR-<projectCode>-<seq> and keep only VCR-<seq>
  return stripped.replace(/^VCR-[A-Z0-9]+-/, 'VCR-');
};

/**
 * Strip a leading action verb ("Deliver", "Develop", "Complete", "Prepare",
 * "Review") from an activity task title so cards render the deliverable
 * rather than the verb. Bundle cards compose their own titles and do not
 * use this helper.
 */
const LEADING_VERB_RE = /^(Deliver|Develop|Complete|Prepare|Review|Create|Build|Draft)\s+/i;
export const stripLeadingTaskVerb = (title: string | undefined | null): string => {
  if (!title) return '';
  return title.replace(LEADING_VERB_RE, '');
};

/**
 * Replace an inline full VCR code ("VCR-DP300-02") anywhere in a string
 * with its short form ("VCR-02"). Used to normalize activity task titles
 * that were generated with the long code embedded.
 */
export const shortenInlineVCRCode = (text: string | undefined | null): string => {
  if (!text) return '';
  return text.replace(/VCR-[A-Z0-9]+-(\d+)/g, 'VCR-$1');
};

