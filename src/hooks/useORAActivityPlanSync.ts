import { supabase } from '@/integrations/supabase/client';

const ORA_ROLE_VARIANTS = [
  'Snr ORA Engr', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr. ORA Engr',
  'Senior ORA Engr.', 'Senior ORA Engineer',
];

/**
 * Finds the Snr ORA Engineer user_id for a given project.
 */
async function findSnrORAEngineer(projectId: string): Promise<string | null> {
  const client = supabase as any;

  // Look in project team members
  const { data: members } = await client
    .from('user_projects')
    .select('user_id, role')
    .eq('project_id', projectId);

  if (members?.length) {
    const oraEngineer = members.find((m: any) => ORA_ROLE_VARIANTS.includes(m.role));
    if (oraEngineer) return oraEngineer.user_id;
  }

  return null;
}

/**
 * Finds the ORP plan for a project.
 */
async function findOrpPlan(projectId: string): Promise<string | null> {
  const client = supabase as any;
  const { data } = await client
    .from('orp_plans')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .maybeSingle();

  return data?.id || null;
}

/**
 * Phase 1: When a P2A Handover Plan is marked COMPLETED,
 * generate ORA plan activities for each VCR.
 */
export async function generateVCRActivitiesFromP2A(
  planId: string,
  projectId: string,
  projectCode: string
) {
  const client = supabase as any;

  // 1. Find ORP plan for this project
  const orpPlanId = await findOrpPlan(projectId);
  if (!orpPlanId) {
    console.warn('[ORA Sync] No active ORP plan found for project', projectId);
    return;
  }

  // 2. Check if VCR activities already exist (duplicate prevention)
  const { data: existingActivities } = await client
    .from('ora_plan_activities')
    .select('id')
    .eq('orp_plan_id', orpPlanId)
    .eq('source_type', 'p2a_vcr')
    .limit(1);

  if (existingActivities?.length > 0) {
    console.log('[ORA Sync] VCR activities already exist, skipping');
    return;
  }

  // 3. Fetch all VCRs for this P2A plan
  const { data: vcrs, error: vcrError } = await client
    .from('p2a_handover_points')
    .select('id, vcr_code, name, description')
    .eq('handover_plan_id', planId)
    .order('vcr_code');

  if (vcrError || !vcrs?.length) {
    console.warn('[ORA Sync] No VCRs found for plan', planId);
    return;
  }

  // 4. Find Snr ORA Engineer
  const oraEngineerId = await findSnrORAEngineer(projectId);

  // 5. For each VCR, create activity + "VCR Delivery Plan" sub-activity + task
  for (let i = 0; i < vcrs.length; i++) {
    const vcr = vcrs[i];
    const vcrLabel = `${vcr.vcr_code}: ${vcr.name}`;

    // Create VCR parent activity
    const { data: parentActivity, error: parentError } = await client
      .from('ora_plan_activities')
      .insert({
        orp_plan_id: orpPlanId,
        activity_code: vcr.vcr_code,
        name: vcrLabel,
        description: vcr.description || `VCR scope for ${vcr.name}`,
        source_type: 'p2a_vcr',
        source_ref_id: vcr.id,
        source_ref_table: 'p2a_handover_points',
        status: 'NOT_STARTED',
        assigned_to: oraEngineerId,
      })
      .select('id')
      .single();

    if (parentError || !parentActivity) {
      console.error('[ORA Sync] Failed to create VCR activity', parentError);
      continue;
    }

    // Create "VCR Delivery Plan" sub-activity
    const { data: subActivity, error: subError } = await client
      .from('ora_plan_activities')
      .insert({
        orp_plan_id: orpPlanId,
        parent_id: parentActivity.id,
        activity_code: `${vcr.vcr_code}.01`,
        name: 'VCR Delivery Plan',
        description: `Create and approve the VCR Delivery Plan for ${vcrLabel}`,
        source_type: 'vcr_delivery_plan',
        source_ref_id: vcr.id,
        source_ref_table: 'p2a_handover_points',
        status: 'NOT_STARTED',
        assigned_to: oraEngineerId,
      })
      .select('id')
      .single();

    if (subError || !subActivity) {
      console.error('[ORA Sync] Failed to create VCR Delivery Plan sub-activity', subError);
      continue;
    }

    // Create task for Snr ORA Engineer
    if (oraEngineerId) {
      const { data: taskData } = await client
        .from('user_tasks')
        .insert({
          user_id: oraEngineerId,
          title: `Create VCR Delivery Plan – ${vcrLabel}`,
          description: `Set up the VCR Delivery Plan for ${vcrLabel}. Configure training, procedures, critical documents, systems, and other building blocks.`,
          type: 'vcr_delivery_plan',
          priority: 'High',
          status: 'pending',
          metadata: {
            plan_id: planId,
            project_id: projectId,
            project_code: projectCode,
            ora_plan_activity_id: subActivity.id,
            vcr_id: vcr.id,
            vcr_code: vcr.vcr_code,
            vcr_name: vcr.name,
            action: 'create_vcr_delivery_plan',
            source: 'p2a_handover',
          },
        })
        .select('id')
        .single();

      // Link task back to the sub-activity
      if (taskData) {
        await client
          .from('ora_plan_activities')
          .update({ task_id: taskData.id })
          .eq('id', subActivity.id);
      }
    }
  }

  // 6. Mark "P2A Handover Plan" deliverable as COMPLETED in orp_plan_deliverables (if exists)
  await client
    .from('orp_plan_deliverables')
    .update({ 
      status: 'COMPLETED',
      completion_percentage: 100,
    })
    .eq('orp_plan_id', orpPlanId)
    .ilike('name', '%P2A%Handover%');

  console.log(`[ORA Sync] Generated ${vcrs.length} VCR activities for plan ${planId}`);
}

/**
 * Syncs a completed user_task back to its linked ora_plan_activity.
 * Called from the post-completion handler in useUserTasks.
 */
export async function syncORAActivityCompletion(taskId: string, status: 'completed' | 'cancelled') {
  const client = supabase as any;

  // Find the task to get its metadata
  const { data: task } = await client
    .from('user_tasks')
    .select('metadata')
    .eq('id', taskId)
    .single();

  const activityId = task?.metadata?.ora_plan_activity_id;
  if (!activityId) return;

  if (status === 'completed') {
    await client
      .from('ora_plan_activities')
      .update({
        status: 'COMPLETED',
        completion_percentage: 100,
      })
      .eq('id', activityId);
  }
  // The DB trigger will handle rolling up to the parent automatically
}
