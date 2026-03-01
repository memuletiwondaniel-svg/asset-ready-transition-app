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
 * Helper to create a leaf-level task and link it back to the activity.
 */
async function createLeafTask(
  client: any,
  oraEngineerId: string,
  activityId: string,
  title: string,
  description: string,
  metadata: Record<string, any>
) {
  const { data: taskData } = await client
    .from('user_tasks')
    .insert({
      user_id: oraEngineerId,
      title,
      description,
      type: 'ora_activity',
      priority: 'Medium',
      status: 'pending',
      metadata: {
        ...metadata,
        ora_plan_activity_id: activityId,
      },
    })
    .select('id')
    .single();

  if (taskData) {
    await client
      .from('ora_plan_activities')
      .update({ task_id: taskData.id })
      .eq('id', activityId);
  }
}

// ─── Phase 1: P2A Approval → VCR Activities ─────────────────────

export async function generateVCRActivitiesFromP2A(
  planId: string,
  projectId: string,
  projectCode: string
) {
  const client = supabase as any;

  const orpPlanId = await findOrpPlan(projectId);
  if (!orpPlanId) {
    console.warn('[ORA Sync] No active ORP plan found for project', projectId);
    return;
  }

  // Duplicate prevention
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

  const { data: vcrs, error: vcrError } = await client
    .from('p2a_handover_points')
    .select('id, vcr_code, name, description')
    .eq('handover_plan_id', planId)
    .order('vcr_code');

  if (vcrError || !vcrs?.length) {
    console.warn('[ORA Sync] No VCRs found for plan', planId);
    return;
  }

  const oraEngineerId = await findSnrORAEngineer(projectId);

  for (const vcr of vcrs) {
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

    if (subError || !subActivity) continue;

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

      if (taskData) {
        await client
          .from('ora_plan_activities')
          .update({ task_id: taskData.id })
          .eq('id', subActivity.id);
      }
    }
  }

  // Mark P2A Handover deliverable as COMPLETED
  await client
    .from('orp_plan_deliverables')
    .update({ status: 'COMPLETED', completion_percentage: 100 })
    .eq('orp_plan_id', orpPlanId)
    .ilike('name', '%P2A%Handover%');

  console.log(`[ORA Sync] Generated ${vcrs.length} VCR activities for plan ${planId}`);
}

// ─── Phase 3: VCR Delivery Plan Approval → Building Block Activities ──

/**
 * Called when a VCR execution plan is approved.
 * Generates building block sub-activities from VCR data.
 */
export async function generateBuildingBlockActivities(
  vcrId: string,
  projectId: string,
  projectCode: string
) {
  const client = supabase as any;

  const orpPlanId = await findOrpPlan(projectId);
  if (!orpPlanId) return;

  // Find the VCR parent activity
  const { data: vcrActivity } = await client
    .from('ora_plan_activities')
    .select('id, activity_code')
    .eq('orp_plan_id', orpPlanId)
    .eq('source_type', 'p2a_vcr')
    .eq('source_ref_id', vcrId)
    .single();

  if (!vcrActivity) {
    console.warn('[ORA Sync] VCR activity not found for', vcrId);
    return;
  }

  // Mark VCR Delivery Plan sub-activity as COMPLETED
  await client
    .from('ora_plan_activities')
    .update({ status: 'COMPLETED', completion_percentage: 100 })
    .eq('parent_id', vcrActivity.id)
    .eq('source_type', 'vcr_delivery_plan');

  // Complete the associated task
  await client
    .from('user_tasks')
    .update({ status: 'completed' })
    .eq('type', 'vcr_delivery_plan')
    .filter('metadata->>vcr_id', 'eq', vcrId)
    .eq('status', 'pending');

  // Duplicate prevention: check if building blocks already exist
  const { data: existingBlocks } = await client
    .from('ora_plan_activities')
    .select('id')
    .eq('parent_id', vcrActivity.id)
    .eq('source_type', 'vcr_building_block')
    .limit(1);

  if (existingBlocks?.length > 0) {
    console.log('[ORA Sync] Building blocks already exist, skipping');
    return;
  }

  const oraEngineerId = await findSnrORAEngineer(projectId);
  const baseCode = vcrActivity.activity_code;
  let subIdx = 2; // .01 is VCR Delivery Plan

  const baseMeta = { project_id: projectId, project_code: projectCode, vcr_id: vcrId };

  // Helper to create a building block and its children
  async function createBuildingBlock(
    name: string,
    items: Array<{ id: string; title: string; refTable: string }>,
    sourceTable: string
  ) {
    const blockCode = `${baseCode}.${String(subIdx++).padStart(2, '0')}`;
    const { data: block } = await client
      .from('ora_plan_activities')
      .insert({
        orp_plan_id: orpPlanId,
        parent_id: vcrActivity.id,
        activity_code: blockCode,
        name,
        source_type: 'vcr_building_block',
        source_ref_id: vcrId,
        source_ref_table: sourceTable,
        status: 'NOT_STARTED',
        assigned_to: oraEngineerId,
      })
      .select('id')
      .single();

    if (!block) return;

    // Create sub-sub-activities for each item (leaf level → tasks)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemCode = `${blockCode}.${String(i + 1).padStart(2, '0')}`;
      const { data: leaf } = await client
        .from('ora_plan_activities')
        .insert({
          orp_plan_id: orpPlanId,
          parent_id: block.id,
          activity_code: itemCode,
          name: item.title,
          source_type: 'vcr_building_block',
          source_ref_id: item.id,
          source_ref_table: item.refTable,
          status: 'NOT_STARTED',
          assigned_to: oraEngineerId,
        })
        .select('id')
        .single();

      if (leaf && oraEngineerId) {
        await createLeafTask(client, oraEngineerId, leaf.id,
          `${name} – ${item.title}`,
          `Complete ${item.title} for ${name}`,
          { ...baseMeta, action: 'complete_building_block' }
        );
      }
    }
  }

  // ── Fetch all VCR building block data in parallel ──
  const [
    trainingRes,
    proceduresRes,
    criticalDocsRes,
    deliverablesRes,
    registersRes,
    logsheetsRes,
    systemsRes,
  ] = await Promise.all([
    client.from('p2a_vcr_training').select('id, title').eq('handover_point_id', vcrId).order('display_order'),
    client.from('p2a_vcr_procedures').select('id, title').eq('handover_point_id', vcrId).order('display_order'),
    client.from('p2a_vcr_critical_docs').select('id, title').eq('handover_point_id', vcrId).order('display_order'),
    client.from('p2a_vcr_deliverables').select('id, title, tier').eq('handover_point_id', vcrId).order('display_order'),
    client.from('p2a_vcr_operational_registers').select('id, title').eq('handover_point_id', vcrId).order('display_order'),
    client.from('p2a_vcr_logsheets').select('id, title').eq('handover_point_id', vcrId).order('display_order'),
    client.from('p2a_handover_point_systems').select('id, system_id').eq('handover_point_id', vcrId),
  ]);

  // Training
  if (trainingRes.data?.length) {
    await createBuildingBlock('Training', 
      trainingRes.data.map((t: any) => ({ id: t.id, title: t.title, refTable: 'p2a_vcr_training' })),
      'p2a_vcr_training'
    );
  }

  // Procedures
  if (proceduresRes.data?.length) {
    await createBuildingBlock('Procedures',
      proceduresRes.data.map((p: any) => ({ id: p.id, title: p.title, refTable: 'p2a_vcr_procedures' })),
      'p2a_vcr_procedures'
    );
  }

  // Critical Documents
  if (criticalDocsRes.data?.length) {
    await createBuildingBlock('Critical Documents',
      criticalDocsRes.data.map((d: any) => ({ id: d.id, title: d.title || d.doc_code || 'Document', refTable: 'p2a_vcr_critical_docs' })),
      'p2a_vcr_critical_docs'
    );
  }

  // CMMS & 2Y Spares (from deliverables, split by tier)
  const cmmsItems = (deliverablesRes.data || []).filter((d: any) => d.tier === 'CMMS');
  const sparesItems = (deliverablesRes.data || []).filter((d: any) => d.tier === '2Y_SPARES' || d.tier === '2Y Spares');
  const otherDeliverables = (deliverablesRes.data || []).filter((d: any) => d.tier !== 'CMMS' && d.tier !== '2Y_SPARES' && d.tier !== '2Y Spares');

  if (cmmsItems.length) {
    await createBuildingBlock('CMMS',
      cmmsItems.map((d: any) => ({ id: d.id, title: d.title, refTable: 'p2a_vcr_deliverables' })),
      'p2a_vcr_deliverables'
    );
  }

  if (sparesItems.length) {
    await createBuildingBlock('2Y Spares',
      sparesItems.map((d: any) => ({ id: d.id, title: d.title, refTable: 'p2a_vcr_deliverables' })),
      'p2a_vcr_deliverables'
    );
  }

  if (otherDeliverables.length) {
    await createBuildingBlock('Other Deliverables',
      otherDeliverables.map((d: any) => ({ id: d.id, title: d.title, refTable: 'p2a_vcr_deliverables' })),
      'p2a_vcr_deliverables'
    );
  }

  // Operational Registers
  if (registersRes.data?.length) {
    await createBuildingBlock('Operational Registers',
      registersRes.data.map((r: any) => ({ id: r.id, title: r.title, refTable: 'p2a_vcr_operational_registers' })),
      'p2a_vcr_operational_registers'
    );
  }

  // Logsheets
  if (logsheetsRes.data?.length) {
    await createBuildingBlock('Logsheets',
      logsheetsRes.data.map((l: any) => ({ id: l.id, title: l.title, refTable: 'p2a_vcr_logsheets' })),
      'p2a_vcr_logsheets'
    );
  }

  // Systems → sub-sub activities with ITP sub-sub-sub activities
  if (systemsRes.data?.length) {
    const systemBlockCode = `${baseCode}.${String(subIdx++).padStart(2, '0')}`;
    const { data: systemBlock } = await client
      .from('ora_plan_activities')
      .insert({
        orp_plan_id: orpPlanId,
        parent_id: vcrActivity.id,
        activity_code: systemBlockCode,
        name: 'Systems',
        source_type: 'vcr_building_block',
        source_ref_id: vcrId,
        source_ref_table: 'p2a_handover_point_systems',
        status: 'NOT_STARTED',
        assigned_to: oraEngineerId,
      })
      .select('id')
      .single();

    if (systemBlock) {
      // Fetch system names
      const systemIds = systemsRes.data.map((s: any) => s.system_id);
      const { data: systemDetails } = await client
        .from('p2a_systems')
        .select('id, system_id, name')
        .in('id', systemIds);

      const systemNameMap = new Map((systemDetails || []).map((s: any) => [s.id, s as { id: string; system_id: string; name: string }]));

      for (let si = 0; si < systemsRes.data.length; si++) {
        const sys = systemsRes.data[si] as any;
        const sysInfo: any = systemNameMap.get(sys.system_id);
        const sysName = sysInfo?.name || `System ${si + 1}`;
        const sysCode = `${systemBlockCode}.${String(si + 1).padStart(2, '0')}`;

        const { data: sysActivity } = await client
          .from('ora_plan_activities')
          .insert({
            orp_plan_id: orpPlanId,
            parent_id: systemBlock.id,
            activity_code: sysCode,
            name: sysName,
            source_type: 'vcr_building_block',
            source_ref_id: sys.system_id,
            source_ref_table: 'p2a_systems',
            status: 'NOT_STARTED',
            assigned_to: oraEngineerId,
          })
          .select('id')
          .single();

        if (!sysActivity) continue;

        // Fetch ITP activities for this system + VCR
        const { data: itpActivities } = await client
          .from('p2a_itp_activities')
          .select('id, activity_name')
          .eq('handover_point_id', vcrId)
          .eq('system_id', sys.system_id)
          .order('display_order');

        if (itpActivities?.length) {
          for (let ai = 0; ai < itpActivities.length; ai++) {
            const itp = itpActivities[ai];
            const itpCode = `${sysCode}.${String(ai + 1).padStart(2, '0')}`;
            const { data: itpLeaf } = await client
              .from('ora_plan_activities')
              .insert({
                orp_plan_id: orpPlanId,
                parent_id: sysActivity.id,
                activity_code: itpCode,
                name: itp.activity_name,
                source_type: 'itp',
                source_ref_id: itp.id,
                source_ref_table: 'p2a_itp_activities',
                status: 'NOT_STARTED',
                assigned_to: oraEngineerId,
              })
              .select('id')
              .single();

            if (itpLeaf && oraEngineerId) {
              await createLeafTask(client, oraEngineerId, itpLeaf.id,
                `${itp.activity_name} – ${sysName}`,
                `Complete ${itp.activity_name} for system ${sysName}`,
                { ...baseMeta, action: 'complete_itp_activity', system_name: sysName }
              );
            }
          }
        } else if (oraEngineerId) {
          // No ITP activities; the system itself is a leaf
          await createLeafTask(client, oraEngineerId, sysActivity.id,
            `Complete ${sysName}`,
            `Complete system handover for ${sysName}`,
            { ...baseMeta, action: 'complete_system' }
          );
        }
      }
    }
  }

  // Complete VCR Checklists sub-activity
  const checklistCode = `${baseCode}.${String(subIdx++).padStart(2, '0')}`;
  const { data: checklistBlock } = await client
    .from('ora_plan_activities')
    .insert({
      orp_plan_id: orpPlanId,
      parent_id: vcrActivity.id,
      activity_code: checklistCode,
      name: 'Complete VCR Checklists',
      source_type: 'vcr_building_block',
      source_ref_id: vcrId,
      source_ref_table: 'p2a_handover_points',
      status: 'NOT_STARTED',
      assigned_to: oraEngineerId,
    })
    .select('id')
    .single();

  if (checklistBlock && oraEngineerId) {
    await createLeafTask(client, oraEngineerId, checklistBlock.id,
      'Complete VCR Checklists',
      'Review and complete all VCR checklist items',
      { ...baseMeta, action: 'complete_vcr_checklists' }
    );
  }

  // ── Assign delivering party tasks for VCR checklist items ──
  await generateDeliveringPartyTasks(vcrId, projectId, projectCode);

  console.log(`[ORA Sync] Generated building block activities for VCR ${vcrId}`);
}

// ─── Delivering Party Task Assignment ────────────────────────────

/**
 * Creates tasks for each delivering party user based on their assigned VCR checklist items.
 * Resolves role IDs to actual users via project team membership and profile roles.
 */
async function generateDeliveringPartyTasks(
  vcrId: string,
  projectId: string,
  projectCode: string
) {
  const client = supabase as any;

  // Duplicate prevention — check for consolidated bundle tasks
  const { data: existingTasks } = await client
    .from('user_tasks')
    .select('id')
    .eq('type', 'vcr_checklist_bundle')
    .filter('metadata->>vcr_id', 'eq', vcrId)
    .filter('metadata->>source', 'eq', 'vcr_execution_plan_approval')
    .limit(1);

  if (existingTasks?.length > 0) {
    console.log('[ORA Sync] Delivering party bundle tasks already exist for VCR', vcrId);
    return;
  }

  // Fetch all prerequisites for this VCR
  const { data: prereqs } = await client
    .from('p2a_vcr_prerequisites')
    .select('id, summary, delivering_party_id, delivering_party_name, status')
    .eq('handover_point_id', vcrId);

  if (!prereqs?.length) return;

  // Filter to items that have a delivering party and are not already closed
  const closedStatuses = ['ACCEPTED', 'QUALIFICATION_APPROVED', 'NA'];
  const actionablePrereqs = prereqs.filter(
    (p: any) => p.delivering_party_id && !closedStatuses.includes(p.status)
  );

  if (!actionablePrereqs.length) return;

  // Collect unique delivering party role IDs
  const roleIds = [...new Set(actionablePrereqs.map((p: any) => p.delivering_party_id))];

  // Resolve role IDs to users: first try project team members, then fallback to profiles
  const { data: teamMembers } = await client
    .from('project_team_members')
    .select('user_id')
    .eq('project_id', projectId);

  const teamUserIds = (teamMembers || []).map((m: any) => m.user_id);

  let profilesByRole: any[] = [];
  if (teamUserIds.length) {
    const { data: profiles } = await client
      .from('profiles')
      .select('user_id, full_name, role, position')
      .in('user_id', teamUserIds)
      .in('role', roleIds)
      .eq('is_active', true);
    profilesByRole = (profiles || []).filter((p: any) => {
      const pos = (p.position || '').toLowerCase();
      return !pos.includes('asset');
    });
  }

  // Fallback for uncovered roles
  const coveredRoleIds = new Set(profilesByRole.map((p: any) => p.role));
  const uncoveredRoleIds = roleIds.filter((rid: string) => !coveredRoleIds.has(rid));
  if (uncoveredRoleIds.length) {
    const { data: fallbackProfiles } = await client
      .from('profiles')
      .select('user_id, full_name, role, position')
      .in('role', uncoveredRoleIds)
      .eq('is_active', true);
    if (fallbackProfiles) {
      const filtered = fallbackProfiles.filter((p: any) => {
        const pos = (p.position || '').toLowerCase();
        return !pos.includes('asset');
      });
      profilesByRole.push(...filtered);
    }
  }

  // Build role → user map (first match wins)
  const roleUserMap = new Map<string, string>();
  for (const p of profilesByRole) {
    if (p.role && !roleUserMap.has(p.role)) {
      roleUserMap.set(p.role, p.user_id);
    }
  }

  // Fetch VCR name for task descriptions
  const { data: vcrData } = await client
    .from('p2a_handover_points')
    .select('vcr_code, name')
    .eq('id', vcrId)
    .maybeSingle();

  const vcrLabel = vcrData ? `${vcrData.vcr_code}: ${vcrData.name}` : 'VCR';

  // Group prerequisites by user (consolidated bundle approach)
  const tasksByUser = new Map<string, { prereqs: any[]; deliveringPartyId: string }>();
  for (const prereq of actionablePrereqs) {
    const userId = roleUserMap.get(prereq.delivering_party_id);
    if (!userId) continue;
    if (!tasksByUser.has(userId)) {
      tasksByUser.set(userId, { prereqs: [], deliveringPartyId: prereq.delivering_party_id });
    }
    tasksByUser.get(userId)!.prereqs.push(prereq);
  }

  // Create ONE consolidated bundle task per user
  for (const [userId, { prereqs: userPrereqs, deliveringPartyId }] of tasksByUser) {
    const subItems = userPrereqs.map((p: any) => ({
      prerequisite_id: p.id,
      summary: p.summary,
      completed: false,
    }));

    await client
      .from('user_tasks')
      .insert({
        user_id: userId,
        title: `VCR Checklist Items – ${vcrLabel}`,
        description: `Complete ${userPrereqs.length} checklist item(s) for ${vcrLabel}. Submit supporting evidence and mark each item as ready for review.`,
        type: 'vcr_checklist_bundle',
        priority: 'Medium',
        status: 'pending',
        progress_percentage: 0,
        sub_items: subItems,
        metadata: {
          project_id: projectId,
          project_code: projectCode,
          vcr_id: vcrId,
          vcr_label: vcrLabel,
          delivering_party_id: deliveringPartyId,
          total_items: userPrereqs.length,
          completed_items: 0,
          action: 'complete_vcr_checklist_bundle',
          source: 'vcr_execution_plan_approval',
        },
      });
  }

  console.log(`[ORA Sync] Created ${tasksByUser.size} consolidated bundle tasks for VCR ${vcrId}`);
}

// ─── Bidirectional Sync ──────────────────────────────────────────

/**
 * Syncs a completed user_task back to its linked ora_plan_activity.
 */
export async function syncORAActivityCompletion(taskId: string, status: 'completed' | 'cancelled') {
  const client = supabase as any;

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
      .update({ status: 'COMPLETED', completion_percentage: 100 })
      .eq('id', activityId);
  }
  // DB trigger handles parent rollup automatically
}
