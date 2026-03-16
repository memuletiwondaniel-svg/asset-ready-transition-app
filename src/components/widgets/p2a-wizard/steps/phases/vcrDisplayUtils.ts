/**
 * Truncate a full VCR code (e.g. "VCR-DP300-01") to short form ("VCR-01")
 * for compact display within a single-project context.
 * The full code is retained in data; this is purely cosmetic.
 */
export const shortVCRCode = (code: string | undefined): string => {
  if (!code) return '';
  // Match VCR-<projectCode>-<seq> and keep only VCR-<seq>
  return code.replace(/^VCR-[A-Z0-9]+-/, 'VCR-');
};

