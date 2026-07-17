import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Kind = 'material' | 'po' | 'attendance' | 'evidence' | 'markup' | 'draft';

const BUCKET_FOR_KIND: Record<Kind, string> = {
  material: 'training-materials',
  po: 'training-materials',
  attendance: 'training-materials',
  markup: 'training-materials',
  draft: 'training-materials',
  evidence: 'training-evidence',
};

export interface StagedFile {
  file: File;
  kind: Kind;
  description?: string;
}

async function uploadStagedFile(trainingId: string, userId: string, staged: StagedFile) {
  const bucket = BUCKET_FOR_KIND[staged.kind];
  const safeName = staged.file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${trainingId}/${staged.kind}/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, staged.file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) throw upErr;

  const client = supabase as any;
  const { error: insErr } = await client.from('p2a_vcr_training_attachments').insert({
    training_id: trainingId,
    kind: staged.kind,
    file_name: staged.file.name,
    file_path: path,
    file_size: staged.file.size,
    file_type: staged.file.type,
    description: staged.description ?? null,
    uploaded_by: userId,
  });
  if (insErr) throw insErr;
}

async function uploadAll(trainingId: string, userId: string, files: StagedFile[]) {
  for (const f of files) await uploadStagedFile(trainingId, userId, f);
}

export function useTrainingActions(trainingId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['training-lifecycle', trainingId] });
    qc.invalidateQueries({ queryKey: ['vcr-training-deliverables'] });
    qc.invalidateQueries({ queryKey: ['user-tasks'] });
  };

  return useMutation({
    mutationFn: async (args: {
      action:
        | 'request_po'
        | 'provide_po'
        | 'upload_materials'
        | 'provide_attendance'
        | 'schedule_training'
        | 'complete_training';
      payload?: Record<string, any>;
      files?: StagedFile[];
    }) => {
      if (!trainingId) throw new Error('missing training id');
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error('not authenticated');

      if (args.files && args.files.length > 0) {
        await uploadAll(trainingId, userId, args.files);
      }

      const client = supabase as any;
      const { data, error } = await client.rpc('advance_training_status', {
        p_training_id: trainingId,
        p_action: args.action,
        p_payload: args.payload ?? {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Action failed');
    },
  });
}
