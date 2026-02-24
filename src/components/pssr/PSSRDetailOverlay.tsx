import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  AlertTriangle, 
  MessageSquare, 
  Award,
  X,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { PSSROverviewTab } from './PSSROverviewTab';
import { SOFCertificate } from '@/components/sof/SOFCertificate';
import { cn } from '@/lib/utils';
import { useSOFCertificate, useSOFApprovers } from '@/hooks/useSOFCertificates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PSSRDetailOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  pssrDisplayId: string;
  pssrTitle?: string;
  status?: string;
}

// Placeholder for tabs not yet implemented
const PlaceholderTab: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">
      {title} details will be displayed here.
    </p>
  </div>
);

const navTabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'qualifications', label: 'Qualifications', icon: AlertTriangle },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'sof', label: 'SoF Certificate', icon: Award },
];

const getStatusConfig = (status: string) => {
  const s = status?.toUpperCase() || '';
  if (s === 'COMPLETED' || s === 'APPROVED') return { label: 'Completed', color: 'bg-emerald-500' };
  if (s === 'UNDER_REVIEW' || s === 'IN-REVIEW') return { label: 'Under Review', color: 'bg-amber-500' };
  if (s === 'PENDING_LEAD_REVIEW') return { label: 'Pending Lead Review', color: 'bg-blue-500' };
  return { label: 'Draft', color: 'bg-slate-400' };
};

export const PSSRDetailOverlay: React.FC<PSSRDetailOverlayProps> = ({
  open,
  onOpenChange,
  pssrId,
  pssrDisplayId,
  pssrTitle,
  status,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentStatus, setCurrentStatus] = useState(status);
  const statusConfig = getStatusConfig(currentStatus || '');
  const queryClient = useQueryClient();
  const normalizedStatus = (currentStatus || '').toUpperCase().replace(/[\s-]+/g, '_');
  const isPendingLeadReview = normalizedStatus === 'PENDING_LEAD_REVIEW';
  const isDraft = normalizedStatus === 'DRAFT';
  const canRevertToStatus = !isDraft; // Show revert button for any non-draft status

  // Fetch current user ID
  const { data: currentUser } = useQuery({
    queryKey: ['current-auth-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 300000,
  });

  // Fetch PSSR lead ID for this PSSR
  const { data: pssrLeadData } = useQuery({
    queryKey: ['pssr-lead', pssrId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pssrs')
        .select('pssr_lead_id')
        .eq('id', pssrId)
        .single();
      return data;
    },
    enabled: !!pssrId,
  });

  const isCurrentUserPSSRLead = !!(currentUser?.id && pssrLeadData?.pssr_lead_id && currentUser.id === pssrLeadData.pssr_lead_id);

  // Revert to Draft mutation
  const revertToDraft = useMutation({
    mutationFn: async () => {
      // 1. Update PSSR status to DRAFT
      const { error: statusError } = await supabase
        .from('pssrs')
        .update({ status: 'DRAFT', approval_status: null })
        .eq('id', pssrId);
      if (statusError) throw statusError;

      // 2. Delete the pending review task for the PSSR Lead
      const { data: tasks } = await supabase
        .from('user_tasks')
        .select('id')
        .eq('type', 'review')
        .eq('status', 'pending')
        .filter('metadata->>pssr_id', 'eq', pssrId)
        .filter('metadata->>action', 'eq', 'review_draft_pssr');

      if (tasks && tasks.length > 0) {
        for (const task of tasks) {
          await supabase.from('user_tasks').delete().eq('id', task.id);
        }
      }
    },
    onSuccess: () => {
      setCurrentStatus('DRAFT');
      queryClient.invalidateQueries({ queryKey: ['pssr-records'] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({
        title: 'Reverted to Draft',
        description: 'The PSSR has been reverted to Draft status and the lead review task has been removed.',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Revert',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch SoF certificate data
  const { certificate, isLoading: sofLoading, createCertificate } = useSOFCertificate(pssrId);
  const { approvers: sofApprovers, isLoading: sofApproversLoading } = useSOFApprovers(pssrId);

  // Fetch PSSR details for reason
  const { data: pssrData } = useQuery({
    queryKey: ['pssr-detail-for-sof', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssrs')
        .select('reason, plant_id, reason_id, asset, draft_sof_approver_role_ids')
        .eq('id', pssrId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  // Fetch plant name
  const { data: plantData } = useQuery({
    queryKey: ['pssr-plant-for-sof', pssrData?.plant_id],
    queryFn: async () => {
      if (!pssrData?.plant_id) return null;
      const { data, error } = await supabase.from('plant').select('name').eq('id', pssrData.plant_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!pssrData?.plant_id,
  });

  // Fetch PSSR approvers
  const { data: pssrApprovers } = useQuery({
    queryKey: ['pssr-approvers', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_approvers')
        .select('*')
        .eq('pssr_id', pssrId)
        .order('approver_level', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  // Auto-populate PSSR approvers: resolve unresolved user_ids
  const autoPopulatePssrApprovers = useMutation({
    mutationFn: async () => {
      const hasUnresolved = pssrApprovers?.some(a => !a.user_id);
      if (!hasUnresolved || !pssrApprovers || pssrApprovers.length === 0) return;

      const plantName = plantData?.name || '';

      const findPerson = async (positionKeyword: string) => {
        // First try exact plant match: "Plant Director - NRNGL"
        if (plantName) {
          const { data } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, position')
            .eq('is_active', true)
            .ilike('position', `${positionKeyword} - ${plantName}`)
            .limit(1);
          if (data && data.length > 0) return data[0];
          
          // Fallback: contains both keyword and plant name
          const { data: data2 } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, position')
            .eq('is_active', true)
            .ilike('position', `%${positionKeyword}%${plantName}%`)
            .limit(1);
          if (data2 && data2.length > 0) return data2[0];
        }
        return null;
      };

      for (const approver of pssrApprovers.filter(a => !a.user_id)) {
        const role = approver.approver_role || '';
        const matched = await findPerson(role);
        if (matched) {
          await supabase
            .from('pssr_approvers')
            .update({ user_id: matched.user_id, approver_name: matched.full_name })
            .eq('id', approver.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-approvers', pssrId] });
    },
  });

  // Auto-create SoF certificate from PSSR data when it doesn't exist
  const autoCreateSofCertificate = useMutation({
    mutationFn: async () => {
      if (certificate || !pssrData || !plantData) return;

      // Create the SoF certificate using PSSR data
      await createCertificate.mutateAsync({
        pssrId,
        pssrReason: pssrData.reason || 'Pre-Startup Safety Review',
        plantName: plantData.name || undefined,
      });
    },
  });

  // Auto-populate SoF approvers from configured roles
  const autoPopulateSofApprovers = useMutation({
    mutationFn: async () => {
      // Re-fetch certificate since it may have just been created
      const { data: cert } = await supabase
        .from('sof_certificates')
        .select('*')
        .eq('pssr_id', pssrId)
        .maybeSingle();
      if (!cert) return;

      // Check existing approvers
      const { data: existingApprovers } = await supabase
        .from('sof_approvers')
        .select('*')
        .eq('pssr_id', pssrId);

      if (existingApprovers && existingApprovers.length > 0) return;

      const plantName = plantData?.name || '';

      // Get SoF approver role IDs from the PSSR's draft or from reason configuration
      let sofRoleIds: string[] = [];
      
      if (pssrData?.draft_sof_approver_role_ids) {
        sofRoleIds = pssrData.draft_sof_approver_role_ids as string[];
      } else if (pssrData?.reason_id) {
        const { data: config } = await supabase
          .from('pssr_reason_configuration')
          .select('sof_approver_role_ids')
          .eq('reason_id', pssrData.reason_id)
          .maybeSingle();
        if (config?.sof_approver_role_ids) {
          sofRoleIds = config.sof_approver_role_ids as string[];
        }
      }

      if (sofRoleIds.length === 0) return;

      // Resolve role IDs to role names
      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .in('id', sofRoleIds);

      if (!roles || roles.length === 0) return;

      // Helper to find a person by exact position + plant
      const findPerson = async (positionKeyword: string) => {
        if (plantName) {
          // Exact match: "Plant Director - NRNGL"
          const { data } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, position')
            .eq('is_active', true)
            .ilike('position', `${positionKeyword} - ${plantName}`)
            .limit(1);
          if (data && data.length > 0) return data[0];
          
          // Contains both
          const { data: data2 } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, position')
            .eq('is_active', true)
            .ilike('position', `%${positionKeyword}%${plantName}%`)
            .limit(1);
          if (data2 && data2.length > 0) return data2[0];
        }
        // For director-level roles without plant specificity (e.g., P&M Director, HSE Director)
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, position')
          .eq('is_active', true)
          .ilike('position', `%${positionKeyword}%`)
          .limit(1);
        return data?.[0] || null;
      };

      const approversToInsert: any[] = [];
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const person = await findPerson(role.name);
        approversToInsert.push({
          sof_certificate_id: cert.id,
          pssr_id: pssrId,
          approver_name: person?.full_name || role.name,
          approver_role: role.name,
          approver_level: i + 1,
          status: 'LOCKED' as const,
          user_id: person?.user_id || null,
        });
      }

      if (approversToInsert.length > 0) {
        const { error } = await supabase.from('sof_approvers').insert(approversToInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sof-approvers', pssrId] });
      queryClient.invalidateQueries({ queryKey: ['sof-certificate', pssrId] });
    },
  });

  // Guards to prevent duplicate mutation calls
  const sofCertCreated = useRef(false);
  const sofApproversPopulated = useRef(false);
  const pssrApproversResolved = useRef(false);

  // Reset guards when pssrId changes
  useEffect(() => {
    sofCertCreated.current = false;
    sofApproversPopulated.current = false;
    pssrApproversResolved.current = false;
  }, [pssrId]);

  // Step 1: Auto-create SoF certificate if it doesn't exist, or update if stale
  useEffect(() => {
    if (sofLoading || !pssrData || !plantData) return;

    if (!certificate && !sofCertCreated.current) {
      sofCertCreated.current = true;
      autoCreateSofCertificate.mutate();
    } else if (certificate) {
      // Update existing certificate if PSSR data changed (e.g. reason or plant)
      const needsUpdate =
        certificate.pssr_reason !== (pssrData.reason || 'Pre-Startup Safety Review') ||
        certificate.plant_name !== (plantData.name || null);
      if (needsUpdate) {
        supabase
          .from('sof_certificates')
          .update({
            pssr_reason: pssrData.reason || 'Pre-Startup Safety Review',
            plant_name: plantData.name || null,
          })
          .eq('id', certificate.id)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['sof-certificate', pssrId] });
          });
      }
    }
  }, [sofLoading, certificate, pssrData, plantData]);

  // Step 2: Auto-populate SoF approvers once certificate exists and approvers are empty
  useEffect(() => {
    if (!certificate || sofApproversLoading || sofApproversPopulated.current) return;
    const isEmpty = !sofApprovers || sofApprovers.length === 0;
    if (isEmpty) {
      sofApproversPopulated.current = true;
      autoPopulateSofApprovers.mutate();
    }
  }, [certificate, sofApprovers, sofApproversLoading]);

  // Step 3: Trigger auto-resolve for PSSR approvers with missing user_ids
  useEffect(() => {
    if (pssrApproversResolved.current) return;
    if (pssrApprovers && pssrApprovers.length > 0 && plantData !== undefined) {
      const hasUnresolved = pssrApprovers.some(a => !a.user_id);
      if (hasUnresolved) {
        pssrApproversResolved.current = true;
        autoPopulatePssrApprovers.mutate();
      }
    }
  }, [pssrApprovers, plantData]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <PSSROverviewTab pssrId={pssrId} pssrDisplayId={pssrDisplayId} />;
      case 'qualifications':
        return <PlaceholderTab title="Qualifications" icon={<AlertTriangle className="w-8 h-8 text-amber-500" />} />;
      case 'comments':
        return <PlaceholderTab title="Comments" icon={<MessageSquare className="w-8 h-8 text-blue-500" />} />;
      case 'sof':
        if (certificate) {
          return (
            <SOFCertificate
              pssrId={pssrId}
              certificateNumber={certificate.certificate_number}
              pssrReason={certificate.pssr_reason}
              plantName={certificate.plant_name || plantData?.name || ''}
              pssrTitle={pssrTitle || pssrData?.asset || ''}
              approvers={(sofApprovers || []).map((a: any) => ({
                id: a.id,
                approver_name: a.approver_name,
                approver_role: a.approver_role,
                approver_level: a.approver_level,
                status: a.status,
                comments: a.comments,
                approved_at: a.approved_at,
                signature_data: a.signature_data,
              }))}
              issuedAt={certificate.issued_at || undefined}
              status={certificate.status}
              isViewOnly={false}
            />
          );
        }
        return <PlaceholderTab title="SoF Certificate" icon={<Award className="w-8 h-8 text-amber-500" />} />;
      default:
        return <PSSROverviewTab pssrId={pssrId} pssrDisplayId={pssrDisplayId} />;
    }
  };

  const NavButton: React.FC<{ id: string; label: string; icon: React.ComponentType<any> }> = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
        "w-full md:w-full",
        "shrink-0 md:shrink",
        activeTab === id
          ? "bg-primary text-primary-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] md:h-[95vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:sr-only">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 border-b shrink-0 min-h-[48px] sm:min-h-[52px]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn('w-2 sm:w-3 h-8 sm:h-10 rounded-full shrink-0', statusConfig.color)} />
            <div className="min-w-0">
              <DialogTitle className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
                {pssrDisplayId}
              </DialogTitle>
              {pssrTitle && (
                <p className="text-sm sm:text-base font-semibold leading-tight line-clamp-2 sm:line-clamp-1">{pssrTitle}</p>
              )}
              <DialogDescription className="sr-only">
                PSSR Detail View
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Badge */}
            <Badge className={cn(
              'text-xs font-medium px-2.5 py-0.5 rounded-full border',
              isPendingLeadReview
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
                : statusConfig.color === 'bg-emerald-500'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : statusConfig.color === 'bg-amber-500'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-muted text-muted-foreground border-border'
            )}>
              {statusConfig.label}
            </Badge>

            {/* Revert to Draft - always visible for non-draft, only actionable by PSSR Lead */}
            {canRevertToStatus && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 h-7"
                    disabled={revertToDraft.isPending || !isCurrentUserPSSRLead}
                    title={!isCurrentUserPSSRLead ? 'Only the PSSR Lead can revert to draft' : 'Revert this PSSR to Draft status'}
                  >
                    {revertToDraft.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    Revert to Draft
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revert PSSR to Draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will revert <strong>{pssrDisplayId}</strong> back to Draft status and remove the pending review task from the PSSR Lead's task list. You can then re-edit and resubmit the PSSR.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => revertToDraft.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Revert to Draft
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden border-b shrink-0 overflow-x-auto">
          <div className="flex gap-1 p-2">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body: Sidebar (desktop) + Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar Navigation - Hidden on mobile */}
          <div className="hidden md:flex w-56 shrink-0 border-r bg-muted/30 flex-col">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                <div className="px-2 pt-1 pb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Navigate
                  </span>
                </div>
                {navTabs.map((tab) => (
                  <NavButton key={tab.id} {...tab} />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-3 sm:p-5">
                {renderContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
