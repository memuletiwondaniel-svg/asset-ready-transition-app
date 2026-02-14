/**
 * Truncate a full VCR code (e.g. "VCR-DP300-001") to short form ("VCR-001")
 * for compact display within a single-project context.
 * The full code is retained in data; this is purely cosmetic.
 */
export const shortVCRCode = (code: string | undefined): string => {
  if (!code) return '';
  // Match VCR-<projectCode>-<seq> and keep only VCR-<seq>
  return code.replace(/^VCR-[A-Z0-9]+-/, 'VCR-');
};

