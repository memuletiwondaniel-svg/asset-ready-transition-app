import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a VCR code in the standard format: VCR-{projectCode}-{seq}
 * e.g. VCR-DP300-07
 * 
 * This matches the format used in the P2A Plan wizard (Step 2).
 * The sequence number is determined by counting existing VCRs in the plan.
 */
export async function generateVCRCode(
  handoverPlanId: string,
  projectCode: string,
): Promise<string> {
  const cleanCode = projectCode.replace(/-/g, '');

  // Count existing VCRs in this plan to determine next sequence number
  const { count, error } = await supabase
    .from('p2a_handover_points')
    .select('id', { count: 'exact', head: true })
    .eq('handover_plan_id', handoverPlanId);

  if (error) {
    console.error('Error counting VCRs:', error);
  }

  const nextSeq = (count ?? 0) + 1;
  return `VCR-${cleanCode}-${String(nextSeq).padStart(2, '0')}`;
}
