import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VCRQualification {
  id: string;
  vcr_prerequisite_id: string;
  reason: string;
  mitigation: string;
  follow_up_action?: string;
  target_date: string;
  action_owner_id?: string;
  action_owner_name?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewer_comments?: string;
  submitted_by?: string;
  reviewed_by?: string;
  submitted_at: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  prerequisite?: {
    id: string;
    summary: string;
    handover_point_id: string;
  };
  evidence?: QualificationEvidence[];
}

export interface QualificationEvidence {
  id: string;
  qualification_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  description?: string;
  uploaded_by?: string;
  created_at: string;
}

// Hook for qualifications within a specific VCR (handover point)
export const useVCRQualifications = (handoverPointId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: qualifications, isLoading } = useQuery({
    queryKey: ['vcr-qualifications', handoverPointId],
    queryFn: async () => {
      // Get all prerequisites for this VCR first
      const { data: prerequisites, error: prereqError } = await supabase
        .from('p2a_vcr_prerequisites')
        .select('id, summary')
        .eq('handover_point_id', handoverPointId);

      if (prereqError) throw prereqError;
      if (!prerequisites?.length) return [];

      const prereqIds = prerequisites.map(p => p.id);

      // Get all qualifications for these prerequisites
      const { data: quals, error } = await supabase
        .from('p2a_vcr_qualifications')
        .select('*')
        .in('vcr_prerequisite_id', prereqIds)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Map prerequisite info to each qualification
      const prereqMap = new Map(prerequisites.map(p => [p.id, p]));
      
      return (quals || []).map((qual: any) => ({
        ...qual,
        prerequisite: prereqMap.get(qual.vcr_prerequisite_id),
      })) as VCRQualification[];
    },
    enabled: !!handoverPointId,
  });

  const updateQualificationStatus = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      reviewer_comments 
    }: { 
      id: string; 
      status: VCRQualification['status']; 
      reviewer_comments?: string;
    }) => {
      const { data, error } = await supabase
        .from('p2a_vcr_qualifications')
        .update({ 
          status, 
          reviewer_comments,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-qualifications', handoverPointId] });
      toast({ title: 'Success', description: 'Qualification status updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    qualifications: qualifications || [],
    isLoading,
    updateQualificationStatus: updateQualificationStatus.mutate,
    isUpdating: updateQualificationStatus.isPending,
  };
};

// Hook for all qualifications across a project (for OWL page)
export const useProjectQualifications = (projectCode: string) => {
  const { data: qualifications, isLoading } = useQuery({
    queryKey: ['project-qualifications', projectCode],
    queryFn: async () => {
      // Get the handover plan for this project
      const { data: plan, error: planError } = await supabase
        .from('p2a_handover_plans')
        .select('id')
        .eq('project_code', projectCode)
        .maybeSingle();

      if (planError) throw planError;
      if (!plan) return [];

      // Get all handover points for this plan
      const { data: points, error: pointsError } = await supabase
        .from('p2a_handover_points')
        .select('id, name, vcr_code')
        .eq('handover_plan_id', plan.id);

      if (pointsError) throw pointsError;
      if (!points?.length) return [];

      const pointIds = points.map(p => p.id);

      // Get all prerequisites for these points
      const { data: prerequisites, error: prereqError } = await supabase
        .from('p2a_vcr_prerequisites')
        .select('id, summary, handover_point_id')
        .in('handover_point_id', pointIds);

      if (prereqError) throw prereqError;
      if (!prerequisites?.length) return [];

      const prereqIds = prerequisites.map(p => p.id);

      // Get all qualifications
      const { data: quals, error } = await supabase
        .from('p2a_vcr_qualifications')
        .select('*')
        .in('vcr_prerequisite_id', prereqIds)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Build lookup maps
      const prereqMap = new Map(prerequisites.map(p => [p.id, p]));
      const pointMap = new Map(points.map(p => [p.id, p]));

      return (quals || []).map((qual: any) => {
        const prereq = prereqMap.get(qual.vcr_prerequisite_id);
        const point = prereq ? pointMap.get(prereq.handover_point_id) : null;
        
        return {
          ...qual,
          prerequisite: prereq,
          handover_point: point,
        };
      });
    },
    enabled: !!projectCode,
  });

  return {
    qualifications: qualifications || [],
    isLoading,
  };
};

// Status display configuration
export const getQualificationStatusConfig = (status: VCRQualification['status']) => {
  switch (status) {
    case 'APPROVED':
      return { label: 'Approved', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
    case 'REJECTED':
      return { label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-500' };
    case 'PENDING':
    default:
      return { label: 'Under Review', color: 'bg-amber-500', textColor: 'text-amber-500' };
  }
};
