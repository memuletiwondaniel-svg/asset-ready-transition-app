import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VCRPrerequisite {
  id: string;
  handover_point_id: string;
  pac_prerequisite_id?: string;
  summary: string;
  description?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'QUALIFICATION_REQUESTED' | 'QUALIFICATION_APPROVED';
  delivering_party_id?: string;
  delivering_party_name?: string;
  receiving_party_id?: string;
  receiving_party_name?: string;
  // INT-1 Phase A: evidence_links denorm retired — p2a_vcr_evidence is the single source of truth.
  comments?: string;
  display_order: number;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  category?: string;
  topic?: string | null;
  /** Latest qualification stage for this prereq (null if none). Merged in
   *  by the hook so every consumer resolves the qualification sub-state
   *  (DRAFT/PENDING/REJECTED/APPROVED) from a single source of truth. */
  qualification_stage?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  // Joined data
  evidence?: VCREvidence[];
}

export interface VCREvidence {
  id: string;
  vcr_prerequisite_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  description?: string;
  uploaded_by?: string;
  created_at: string;
}

export const useVCRPrerequisites = (handoverPointId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prerequisites, isLoading } = useQuery({
    queryKey: ['vcr-prerequisites', handoverPointId],
    queryFn: async () => {
      // Category lives on the catalog row (vcr_items.category_id → vcr_item_categories.code),
      // NOT on p2a_vcr_prerequisites — the table has no `category` column. We resolve it via
      // a nested select so the Overview per-category donuts and the Items tab codes agree.
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_prerequisites')
        .select(`
          *,
          p2a_vcr_evidence (*),
          vcr_items:vcr_item_id (
            display_order,
            topic,
            category:category_id ( code )
          )
        `)
        .eq('handover_point_id', handoverPointId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map((prereq: any) => ({
        ...prereq,
        evidence: prereq.p2a_vcr_evidence || [],
        category: prereq.vcr_items?.category?.code ?? null,
        topic: prereq.vcr_items?.topic ?? null,
        // Prefer the canonical catalog display_order (e.g. OI-19) over the
        // per-prereq row order (which can be a concatenated value like 219).
        display_order: prereq.vcr_items?.display_order ?? prereq.display_order,
      })) as VCRPrerequisite[];

      // Merge latest qualification stage per prereq — one source of truth for
      // the qualification sub-state used by every UI touchpoint.
      const prereqIds = mapped.map(p => p.id);
      if (prereqIds.length) {
        const { data: quals } = await (supabase as any)
          .from('p2a_vcr_qualifications')
          .select('vcr_prerequisite_id,status,submitted_at')
          .in('vcr_prerequisite_id', prereqIds)
          .order('submitted_at', { ascending: false });
        const stageByPrereq = new Map<string, VCRPrerequisite['qualification_stage']>();
        // WITHDRAWN rows are audit-only — skip so the effective stage falls
        // back to the parent item's terminal status (no stray Q · Pending /
        // Q · Rework overlays after items-are-truth supersedes a qual row).
        for (const q of (quals || []) as any[]) {
          if (q.status === 'WITHDRAWN') continue;
          if (q.vcr_prerequisite_id && !stageByPrereq.has(q.vcr_prerequisite_id)) {
            stageByPrereq.set(q.vcr_prerequisite_id, q.status);
          }
        }
        for (const p of mapped) p.qualification_stage = stageByPrereq.get(p.id) ?? null;
      }

      // TEMP diag: prove per-category resolution end-to-end for VCR-02 rollup parity.
      if (typeof window !== 'undefined') {
        const catCounts: Record<string, number> = {};
        for (const r of mapped) {
          const k = r.category || 'NULL';
          catCounts[k] = (catCounts[k] || 0) + 1;
        }
        // eslint-disable-next-line no-console
        console.log('[useVCRPrerequisites diag]', {
          handoverPointId,
          total: mapped.length,
          byCategory: catCounts,
        });
      }

      return mapped;
    },
    enabled: !!handoverPointId,
  });


  const updatePrerequisiteStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VCRPrerequisite['status'] }) => {
      const updateData: any = { status };
      
      if (status === 'READY_FOR_REVIEW') {
        updateData.submitted_at = new Date().toISOString();
      } else if (status === 'ACCEPTED' || status === 'REJECTED') {
        updateData.reviewed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('p2a_vcr_prerequisites')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-prerequisites', handoverPointId] });
      toast({ title: 'Success', description: 'Status updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Calculate progress by category
  const getProgressByCategory = () => {
    if (!prerequisites?.length) {
      return {
        overall: 0,
        checklist: 0,
        training: 0,
        documentation: 0,
        procedures: 0,
        cmms: 0,
      };
    }

    const completedStatuses = ['ACCEPTED', 'QUALIFICATION_APPROVED'];
    
    const calculateCategoryProgress = (category?: string) => {
      const items = category 
        ? prerequisites.filter(p => p.category?.toLowerCase() === category.toLowerCase())
        : prerequisites;
      
      if (!items.length) return 0;
      const completed = items.filter(p => completedStatuses.includes(p.status)).length;
      return Math.round((completed / items.length) * 100);
    };

    return {
      overall: calculateCategoryProgress(),
      checklist: calculateCategoryProgress(),
      training: calculateCategoryProgress('training'),
      documentation: calculateCategoryProgress('documentation'),
      procedures: calculateCategoryProgress('procedures'),
      cmms: calculateCategoryProgress('cmms'),
    };
  };

  return {
    prerequisites: prerequisites || [],
    isLoading,
    progress: getProgressByCategory(),
    updatePrerequisiteStatus: updatePrerequisiteStatus.mutate,
    isUpdating: updatePrerequisiteStatus.isPending,
  };
};

// Legacy status display config — kept for VCRChecklistTab + PrerequisiteDetailSheet.
// Labels aligned to the canonical set (see standardStatus.ts): Draft/Under review/
// Rework/Approved/Not started, with Q · prefix for the qualification sub-states.
export const getPrerequisiteStatusConfig = (status: VCRPrerequisite['status']) => {
  switch (status) {
    case 'ACCEPTED':
      return { label: 'Approved', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
    case 'READY_FOR_REVIEW':
      return { label: 'Under review', color: 'bg-amber-500', textColor: 'text-amber-500' };
    case 'IN_PROGRESS':
      return { label: 'Draft', color: 'bg-slate-400', textColor: 'text-slate-500' };
    case 'REJECTED':
      return { label: 'Rework', color: 'bg-red-500', textColor: 'text-red-500' };
    case 'QUALIFICATION_REQUESTED':
      return { label: 'Q · Under review', color: 'bg-amber-500', textColor: 'text-amber-500' };
    case 'QUALIFICATION_APPROVED':
      return { label: 'Q · Approved', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
    case 'NOT_STARTED':
    default:
      return { label: 'Not started', color: 'bg-slate-400', textColor: 'text-slate-500' };
  }
};
