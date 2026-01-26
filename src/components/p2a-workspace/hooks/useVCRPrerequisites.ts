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
  evidence_links?: any[];
  comments?: string;
  display_order: number;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  category?: string;
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
      const { data, error } = await supabase
        .from('p2a_vcr_prerequisites')
        .select(`
          *,
          p2a_vcr_evidence (*)
        `)
        .eq('handover_point_id', handoverPointId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      return (data || []).map((prereq: any) => ({
        ...prereq,
        evidence: prereq.p2a_vcr_evidence || [],
      })) as VCRPrerequisite[];
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

// Status display configuration
export const getPrerequisiteStatusConfig = (status: VCRPrerequisite['status']) => {
  switch (status) {
    case 'ACCEPTED':
      return { label: 'Approved', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
    case 'READY_FOR_REVIEW':
      return { label: 'Under Review', color: 'bg-blue-500', textColor: 'text-blue-500' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', color: 'bg-amber-500', textColor: 'text-amber-500' };
    case 'REJECTED':
      return { label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-500' };
    case 'QUALIFICATION_REQUESTED':
      return { label: 'Qualification Raised', color: 'bg-purple-500', textColor: 'text-purple-500' };
    case 'QUALIFICATION_APPROVED':
      return { label: 'Qualified', color: 'bg-purple-600', textColor: 'text-purple-600' };
    case 'NOT_STARTED':
    default:
      return { label: 'Draft', color: 'bg-slate-400', textColor: 'text-slate-500' };
  }
};
