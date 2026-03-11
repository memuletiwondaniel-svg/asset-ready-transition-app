import { supabase } from '@/integrations/supabase/client';

/**
 * Generates user tasks for all leaf-level ORA activities in an approved plan.
 * Idempotent: skips if tasks already exist for this plan.
 * Also ensures the P2A task exists.
 */
export async function generateLeafTasks(planId: string): Promise<{ created: number }> {
  // 1. Check if tasks already exist for this plan
  const { data: existingTasks } = await supabase
    .from('user_tasks')
    .select('id')
    .eq('type', 'ora_activity')
    .filter('metadata->>plan_id', 'eq', planId)
    .limit(1);

  if (existingTasks && existingTasks.length > 0) {
    return { created: 0 }; // Already generated
  }

  // 2. Get plan info
  const { data: plan } = await (supabase as any)
    .from('orp_plans')
    .select('project_id')
    .eq('id', planId)
    .single();

  if (!plan?.project_id) return { created: 0 };

  // 3. Get all activities for this plan
  const { data: activities } = await (supabase as any)
    .from('ora_plan_activities')
    .select('id, name, activity_code, start_date, end_date, parent_id, status')
    .eq('orp_plan_id', planId);

  if (!activities || activities.length === 0) return { created: 0 };

  // 4. Find the Sr. ORA Engineer
  const { data: projectTeam } = await supabase
    .from('project_team_members')
    .select('user_id, role')
    .eq('project_id', plan.project_id);

  const srOraEngr = (projectTeam || []).find((m: any) => {
    const role = (m.role || '').toLowerCase();
    return role.includes('snr ora') || role.includes('senior ora') || role.includes('sr. ora') || role.includes('sr ora');
  });

  if (!srOraEngr?.user_id) {
    console.warn('generateLeafTasks: No Sr. ORA Engineer found for project', plan.project_id);
    return { created: 0 };
  }

  // 5. Get project info for task titles
  const { data: projInfo } = await supabase
    .from('projects')
    .select('project_id_prefix, project_id_number, project_title')
    .eq('id', plan.project_id)
    .single();

  const projCode = projInfo
    ? `${projInfo.project_id_prefix || ''}-${projInfo.project_id_number || ''}`
    : '';
  const projName = projInfo
    ? `${projCode} - ${projInfo.project_title || ''}`
    : '';

  // 6. Identify leaf activities (no children)
  const parentIds = new Set(activities.map((a: any) => a.parent_id).filter(Boolean));
  const leafActivities = activities.filter((a: any) => {
    if (parentIds.has(a.id)) return false; // is a parent
    if (a.activity_code === 'P2A-01' || a.activity_code === 'EXE-10') return false; // P2A has its own task
    const nameLower = (a.name || '').toLowerCase();
    if (nameLower.includes('p2a plan') || nameLower.includes('p2a handover')) return false; // P2A activity variant
    return true;
  });

  // Sort by start_date
  leafActivities.sort((a: any, b: any) => {
    const aDate = a.start_date || '';
    const bDate = b.start_date || '';
    return aDate.localeCompare(bDate);
  });

  // 7. Create tasks
  let created = 0;
  for (let i = 0; i < leafActivities.length; i++) {
    const act = leafActivities[i];
    try {
      await supabase.rpc('create_user_task', {
        p_user_id: srOraEngr.user_id,
        p_title: `${act.name} – ${projCode}`,
        p_description: `Complete the ORA activity "${act.name}" for project ${projName}.`,
        p_type: 'ora_activity',
        p_status: 'pending',
        p_priority: i === 0 ? 'High' : 'Medium',
        p_metadata: {
          source: 'ora_workflow',
          project_id: plan.project_id,
          project_code: projCode,
          plan_id: planId,
          action: 'complete_ora_activity',
          ora_plan_activity_id: act.id,
          ora_activity_id: act.id,
          activity_code: act.activity_code,
          activity_name: act.name,
          start_date: act.start_date || null,
          end_date: act.end_date || null,
        },
      });
      created++;
    } catch (err) {
      console.error('generateLeafTasks: Failed for', act.activity_code, err);
    }
  }

  // 8. Also check/create P2A task if missing
  const { data: existingP2ATask } = await supabase
    .from('user_tasks')
    .select('id')
    .eq('type', 'task')
    .filter('metadata->>plan_id', 'eq', planId)
    .filter('metadata->>action', 'eq', 'create_p2a_plan')
    .limit(1);

  if (!existingP2ATask || existingP2ATask.length === 0) {
    try {
      await supabase.rpc('create_user_task', {
        p_user_id: srOraEngr.user_id,
        p_title: `Develop P2A Plan – ${projName}`,
        p_description: `The ORA Plan has been approved. Develop the P2A handover plan for project ${projName}.`,
        p_type: 'task',
        p_status: 'pending',
        p_priority: 'High',
        p_metadata: {
          source: 'ora_workflow',
          project_id: plan.project_id,
          project_code: projCode,
          plan_id: planId,
          action: 'create_p2a_plan',
        },
      });
      created++;
    } catch (err) {
      console.error('generateLeafTasks: Failed to create P2A task', err);
    }
  }

  return { created };
}
