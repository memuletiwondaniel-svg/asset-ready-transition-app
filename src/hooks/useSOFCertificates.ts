import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SOFCertificate {
  id: string;
  pssr_id: string;
  certificate_number: string;
  pssr_reason: string;
  plant_name: string | null;
  facility_name: string | null;
  project_name: string | null;
  certificate_text: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'ISSUED';
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SOFApprover {
  id: string;
  sof_certificate_id: string;
  pssr_id: string;
  approver_name: string;
  approver_role: string;
  approver_level: number;
  status: 'LOCKED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  comments: string | null;
  approved_at: string | null;
  signature_data: string | null;
  user_id: string | null;
  created_at: string;
}

// Certificate text templates
const PROCESS_SAFETY_INCIDENT_TEXT = `a. The cause(s) of the incident are understood through the incident investigation process.
b. Corrective actions required for restart are completed and address the incident causes. This could include any or all of repairs, alterations or modifications, required monitoring, temporary equipment, mitigations.
c. The Exceedance Monitoring report has been reviewed to verify no integrity limits (pressure, temperature) have been exceeded for the event leading to the incident.
d. A review has been conducted to assess implications for similar equipment or barriers on the asset
e. The Hazards and Effects Register has been reviewed and updated, as necessary, as it applies to this incident
f. An Incident report is available, and other data and documentation are attached.
g. All requirements specified in AI-PSM Application Manual Item 7.1 have been met where applicable (exceptions are noted at the end of the concurrence form):
h. A Pre-Start-Up Safety Review (PSSR) has been completed and all priority 1 actions have been completed`;

const STANDARD_SOF_TEXT = `01. Process safety risks have been identified and documented and are either managed to ALARP or appropriately being managed to ALARP through application of HEMP.
02. Employees or contractors executing Safety Critical Activities are competent and fit to work.
03. Safety Critical Equipment (SCE) meets its Technical Integrity requirements.
04. Design and construction of Asset modifications meet the design and engineering requirements
05. The Process Safety Basic Requirements (PSBR) are met.
06. Procedures are in place to operate Safety Critical Equipment (SCE) within its Operational Limits.
07. Modifications, if made, are complete and have been authorized as specified by the Management of Change (MoC) Manual.
08. A Pre-Start-Up Safety Review (PSSR) has been completed and all priority 1 actions have been completed`;

export const getCertificateText = (pssrReason: string): string => {
  const normalizedReason = pssrReason.toLowerCase();
  if (normalizedReason.includes('process safety incidence') || 
      normalizedReason.includes('restart following a process safety')) {
    return PROCESS_SAFETY_INCIDENT_TEXT;
  }
  return STANDARD_SOF_TEXT;
};

export const generateCertificateNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SOF-${year}-${random}`;
};

export const useSOFCertificate = (pssrId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch SoF certificate for a PSSR
  const { data: certificate, isLoading, error } = useQuery({
    queryKey: ['sof-certificate', pssrId],
    queryFn: async () => {
      if (!pssrId) return null;

      const { data, error } = await supabase
        .from('sof_certificates')
        .select('*')
        .eq('pssr_id', pssrId)
        .maybeSingle();

      if (error) throw error;
      return data as SOFCertificate | null;
    },
    enabled: !!pssrId,
  });

  // Create SoF certificate
  const createCertificate = useMutation({
    mutationFn: async (data: {
      pssrId: string;
      pssrReason: string;
      plantName?: string;
      facilityName?: string;
      projectName?: string;
    }) => {
      const certificateText = getCertificateText(data.pssrReason);
      
      const { data: cert, error } = await supabase
        .from('sof_certificates')
        .insert({
          pssr_id: data.pssrId,
          certificate_number: generateCertificateNumber(),
          pssr_reason: data.pssrReason,
          plant_name: data.plantName || null,
          facility_name: data.facilityName || null,
          project_name: data.projectName || null,
          certificate_text: certificateText,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (error) throw error;
      return cert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sof-certificate', pssrId] });
      toast({
        title: 'Certificate Created',
        description: 'Statement of Fitness certificate has been created.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Certificate',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update certificate status
  const updateStatus = useMutation({
    mutationFn: async (newStatus: SOFCertificate['status']) => {
      if (!certificate?.id) throw new Error('No certificate found');

      const updateData: Partial<SOFCertificate> = { status: newStatus };
      if (newStatus === 'ISSUED') {
        updateData.issued_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('sof_certificates')
        .update(updateData)
        .eq('id', certificate.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sof-certificate', pssrId] });
    },
  });

  return {
    certificate,
    isLoading,
    error,
    createCertificate,
    updateStatus,
    hasCertificate: !!certificate,
  };
};

export const useSOFApprovers = (pssrId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch SoF approvers
  const { data: approvers, isLoading, error } = useQuery({
    queryKey: ['sof-approvers', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];

      const { data, error } = await supabase
        .from('sof_approvers')
        .select('*')
        .eq('pssr_id', pssrId)
        .order('approver_level', { ascending: true });

      if (error) throw error;
      return data as SOFApprover[];
    },
    enabled: !!pssrId,
  });

  // Approve with signature
  const approveSOF = useMutation({
    mutationFn: async ({ 
      approverId, 
      comments, 
      signatureData 
    }: { 
      approverId: string; 
      comments?: string; 
      signatureData: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('sof_approvers')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          comments: comments || null,
          signature_data: signatureData,
          user_id: user.user?.id,
        })
        .eq('id', approverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sof-approvers', pssrId] });
      queryClient.invalidateQueries({ queryKey: ['sof-certificate', pssrId] });
      toast({
        title: 'SoF Approved',
        description: 'Your approval has been recorded with signature.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject
  const rejectSOF = useMutation({
    mutationFn: async ({ 
      approverId, 
      comments 
    }: { 
      approverId: string; 
      comments: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('sof_approvers')
        .update({
          status: 'REJECTED',
          approved_at: new Date().toISOString(),
          comments: comments,
          user_id: user.user?.id,
        })
        .eq('id', approverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sof-approvers', pssrId] });
      toast({
        title: 'SoF Rejected',
        description: 'Your feedback has been recorded.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Rejection Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const stats = {
    total: approvers?.length || 0,
    approved: approvers?.filter(a => a.status === 'APPROVED').length || 0,
    pending: approvers?.filter(a => a.status === 'PENDING').length || 0,
    locked: approvers?.filter(a => a.status === 'LOCKED').length || 0,
    rejected: approvers?.filter(a => a.status === 'REJECTED').length || 0,
  };

  const isComplete = stats.total > 0 && stats.approved === stats.total;
  const isUnlocked = stats.locked === 0;

  return {
    approvers,
    isLoading,
    error,
    approveSOF,
    rejectSOF,
    stats,
    isComplete,
    isUnlocked,
  };
};
