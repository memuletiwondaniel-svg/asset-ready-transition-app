import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  AlertTriangle, 
  MessageSquare, 
  Award,
  X,
} from 'lucide-react';
import { PSSROverviewTab } from './PSSROverviewTab';
import { SOFCertificate } from '@/components/sof/SOFCertificate';
import { cn } from '@/lib/utils';
import { useSOFCertificate, useSOFApprovers } from '@/hooks/useSOFCertificates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const statusConfig = getStatusConfig(status || '');
  const queryClient = useQueryClient();

  // Fetch SoF certificate data
  const { certificate, isLoading: sofLoading } = useSOFCertificate(pssrId);
  const { approvers: sofApprovers, isLoading: sofApproversLoading } = useSOFApprovers(pssrId);

  // Fetch PSSR details for reason
  const { data: pssrData } = useQuery({
    queryKey: ['pssr-detail-for-sof', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssrs')
        .select('reason, plant_id')
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

  // Auto-populate SoF approvers if certificate exists but approvers are empty
  const autoPopulateSofApprovers = useMutation({
    mutationFn: async () => {
      if (!certificate || (sofApprovers && sofApprovers.length > 0)) return;
      
      const reason = pssrData?.reason || '';
      const needsExtraDirectors = /incident|near miss|tar|turn around|modification/i.test(reason);
      const plantName = plantData?.name || '';

      // Helper to find a person by position keyword + optional plant
      const findPerson = async (positionKeyword: string) => {
        // First try plant-specific
        if (plantName) {
          const { data } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .eq('is_active', true)
            .ilike('position', `%${positionKeyword}%${plantName}%`)
            .limit(1);
          if (data && data.length > 0) return data[0];
        }
        // Fallback to global
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('is_active', true)
          .ilike('position', `%${positionKeyword}%`)
          .limit(1);
        return data?.[0] || null;
      };

      const plantDirector = await findPerson('Plant Director');
      const hseDirector = await findPerson('HSE Director');

      // All SoF approvers start as LOCKED - they only unlock when the entire PSSR is complete
      const approversToInsert: any[] = [
        {
          sof_certificate_id: certificate.id, pssr_id: pssrId,
          approver_name: plantDirector?.full_name || 'Plant Director',
          approver_role: 'Plant Director', approver_level: 1,
          status: 'LOCKED' as const,
          user_id: plantDirector?.user_id || null,
        },
        {
          sof_certificate_id: certificate.id, pssr_id: pssrId,
          approver_name: hseDirector?.full_name || 'HSE Director',
          approver_role: 'HSE Director', approver_level: 2,
          status: 'LOCKED' as const,
          user_id: hseDirector?.user_id || null,
        },
      ];
      
      if (needsExtraDirectors) {
        const pmDirector = await findPerson('P&M Director');
        approversToInsert.push({
          sof_certificate_id: certificate.id, pssr_id: pssrId,
          approver_name: pmDirector?.full_name || 'P&M Director',
          approver_role: 'P&M Director', approver_level: 3,
          status: 'LOCKED' as const,
          user_id: pmDirector?.user_id || null,
        });
      }

      const { error } = await supabase.from('sof_approvers').insert(approversToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sof-approvers', pssrId] });
    },
  });

  // Trigger auto-populate when certificate loaded and approvers empty
  useEffect(() => {
    if (certificate && sofApprovers && sofApprovers.length === 0 && !sofLoading && !sofApproversLoading) {
      autoPopulateSofApprovers.mutate();
    }
  }, [certificate, sofApprovers, sofLoading, sofApproversLoading]);

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
              pssrTitle={pssrTitle}
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
      <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] md:h-[95vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
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
