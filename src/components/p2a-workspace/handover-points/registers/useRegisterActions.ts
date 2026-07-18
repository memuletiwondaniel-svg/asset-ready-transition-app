import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET = 'register-attachments';

export interface StagedRegisterFile {
  file: File;
  kind: 'draft' | 'completed' | 'reference';
}

export async function uploadRegisterAttachment(
  registerId: string,
  userId: string,
  staged: StagedRegisterFile,
): Promise<string | null> {
  const safeName = staged.file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${registerId}/${staged.kind}/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, staged.file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) throw upErr;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error: insErr } = await client
    .from('p2a_vcr_register_attachments')
    .insert({
      register_id: registerId,
      attachment_kind: staged.kind,
      file_name: staged.file.name,
      file_path: path,
      file_size: staged.file.size,
      content_type: staged.file.type,
      uploaded_by: userId,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return data?.id ?? null;
}

export function useRegisterActions(registerId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['register-lifecycle', registerId] });
    qc.invalidateQueries({ queryKey: ['vcr-register-deliverables'] });
    qc.invalidateQueries({ queryKey: ['register-ownership', registerId] });
    qc.invalidateQueries({ queryKey: ['user-tasks'] });
  };

  return useMutation({
    mutationFn: async (args: {
      action: 'start_draft' | 'submit_for_review' | 'resubmit' | 'approve' | 'reject';
      comment?: string | null;
      reviewerIds?: string[] | null;
    }) => {
      if (!registerId) throw new Error('missing register id');
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error('not authenticated');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client.rpc('advance_register_status', {
        p_register_id: registerId,
        p_action: args.action,
        p_comment: args.comment ?? null,
        p_reviewer_ids: args.reviewerIds ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.message || 'Action failed');
    },
  });
}
