import { useEffect, useRef } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}

export interface UserTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  type: string;
  status: string;
  display_order: number;
  created_at: string;
  metadata: any;
  blocking_tasks?: string[];
  blocked_by_tasks?: string[];
}

// Fetch active tasks (pending, in_progress, waiting) for the kanban board
const BUNDLE_TYPES = ['vcr_checklist_bundle', 'vcr_approval_bundle', 'pssr_checklist_bundle', 'pssr_approval_bundle'];

interface FetchResult {
  tasks: UserTask[];
  dependencies: TaskDependency[];
  bundleTasks: any[];
  oraActivityDates: Record<string, { start_date: string | null; end_date: string | null; duration_days: number | null; completion_percentage: number | null }>;
  oraPlanStatuses: Record<string, string>; // projectId -> plan status
  p2aActivityProgress: Record<string, number>; // taskId -> P2A-01 completion_percentage
}

const fetchUserTasks = async (userId: string): Promise<FetchResult> => {
  // Single query fetches both regular tasks AND bundle tasks (previously two separate queries)
  const { data: tasksData, error: tasksError } = await supabase
    .from('user_tasks')
    .select('id,title,description,due_date,priority,type,status,display_order,created_at,metadata,sub_items,progress_percentage')
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress', 'waiting', 'completed'])
    .order('display_order', { ascending: true })
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true });

  if (tasksError) throw tasksError;

  const taskIds = (tasksData || []).map(t => t.id);

  // Split into regular tasks and bundle tasks
  const regularTasks = (tasksData || []).filter(t => !BUNDLE_TYPES.includes(t.type));
  const bundleTasks = (tasksData || []).filter(t => BUNDLE_TYPES.includes(t.type));

  // Collect IDs needed for parallel lookups
  const oraActivityIds = regularTasks
    .map(t => (t.metadata as Record<string, any>)?.ora_plan_activity_id)
    .filter(Boolean) as string[];

  const p2aTasks = regularTasks.filter(t => {
    const meta = t.metadata as Record<string, any>;
    return meta?.action === 'create_p2a_plan';
  });
  // Collect both plan_id (orp_plan_id) and project_id for flexible lookups
  const p2aPlanIds = [...new Set(p2aTasks.map(t => (t.metadata as Record<string, any>).plan_id).filter(Boolean))] as string[];
  const p2aProjectIds = [...new Set(p2aTasks.map(t => (t.metadata as Record<string, any>).project_id).filter(Boolean))] as string[];

  const oraPlanCreationTasks = regularTasks.filter(t => {
    const meta = t.metadata as Record<string, any>;
    return t.type === 'ora_plan_creation' || meta?.action === 'create_ora_plan';
  });
  const oraPlanProjectIds = oraPlanCreationTasks
    .map(t => (t.metadata as Record<string, any>)?.project_id)
    .filter(Boolean) as string[];

  const tasksNeedingCode = regularTasks.filter(t => {
    const m = t.metadata as Record<string, any>;
    return m?.project_id && !m?.project_code;
  });
  const projectIdsForCode = [...new Set(tasksNeedingCode.map(t => (t.metadata as Record<string, any>).project_id))] as string[];

  // Run ALL secondary queries in parallel
  const [
    depsResult,
    oraActivitiesResult,
    p2aActivitiesResult,
    oraPlanStatusResult,
    projectCodeResult,
  ] = await Promise.all([
    // 1. Task dependencies
    taskIds.length > 0
      ? Promise.all([
          supabase.from('task_dependencies').select('id,task_id,depends_on_task_id').in('task_id', taskIds),
          supabase.from('task_dependencies').select('id,task_id,depends_on_task_id').in('depends_on_task_id', taskIds),
        ])
      : Promise.resolve(null),
    // 2. ORA activity dates
    oraActivityIds.length > 0
      ? supabase.from('ora_plan_activities').select('id, start_date, end_date, duration_days, completion_percentage').in('id', oraActivityIds)
      : Promise.resolve(null),
    // 3. P2A activity progress — look up by orp_plan_id OR by project_id → orp_plans → activities
    (p2aPlanIds.length > 0 || p2aProjectIds.length > 0)
      ? (async () => {
          // Run BOTH strategies in parallel to avoid sequential waterfall
          const [directResult, projectPlansResult] = await Promise.all([
            // Strategy A: direct lookup by orp_plan_id
            p2aPlanIds.length > 0
              ? supabase.from('ora_plan_activities')
                  .select('orp_plan_id, completion_percentage, activity_code, name')
                  .in('orp_plan_id', p2aPlanIds)
              : Promise.resolve({ data: [] as any[] }),
            // Strategy B: lookup orp_plans by project_id (runs in parallel, not after A)
            p2aProjectIds.length > 0
              ? (supabase as any).from('orp_plans').select('id, project_id').in('project_id', p2aProjectIds)
              : Promise.resolve({ data: [] as any[] }),
          ]);

          let results: any[] = directResult.data || [];
          const coveredPlanIds = new Set(results.map(r => r.orp_plan_id));

          // For projects not covered by Strategy A, fetch activities from discovered plans
          if (projectPlansResult.data?.length) {
            const uncoveredPlans = projectPlansResult.data.filter((p: any) => !coveredPlanIds.has(p.id));
            if (uncoveredPlans.length > 0) {
              const planIds = uncoveredPlans.map((p: any) => p.id);
              const { data: acts } = await supabase.from('ora_plan_activities')
                .select('orp_plan_id, completion_percentage, activity_code, name')
                .in('orp_plan_id', planIds);
              if (acts) {
                const planToProject: Record<string, string> = {};
                uncoveredPlans.forEach((p: any) => { planToProject[p.id] = p.project_id; });
                results.push(...acts.map((a: any) => ({ ...a, _project_id: planToProject[a.orp_plan_id] })));
              }
            }
          }

          // Filter to P2A activities
          const p2aActivities = results.filter((a: any) =>
            a.activity_code === 'P2A-01' || a.activity_code === 'EXE-10' || a.name?.toLowerCase().includes('p2a plan') || a.name?.toLowerCase().includes('p2a')
          );
          return { data: p2aActivities };
        })()
      : Promise.resolve(null),
    // 4. ORA plan statuses
    oraPlanProjectIds.length > 0
      ? supabase.from('orp_plans').select('id, project_id, status').in('project_id', oraPlanProjectIds)
      : Promise.resolve(null),
    // 5. Project codes
    projectIdsForCode.length > 0
      ? supabase.from('projects').select('id, project_id_prefix, project_id_number').in('id', projectIdsForCode)
      : Promise.resolve(null),
  ]);

  // Process dependencies
  let depsData: TaskDependency[] = [];
  if (depsResult) {
    const [depsByTaskRes, depsByDependsRes] = depsResult;
    if (depsByTaskRes.error) throw depsByTaskRes.error;
    if (depsByDependsRes.error) throw depsByDependsRes.error;
    const combined = [...(depsByTaskRes.data || []), ...(depsByDependsRes.data || [])];
    const seen = new Set<string>();
    depsData = combined.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
  }

  // Process ORA activity dates
  let oraActivityDates: Record<string, { start_date: string | null; end_date: string | null; duration_days: number | null; completion_percentage: number | null }> = {};
  if (oraActivitiesResult && 'data' in oraActivitiesResult && oraActivitiesResult.data) {
    oraActivitiesResult.data.forEach((a: any) => { oraActivityDates[a.id] = a; });
  }

  // Process P2A activity progress
  let p2aActivityProgress: Record<string, number> = {};
  if (p2aActivitiesResult && 'data' in p2aActivitiesResult && p2aActivitiesResult.data) {
    const planToProgress: Record<string, number> = {};
    const projectToProgress: Record<string, number> = {};
    p2aActivitiesResult.data.forEach((a: any) => {
      planToProgress[a.orp_plan_id] = a.completion_percentage ?? 0;
      if (a._project_id) { projectToProgress[a._project_id] = a.completion_percentage ?? 0; }
    });
    p2aTasks.forEach(t => {
      const meta = t.metadata as Record<string, any>;
      const planId = meta.plan_id;
      const projId = meta.project_id;
      if (planId && planId in planToProgress) {
        p2aActivityProgress[t.id] = planToProgress[planId];
      } else if (projId && projId in projectToProgress) {
        p2aActivityProgress[t.id] = projectToProgress[projId];
      }
    });
  }

  // Process ORA plan statuses
  let oraPlanStatuses: Record<string, string> = {};
  if (oraPlanStatusResult && 'data' in oraPlanStatusResult && oraPlanStatusResult.data) {
    oraPlanStatusResult.data.forEach((p: any) => { oraPlanStatuses[p.project_id] = p.status; });
  }

  // Process project codes
  let projectCodeMap: Record<string, string> = {};
  if (projectCodeResult && 'data' in projectCodeResult && projectCodeResult.data) {
    projectCodeResult.data.forEach((p: any) => { projectCodeMap[p.id] = `${p.project_id_prefix}-${p.project_id_number}`; });
  }

  // Enrich tasks with dependency information
  const enrichedTasks = regularTasks.map(task => {
    const blockingTasks = depsData.filter(dep => dep.depends_on_task_id === task.id).map(dep => dep.task_id);
    const blockedByTasks = depsData.filter(dep => dep.task_id === task.id).map(dep => dep.depends_on_task_id);
    const meta = task.metadata as Record<string, any>;
    const isOraPlanCreation = task.type === 'ora_plan_creation' || meta?.action === 'create_ora_plan';
    const projectId = meta?.project_id;
    const planStatus = isOraPlanCreation && projectId ? oraPlanStatuses[projectId] : undefined;
    const resolvedCode = !meta?.project_code && projectId ? projectCodeMap[projectId] : undefined;
    const needsEnrichment = planStatus || resolvedCode;
    return {
      ...task,
      blocking_tasks: blockingTasks,
      blocked_by_tasks: blockedByTasks,
      metadata: needsEnrichment ? { ...meta, ...(planStatus && { plan_status: planStatus }), ...(resolvedCode && { project_code: resolvedCode }) } : task.metadata,
    };
  });

  return { tasks: enrichedTasks, dependencies: depsData, bundleTasks, oraActivityDates, oraPlanStatuses, p2aActivityProgress };
};

/**
 * Core P2A approval sync logic. Extracted so it can be called from both
 * single-task and bulk-task completion paths.
 */
async function syncP2AApproval(
  meta: any,
  taskType: string,
  status: 'completed' | 'cancelled',
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
) {
  if (meta?.source !== 'p2a_handover' || taskType !== 'approval' || !meta?.plan_id) return;

  const planId = meta.plan_id;
  const approverRole = meta.approver_role;

  if (status === 'completed') {
    // Update the approver record to APPROVED
    await supabase
      .from('p2a_handover_approvers')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
      })
      .eq('handover_id', planId)
      .eq('role_name', approverRole);

    // If Phase 1 approver, check if all Phase 1 are done → trigger Phase 2
    if (meta.approval_phase === 1 || meta.approval_phase === '1') {
      const { data: allApprovers } = await supabase
        .from('p2a_handover_approvers')
        .select('role_name, status')
        .eq('handover_id', planId);

      if (allApprovers) {
        const phase1 = allApprovers.filter((a: any) => a.role_name !== 'Deputy Plant Director');
        const allPhase1Approved = phase1.every((a: any) => a.status === 'APPROVED');

        if (allPhase1Approved) {
          const { createPhase2Tasks } = await import('./useP2AApprovalTasks');
          await createPhase2Tasks(planId, meta.project_id, meta.project_code);
        }
      }
    }

    // Check if ALL approvers (including Phase 2) are now approved → mark plan COMPLETED
    const { checkAndCompletePlan } = await import('./useP2AApprovalTasks');
    await checkAndCompletePlan(planId);

  } else if (status === 'cancelled') {
    // Rejection: full cascade
    console.log('[P2A] Rejection cascade starting for plan:', planId, 'by role:', approverRole);

    // 1. Mark this approver as REJECTED with comment
    const rejectionComment = meta.rejection_comment || 'Rejected by approver';
    await supabase
      .from('p2a_handover_approvers')
      .update({
        status: 'REJECTED',
        comments: rejectionComment,
        approved_at: new Date().toISOString(),
      })
      .eq('handover_id', planId)
      .eq('role_name', approverRole);

    // 1b. Move the rejecting reviewer's own task to "completed" with outcome: 'rejected'
    // This keeps the task visible in the Done column with a "Rejected" badge
    const { data: rejectingTask } = await supabase
      .from('user_tasks')
      .select('id, metadata')
      .eq('type', 'approval')
      .eq('status', 'cancelled') // it was just set to cancelled by the mutation caller
      .limit(200);

    const thisReviewerTask = (rejectingTask || []).find((t: any) => {
      const m = t.metadata as Record<string, any>;
      return m?.source === 'p2a_handover' && m?.plan_id === planId && m?.approver_role === approverRole;
    });

    if (thisReviewerTask) {
      const existingMeta = (thisReviewerTask.metadata as Record<string, any>) || {};
      await supabase
        .from('user_tasks')
        .update({
          status: 'completed',
          metadata: {
            ...existingMeta,
            outcome: 'rejected',
            rejection_comment: rejectionComment,
            rejected_at: new Date().toISOString(),
          } as any,
        })
        .eq('id', thisReviewerTask.id);
    }

    // 2. Cancel all other PENDING/WAITING approval tasks for this plan
    const { data: otherApprovalTasks } = await supabase
      .from('user_tasks')
      .select('id, metadata')
      .eq('type', 'approval')
      .neq('status', 'cancelled')
      .neq('status', 'completed');

    const otherP2aTasks = (otherApprovalTasks || []).filter((t: any) => {
      const m = t.metadata as Record<string, any>;
      return m?.source === 'p2a_handover' && m?.plan_id === planId;
    });

    for (const otherTask of otherP2aTasks) {
      await supabase
        .from('user_tasks')
        .update({ status: 'cancelled' })
        .eq('id', otherTask.id);
    }

    // 3. Reset all approvers (except the rejector) to PENDING
    // Use neq('status', 'REJECTED') to avoid overwriting the rejection we just set in step 1
    await supabase
      .from('p2a_handover_approvers')
      .update({ status: 'PENDING', approved_at: null, comments: null })
      .eq('handover_id', planId)
      .neq('status', 'REJECTED');

    // 4. Revert plan status to DRAFT
    await (supabase as any)
      .from('p2a_handover_plans')
      .update({ status: 'DRAFT', updated_at: new Date().toISOString() })
      .eq('id', planId);

    // 5. Reset the author's task progress to 86% and plan_status to DRAFT
    const { data: authorTasks } = await supabase
      .from('user_tasks')
      .select('id, metadata')
      .limit(200);

    const authorTask = (authorTasks || []).find((t: any) => {
      const m = t.metadata as Record<string, any>;
      return m?.action === 'create_p2a_plan' && m?.project_id === meta.project_id;
    });

    if (authorTask) {
      const authorMeta = (authorTask.metadata as Record<string, any>) || {};
      await supabase
        .from('user_tasks')
        .update({
          status: 'in_progress',
          metadata: {
            ...authorMeta,
            completion_percentage: 86,
            plan_status: 'DRAFT',
            last_rejection_comment: rejectionComment,
            last_rejection_role: approverRole,
            last_rejection_at: new Date().toISOString(),
          } as any,
        })
        .eq('id', authorTask.id);
    }

    // 6. Reset ORA activity to 86%
    try {
      const { data: plans } = await (supabase as any)
        .from('orp_plans')
        .select('id')
        .eq('project_id', meta.project_id)
        .limit(1);

      if (plans?.[0]) {
        const { data: activities } = await (supabase as any)
          .from('ora_plan_activities')
          .select('id, task_id, activity_code, name')
          .eq('orp_plan_id', plans[0].id);

        const p2aActivity = activities?.find((a: any) => a.activity_code === 'EXE-10' || a.activity_code === 'P2A-01')
          || activities?.find((a: any) => a.name?.toLowerCase().includes('p2a plan'))
          || activities?.find((a: any) => a.name?.toLowerCase().includes('p2a'));

        if (p2aActivity) {
          await (supabase as any)
            .from('ora_plan_activities')
            .update({
              completion_percentage: 86,
              status: 'IN_PROGRESS',
            })
            .eq('id', p2aActivity.id);
        }
      }
    } catch (e) {
      console.error('[P2A] Failed to reset ORA activity on rejection:', e);
    }

    console.log('[P2A] Rejection cascade completed for plan:', planId);
  }

  // Invalidate relevant queries so UI reflects changes
  queryClient.invalidateQueries({ queryKey: ['p2a-summary-approvers', planId] });
  queryClient.invalidateQueries({ queryKey: ['p2a-approval-workflow', planId] });
  queryClient.invalidateQueries({ queryKey: ['p2a-handover-approvers', planId] });
  queryClient.invalidateQueries({ queryKey: ['p2a-handover-plan'] });
  queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
  queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists'] });
  queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists-task'] });
}

/**
 * Core VCR template sync logic. Extracted for reuse.
 */
async function syncVCRTemplateApproval(
  meta: any,
  taskType: string,
  taskTitle: string,
  taskId: string,
  userId: string
) {
  const templateId = meta?.template_id;
  if (!templateId || taskType !== 'review' || !taskTitle?.includes('VCR Template')) return;

  // Update the vcr_template_approvers record for this user's role
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (userProfile?.role) {
    await supabase
      .from('vcr_template_approvers')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: userId,
      })
      .eq('template_id', templateId)
      .eq('role_id', userProfile.role);

    // Check if all approvers have now approved
    const { data: allApprovers } = await supabase
      .from('vcr_template_approvers')
      .select('approval_status')
      .eq('template_id', templateId);

    const allApproved = allApprovers?.every(a => a.approval_status === 'approved');
    if (allApproved) {
      await supabase
        .from('vcr_templates')
        .update({ status: 'approved' })
        .eq('id', templateId);
    }
  }

  // Complete sibling tasks for same template
  const { data: siblingTasks } = await supabase
    .from('user_tasks')
    .select('id, metadata')
    .neq('id', taskId)
    .eq('status', 'pending')
    .eq('type', 'review')
    .filter('metadata->>template_id', 'eq', templateId);

  if (siblingTasks?.length) {
    for (const sibling of siblingTasks) {
      const existingMeta = (sibling.metadata as Record<string, any>) || {};
      await supabase
        .from('user_tasks')
        .update({
          status: 'completed',
          metadata: { ...existingMeta, auto_completed: true, completed_by: userId },
        })
        .eq('id', sibling.id);
    }
  }
}

/**
 * Back-to-back sync: complete matching tasks for users sharing same functional_email_address
 */
async function syncBackToBack(
  meta: any,
  taskType: string,
  userId: string
) {
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('functional_email_address')
    .eq('user_id', userId)
    .single();

  const funcEmail = currentProfile?.functional_email_address;
  if (!funcEmail) return;

  const { data: backToBackUsers } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('functional_email_address', funcEmail)
    .neq('user_id', userId)
    .eq('is_active', true);

  if (!backToBackUsers?.length) return;

  const backToBackUserIds = backToBackUsers.map(u => u.user_id);
  const templateId = meta?.template_id;

  let query = supabase
    .from('user_tasks')
    .update({ status: 'completed' })
    .in('user_id', backToBackUserIds)
    .eq('type', taskType)
    .eq('status', 'pending');

  if (templateId) {
    query = query.filter('metadata->>template_id', 'eq', templateId);
  }

  await query;
}

/**
 * PSSR workflow sync: transitions PSSR status based on task approval/rejection.
 */
async function syncPSSRWorkflow(
  meta: any,
  taskType: string,
  status: 'completed' | 'cancelled',
  queryClient: ReturnType<typeof useQueryClient>
) {
  const pssrId = meta?.pssr_id;
  const source = meta?.source;
  const action = meta?.action;

  // Only handle pssr_workflow tasks
  if (!pssrId || (source !== 'pssr_workflow' && action !== 'review_draft_pssr')) return;
  if (taskType !== 'review') return;

  if (status === 'completed') {
    // Approve: transition PSSR to UNDER_REVIEW
    await supabase
      .from('pssrs')
      .update({ status: 'UNDER_REVIEW' })
      .eq('id', pssrId);

    // Initialize key activities if they don't exist yet
    const { data: pssrData } = await supabase
      .from('pssrs')
      .select('id, title, user_id')
      .eq('id', pssrId)
      .single();

    if (pssrData) {
      const DEFAULT_ACTIVITIES = [
        { activity_type: 'kickoff', label: 'PSSR Kick-off', display_order: 1 },
        { activity_type: 'walkdown', label: 'PSSR Walkdown', display_order: 2 },
        { activity_type: 'sof_meeting', label: 'SoF Meeting', display_order: 3 },
      ];

      const { data: existing } = await supabase
        .from('pssr_key_activities')
        .select('id')
        .eq('pssr_id', pssrId)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { data: inserted } = await supabase
          .from('pssr_key_activities')
          .insert(DEFAULT_ACTIVITIES.map(a => ({ pssr_id: pssrId, ...a })))
          .select('id, label, activity_type');

        // Create schedule tasks for the PSSR creator
        if (inserted && pssrData.user_id) {
          const scheduleTasks = inserted.map(act => ({
            user_id: pssrData.user_id,
            title: `Schedule ${act.label}`,
            description: `Schedule the ${act.label} for PSSR: ${pssrData.title}`,
            priority: 'High',
            type: 'action',
            status: 'pending',
            metadata: {
              pssr_id: pssrId,
              activity_id: act.id,
              activity_type: act.activity_type,
              module: 'pssr',
            },
          }));

          const { data: taskData } = await supabase
            .from('user_tasks')
            .insert(scheduleTasks)
            .select('id, metadata');

          if (taskData) {
            await Promise.all(taskData.map(t => {
              const m = t.metadata as Record<string, any>;
              return supabase
                .from('pssr_key_activities')
                .update({ task_id: t.id })
                .eq('id', m.activity_id);
            }));
          }
        }
      }
    }
  } else if (status === 'cancelled') {
    // Reject: revert PSSR to DRAFT
    await supabase
      .from('pssrs')
      .update({ status: 'DRAFT' })
      .eq('id', pssrId);
  }

  // Invalidate PSSR queries so UI reflects changes
  queryClient.invalidateQueries({ queryKey: ['pssrs'] });
  queryClient.invalidateQueries({ queryKey: ['pssr-detail', pssrId] });
}

/**
 * Full post-completion handler that runs all sync logic for a single task.
 */
async function runPostCompletionSync(
  taskId: string,
  status: 'completed' | 'cancelled',
  userId: string,
  queryClient: ReturnType<typeof useQueryClient>
) {
  const { data: completedTask } = await supabase
    .from('user_tasks')
    .select('type, metadata, title')
    .eq('id', taskId)
    .single();

  if (!completedTask) return;

  const meta = completedTask.metadata as any;

  // P2A Handover approval sync
  await syncP2AApproval(meta, completedTask.type, status, queryClient, userId);

  // PSSR workflow sync (review approve/reject)
  await syncPSSRWorkflow(meta, completedTask.type, status, queryClient);

  // VCR Template sync (only on approval/completion)
  if (status === 'completed') {
    await syncVCRTemplateApproval(meta, completedTask.type, completedTask.title, taskId, userId);
    await syncBackToBack(meta, completedTask.type, userId);
  }

  // ORA Plan sync (bidirectional task ↔ activity)
  if (meta?.ora_plan_activity_id) {
    try {
      const { syncORAActivityCompletion } = await import('./useORAActivityPlanSync');
      await syncORAActivityCompletion(taskId, status);
    } catch (e) {
      console.warn('ORA activity sync failed:', e);
    }
  }
}

export const useUserTasks = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const refreshTimerRef = useRef<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['user-tasks', user?.id],
    queryFn: () => fetchUserTasks(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  // Real-time subscription with debounced refresh
  useEffect(() => {
    if (!user?.id) return;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['user-tasks', user.id] });
      }, 800); // Debounce 800ms to let optimistic updates settle before refetching
    };

    const channel = supabase
      .channel('user-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tasks',
          filter: `user_id=eq.${user.id}`,
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_dependencies',
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'completed' | 'cancelled' }) => {
      const { error } = await supabase
        .from('user_tasks')
        .update({ status })
        .eq('id', taskId);
      if (error) throw error;

      if (user?.id) {
        try {
          await runPostCompletionSync(taskId, status, user.id, queryClient);
        } catch (e) {
          console.warn('Post-completion sync failed:', e);
        }
      }
    },
    onSuccess: (_, { status }) => {
      // Use specific key to avoid broad invalidation that causes blanking
      queryClient.invalidateQueries({ queryKey: ['user-tasks', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['completed-tasks'] });
      toast({ title: "Success", description: `Task ${status}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('user_tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedTasks: UserTask[]) => {
      const updates = reorderedTasks.map((task, index) =>
        supabase.from('user_tasks').update({ display_order: index }).eq('id', task.id)
      );
      await Promise.all(updates);
      return reorderedTasks;
    },
    onMutate: async (reorderedTasks) => {
      // Optimistic update
      queryClient.setQueryData(['user-tasks', user?.id], (old: any) => ({
        ...old,
        tasks: reorderedTasks.map((task, index) => ({ ...task, display_order: index })),
      }));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Error", description: "Failed to reorder tasks", variant: "destructive" });
    },
  });

  const addDependencyMutation = useMutation({
    mutationFn: async ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) => {
      const { error } = await supabase.from('task_dependencies').insert({
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Success", description: "Task dependency added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add task dependency", variant: "destructive" });
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: async ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('task_id', taskId)
        .eq('depends_on_task_id', dependsOnTaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Success", description: "Task dependency removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove dependency", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ taskIds, status }: { taskIds: string[]; status: 'completed' | 'cancelled' }) => {
      // Update all tasks
      const updates = taskIds.map(id => supabase.from('user_tasks').update({ status }).eq('id', id));
      await Promise.all(updates);

      // Run sync logic for each task (P2A approval, VCR template, back-to-back)
      if (user?.id) {
        for (const taskId of taskIds) {
          try {
            await runPostCompletionSync(taskId, status, user.id, queryClient);
          } catch (e) {
            console.warn(`Post-completion sync failed for task ${taskId}:`, e);
          }
        }
      }
    },
    onSuccess: (_, { taskIds, status }) => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['completed-tasks'] });
      toast({ title: "Success", description: `${taskIds.length} task(s) ${status}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tasks", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const deletes = taskIds.map(id => supabase.from('user_tasks').delete().eq('id', id));
      await Promise.all(deletes);
    },
    onSuccess: (_, taskIds) => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Success", description: `${taskIds.length} task(s) deleted` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tasks", variant: "destructive" });
    },
  });

  return {
    tasks: data?.tasks || [],
    dependencies: data?.dependencies || [],
    bundleTasks: data?.bundleTasks || [],
    oraActivityDates: data?.oraActivityDates || {},
    p2aActivityProgress: data?.p2aActivityProgress || {},
    loading: isLoading,
    updateTaskStatus: (taskId: string, status: 'completed' | 'cancelled') =>
      updateStatusMutation.mutate({ taskId, status }),
    deleteTask: (taskId: string) => deleteMutation.mutateAsync(taskId),
    reorderTasks: (reorderedTasks: UserTask[]) => reorderMutation.mutate(reorderedTasks),
    addDependency: (taskId: string, dependsOnTaskId: string) =>
      addDependencyMutation.mutate({ taskId, dependsOnTaskId }),
    removeDependency: (taskId: string, dependsOnTaskId: string) =>
      removeDependencyMutation.mutate({ taskId, dependsOnTaskId }),
    bulkUpdateStatus: (taskIds: string[], status: 'completed' | 'cancelled') =>
      bulkUpdateMutation.mutate({ taskIds, status }),
    bulkDelete: (taskIds: string[]) => bulkDeleteMutation.mutate(taskIds),
  };
};
