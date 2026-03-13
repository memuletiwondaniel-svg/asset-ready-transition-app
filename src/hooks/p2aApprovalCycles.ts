export async function getNextP2AHistoryCycle(client: any, planId: string): Promise<number> {
  const { data: maxCycleRow } = await client
    .from('p2a_approver_history')
    .select('cycle')
    .eq('handover_id', planId)
    .order('cycle', { ascending: false })
    .limit(1);

  return (maxCycleRow?.[0]?.cycle || 0) + 1;
}

export async function getCurrentP2AReviewCycle(client: any, planId: string): Promise<number> {
  const { data: latestSubmission } = await client
    .from('p2a_approver_history')
    .select('cycle, approved_at')
    .eq('handover_id', planId)
    .eq('status', 'SUBMITTED')
    .order('approved_at', { ascending: false })
    .limit(1);

  const submittedCycle = latestSubmission?.[0]?.cycle;
  if (submittedCycle) return submittedCycle;

  return getNextP2AHistoryCycle(client, planId);
}
