import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * useQualificationDetail — approvers, activity thread, and mutations for a single
 * qualification. Powers the QualificationDrawer.
 *
 * Cascade & task completion are owned by the DB trigger
 * `trg_vcr_qualification_approvers_cascade` (advance-only).
 */

export interface QualApprover {
  id: string;
  qualification_id: string;
  user_id: string;
  role_label: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decision_comment: string | null;
  decided_at: string | null;
}

export interface QualComment {
  id: string;
  qualification_id: string;
  author_user_id: string | null;
  body: string;
  action_tag: string | null;
  created_at: string;
}

const c = () => supabase as any;

export const useQualificationDetail = (qualificationId: string | undefined) => {
  const qc = useQueryClient();

  const approvers = useQuery({
    queryKey: ['qual-approvers', qualificationId],
    enabled: !!qualificationId,
    queryFn: async (): Promise<QualApprover[]> => {
      const { data, error } = await c()
        .from('vcr_qualification_approvers')
        .select('*')
        .eq('qualification_id', qualificationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as QualApprover[];
    },
  });

  const comments = useQuery({
    queryKey: ['qual-comments', qualificationId],
    enabled: !!qualificationId,
    queryFn: async (): Promise<QualComment[]> => {
      const { data, error } = await c()
        .from('vcr_qualification_comments')
        .select('*')
        .eq('qualification_id', qualificationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as QualComment[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['qual-approvers', qualificationId] });
    qc.invalidateQueries({ queryKey: ['qual-comments', qualificationId] });
    qc.invalidateQueries({ queryKey: ['vcr-qualifications'] });
    qc.invalidateQueries({ queryKey: ['user-tasks'] });
  };

  const decide = useMutation({
    mutationFn: async (args: {
      approverId: string;
      status: 'APPROVED' | 'REJECTED';
      comment?: string;
      taskId?: string;
    }) => {
      const { data: auth } = await c().auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error('Not signed in');

      const { error } = await c()
        .from('vcr_qualification_approvers')
        .update({
          status: args.status,
          decision_comment: args.comment ?? null,
          decided_at: new Date().toISOString(),
        })
        .eq('id', args.approverId);
      if (error) throw error;

      // Comment thread entry for this approver's decision (trigger writes its own
      // for the final decision; this one records the individual approver step).
      if (args.status === 'APPROVED' || args.comment) {
        await c().from('vcr_qualification_comments').insert({
          qualification_id: qualificationId,
          author_user_id: uid,
          body: args.comment || (args.status === 'APPROVED' ? 'Approved.' : 'Rejected.'),
          action_tag: args.status === 'APPROVED' ? 'approved' : 'rejected',
        });
      }

      // Complete this approver's review task (dedupe key)
      if (args.taskId) {
        await c().from('user_tasks')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', args.taskId);
      } else if (qualificationId) {
        await c().from('user_tasks')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('type', 'qualification_review')
          .eq('user_id', uid)
          .eq('dedupe_key', `qual_review:${qualificationId}:${uid}`);
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Decision recorded');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to record decision'),
  });

  const addComment = useMutation({
    mutationFn: async (body: string) => {
      const { data: auth } = await c().auth.getUser();
      const uid = auth?.user?.id;
      const { error } = await c().from('vcr_qualification_comments').insert({
        qualification_id: qualificationId,
        author_user_id: uid,
        body,
        action_tag: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qual-comments', qualificationId] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to post comment'),
  });

  return {
    approvers: approvers.data || [],
    comments: comments.data || [],
    isLoading: approvers.isLoading || comments.isLoading,
    decide,
    addComment,
  };
};

/**
 * Raise / save-draft mutations for creating a new qualification.
 */
export const useRaiseQualification = () => {
  const qc = useQueryClient();

  const raise = useMutation({
    mutationFn: async (args: {
      vcr_prerequisite_id: string;
      handover_point_id: string;
      vcr_code?: string;
      vcr_name?: string;
      reason: string;
      mitigation: string;
      follow_up_action?: string;
      target_date: string;
      approver_user_ids: string[];
      approver_role_labels?: Record<string, string>;
      draft?: boolean;
    }) => {
      const { data: auth } = await c().auth.getUser();
      const uid = auth?.user?.id ?? null;

      // Integrity guard: prerequisite must exist AND belong to the same handover
      // point. Blocks the class of bug that produced cross-VCR / fake-item quals.
      if (!args.vcr_prerequisite_id) throw new Error('Missing prerequisite');
      const { data: prereqRow, error: prereqErr } = await c()
        .from('p2a_vcr_prerequisites')
        .select('id, handover_point_id')
        .eq('id', args.vcr_prerequisite_id)
        .maybeSingle();
      if (prereqErr) throw prereqErr;
      if (!prereqRow) throw new Error('Prerequisite not found');
      if (prereqRow.handover_point_id !== args.handover_point_id) {
        throw new Error('Prerequisite does not belong to this VCR');
      }

      const { data: qual, error: qErr } = await c()
        .from('p2a_vcr_qualifications')
        .insert({
          vcr_prerequisite_id: args.vcr_prerequisite_id,
          handover_point_id: args.handover_point_id,
          reason: args.reason,
          mitigation: args.mitigation,
          follow_up_action: args.follow_up_action || null,
          target_date: args.target_date,
          action_owner_id: uid,
          status: args.draft ? 'DRAFT' : 'PENDING',
          submitted_by: uid,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (qErr) throw qErr;


      if (args.draft) {
        // Draft = record only, no approvers/tasks
        return qual;
      }

      // Seed approvers
      const approverRows = args.approver_user_ids.map((u) => ({
        qualification_id: qual.id,
        user_id: u,
        role_label: args.approver_role_labels?.[u] || null,
        status: 'PENDING',
      }));
      if (approverRows.length) {
        const { error: aErr } = await c()
          .from('vcr_qualification_approvers')
          .insert(approverRows);
        if (aErr) throw aErr;
      }

      // Submitted comment
      await c().from('vcr_qualification_comments').insert({
        qualification_id: qual.id,
        author_user_id: uid,
        body: 'Qualification submitted for review.',
        action_tag: 'submitted',
      });

      // Fire prereq -> QUALIFICATION_REQUESTED (advance-only)
      await c().from('p2a_vcr_prerequisites')
        .update({ status: 'QUALIFICATION_REQUESTED' })
        .eq('id', args.vcr_prerequisite_id)
        .in('status', ['NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW']);

      // Create qualification_review tasks per approver (dedupe via dedupe_key)
      const qNum = qual.q_number ?? 0;
      const title = `Review Qualification Q-${String(qNum).padStart(3, '0')} for ${args.vcr_code || 'VCR'} (${args.vcr_name || ''})`;
      const taskRows = args.approver_user_ids.map((u) => ({
        user_id: u,
        title,
        description: args.reason,
        priority: 'High',
        type: 'qualification_review',
        status: 'pending',
        metadata: {
          action: 'review_qualification',
          qualification_id: qual.id,
          handover_point_id: args.handover_point_id,
          vcr_code: args.vcr_code,
          vcr_name: args.vcr_name,
          q_number: qNum,
        },
        dedupe_key: `qual_review:${qual.id}:${u}`,
      }));
      if (taskRows.length) {
        await c().from('user_tasks').insert(taskRows);
      }

      return qual;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vcr-qualifications'] });
      qc.invalidateQueries({ queryKey: ['user-tasks'] });
      toast.success('Qualification submitted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to raise qualification'),
  });

  return { raise };
};
