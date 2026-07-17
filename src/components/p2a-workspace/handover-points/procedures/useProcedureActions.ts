import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET = 'procedure-attachments';

export interface StagedProcedureFile {
  file: File;
  kind: 'markup' | 'draft' | 'reference';
  linked_approver_id?: string | null;
}

async function uploadOne(
  procedureId: string,
  userId: string,
  staged: StagedProcedureFile,
): Promise<string | null> {
  const safeName = staged.file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${procedureId}/${staged.kind}/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, staged.file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error: insErr } = await client
    .from('p2a_vcr_procedure_attachments')
    .insert({
      procedure_id: procedureId,
      kind: staged.kind,
      file_name: staged.file.name,
      file_url: pub?.publicUrl ?? path,
      file_size: staged.file.size,
      mime_type: staged.file.type,
      uploaded_by: userId,
      linked_approver_id: staged.linked_approver_id ?? null,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return data?.id ?? null;
}

export async function uploadProcedureMarkup(
  procedureId: string,
  userId: string,
  file: File,
  linkedApproverId: string,
): Promise<string | null> {
  return uploadOne(procedureId, userId, {
    file,
    kind: 'markup',
    linked_approver_id: linkedApproverId,
  });
}

export function useProcedureActions(procedureId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['procedure-lifecycle', procedureId] });
    qc.invalidateQueries({ queryKey: ['vcr-procedure-deliverables'] });
    qc.invalidateQueries({ queryKey: ['user-tasks'] });
  };

  return useMutation({
    mutationFn: async (args: {
      action: 'start_draft' | 'submit_review' | 'resubmit' | 'submit_decision';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload?: Record<string, any>;
    }) => {
      if (!procedureId) throw new Error('missing procedure id');
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error('not authenticated');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client.rpc('advance_procedure_status', {
        p_procedure_id: procedureId,
        p_action: args.action,
        p_payload: args.payload ?? {},
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
