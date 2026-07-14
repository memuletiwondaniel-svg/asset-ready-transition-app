/**
 * Canonical VCR certificate-number helper.
 *
 * Format: `{TYPE}-{project_code with non-alphanumerics stripped}-VCR{NN}`
 * where NN is the trailing digit run of `vcr_code` (e.g. VCR-DP300-02 → 02).
 *
 * Examples (exact):
 *   PAC-DP300-VCR02
 *   SOF-DP300-VCR02
 *
 * Server mirror: public.vcr_cert_number(type, prefix, number, vcr_code).
 */
export type CertType = 'PAC' | 'SOF';

const stripNonAlnum = (s: string) => (s || '').replace(/[^A-Za-z0-9]/g, '');
const trailingNum = (s: string) => {
  const m = (s || '').match(/(\d+)\s*$/);
  return m ? m[1] : '';
};

export function vcrCertNumber(type: CertType, projectCode: string, vcrCode: string): string {
  const proj = stripNonAlnum(projectCode);
  const nn = trailingNum(vcrCode);
  return `${type}-${proj}-VCR${nn}`;
}
