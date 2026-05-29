import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectDraftPayload {
  formData: any;
  scopeDescription: string;
  scopeAttachments: any[];
  teamMembers: any[];
  milestones: any[];
  documents: any[];
  currentStep: number;
}

export function useProjectDraft() {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectDraftPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from('project_drafts')
      .select('id, draft_data')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setDraftId(data.id);
      setDraft(data.draft_data as ProjectDraftPayload);
    } else {
      setDraftId(null);
      setDraft(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (payload: ProjectDraftPayload) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (draftId) {
        const { error } = await (supabase as any)
          .from('project_drafts')
          .update({ draft_data: payload })
          .eq('id', draftId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('project_drafts')
          .insert({ user_id: user.id, draft_data: payload })
          .select('id')
          .single();
        if (error) throw error;
        setDraftId(data.id);
      }
      toast.success('Draft saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }, [draftId]);

  const clear = useCallback(async () => {
    if (!draftId) return;
    await (supabase as any).from('project_drafts').delete().eq('id', draftId);
    setDraftId(null);
    setDraft(null);
  }, [draftId]);

  return { draftId, draft, loading, saving, save, clear, reload: load };
}
