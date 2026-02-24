import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, AlertTriangle, MessageSquare, Award } from 'lucide-react';
import { PSSROverviewTab } from './PSSROverviewTab';
import { SOFCertificate } from '@/components/sof/SOFCertificate';
import { cn } from '@/lib/utils';
import { useSOFCertificate, useSOFApprovers } from '@/hooks/useSOFCertificates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PSSRDetailContentProps {
  pssrId: string;
  pssrDisplayId: string;
  pssrTitle?: string;
}

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

export const PSSRDetailContent: React.FC<PSSRDetailContentProps> = ({
  pssrId,
  pssrDisplayId,
  pssrTitle,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

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

  // Auto-create SoF certificate
  const autoCreateSofCertificate = useMutation({
    mutationFn: async () => {
      if (certificate || !pssrData || !plantData) return;
      await createCertificate.mutateAsync({
        pssrId,
        pssrReason: pssrData.reason || 'Pre-Startup Safety Review',
        plantName: plantData.name || undefined,
      });
    },
  });

  // Auto-populate SoF approvers
  const autoPopulateSofApprovers = useMutation({
    mutationFn: async () => {
      const { data: cert } = await supabase
        .from('sof_certificates')
        .select('*')
        .eq('pssr_id', pssrId)
        .maybeSingle();
      if (!cert) return;

      const { data: existingApprovers } = await supabase
        .from('sof_approvers')
        .select('*')
        .eq('pssr_id', pssrId);
      if (existingApprovers && existingApprovers.length > 0) return;

      const plantName = plantData?.name || '';
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

      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .in('id', sofRoleIds);
      if (!roles || roles.length === 0) return;

      const findPerson = async (positionKeyword: string) => {
        if (plantName) {
          const { data } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, position')
            .eq('is_active', true)
            .ilike('position', `${positionKeyword} - ${plantName}`)
            .limit(1);
          if (data && data.length > 0) return data[0];
          const { data: data2 } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, position')
            .eq('is_active', true)
            .ilike('position', `%${positionKeyword}%${plantName}%`)
            .limit(1);
          if (data2 && data2.length > 0) return data2[0];
        }
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

  const sofCertCreated = useRef(false);
  const sofApproversPopulated = useRef(false);

  useEffect(() => {
    sofCertCreated.current = false;
    sofApproversPopulated.current = false;
  }, [pssrId]);

  useEffect(() => {
    if (sofLoading || !pssrData || !plantData) return;
    if (!certificate && !sofCertCreated.current) {
      sofCertCreated.current = true;
      autoCreateSofCertificate.mutate();
    } else if (certificate) {
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

  useEffect(() => {
    if (!certificate || sofApproversLoading || sofApproversPopulated.current) return;
    const isEmpty = !sofApprovers || sofApprovers.length === 0;
    if (isEmpty) {
      sofApproversPopulated.current = true;
      autoPopulateSofApprovers.mutate();
    }
  }, [certificate, sofApprovers, sofApproversLoading]);

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
              isViewOnly={true}
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
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left w-full shrink-0",
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
    <div className="flex h-full min-h-0">
      {/* Left Sidebar Navigation */}
      <div className="hidden md:flex w-48 shrink-0 border-r bg-muted/30 flex-col">
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

      {/* Mobile Tab Bar */}
      <div className="md:hidden absolute top-0 left-0 right-0 border-b shrink-0 overflow-x-auto bg-background z-10">
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

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-3 sm:p-5">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default PSSRDetailContent;
