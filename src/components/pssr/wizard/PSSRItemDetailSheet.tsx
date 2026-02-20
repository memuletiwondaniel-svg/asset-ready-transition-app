import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RotateCcw, Save, ArrowRight } from 'lucide-react';
import { ChecklistItem } from '@/hooks/usePSSRChecklistLibrary';
import { ChecklistItemOverride } from './ChecklistItemEditDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PSSRItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ChecklistItem | null;
  categoryRefId?: string;
  currentOverride?: ChecklistItemOverride;
  onSave: (itemId: string, override: ChecklistItemOverride) => void;
  onReset: (itemId: string) => void;
}

interface ResolvedMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  position: string;
  role_name: string;
}

const getAvatarUrl = (avatarPath: string | null) => {
  if (!avatarPath) return undefined;
  if (avatarPath.startsWith('http')) return avatarPath;
  return `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${avatarPath}`;
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const PSSRItemDetailSheet: React.FC<PSSRItemDetailSheetProps> = ({
  open,
  onOpenChange,
  item,
  categoryRefId,
  currentOverride,
  onSave,
  onReset,
}) => {
  const [formData, setFormData] = useState<ChecklistItemOverride>({});

  useEffect(() => {
    if (item && open) {
      setFormData({
        topic: currentOverride?.topic ?? item.topic ?? '',
        description: currentOverride?.description ?? item.description ?? '',
        supporting_evidence: currentOverride?.supporting_evidence ?? item.supporting_evidence ?? '',
        approvers: currentOverride?.approvers ?? item.approvers ?? '',
        responsible: currentOverride?.responsible ?? item.responsible ?? '',
      });
    }
  }, [item, currentOverride, open]);

  // Resolve role names to Asset-level profiles
  const { data: resolvedParties } = useQuery({
    queryKey: ['pssr-item-parties', item?.id, item?.responsible, item?.approvers],
    queryFn: async () => {
      if (!item) return { delivering: [] as ResolvedMember[], approving: {} as Record<string, ResolvedMember[]> };

      const responsibleText = currentOverride?.responsible ?? item.responsible ?? '';
      const approversText = currentOverride?.approvers ?? item.approvers ?? '';

      // Parse comma-separated role names
      const deliveringRoles = responsibleText ? responsibleText.split(',').map(r => r.trim()).filter(Boolean) : [];
      const approvingRoles = approversText ? approversText.split(',').map(r => r.trim()).filter(Boolean) : [];
      const allRoleNames = [...new Set([...deliveringRoles, ...approvingRoles])];

      if (allRoleNames.length === 0) return { delivering: [], approving: {} };

      // Fetch roles matching these names
      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true);

      if (!roles) return { delivering: [], approving: {} };

      // Build role name -> id map (case insensitive)
      const roleNameToId: Record<string, string> = {};
      const roleIdToName: Record<string, string> = {};
      roles.forEach(r => {
        roleNameToId[r.name.toLowerCase()] = r.id;
        roleIdToName[r.id] = r.name;
      });

      // Get all matching role IDs
      const matchedRoleIds = allRoleNames
        .map(name => roleNameToId[name.toLowerCase()])
        .filter(Boolean);

      if (matchedRoleIds.length === 0) return { delivering: [], approving: {} };

      // Fetch Asset-level profiles for these roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, position')
        .in('role', matchedRoleIds)
        .eq('is_active', true);

      if (!profiles) return { delivering: [], approving: {} };

      // For TA2 roles, only include Asset-level staff
      const assetProfiles = profiles.filter((p: any) => {
        const pos = (p.position || '').toLowerCase();
        const roleName = roleIdToName[p.role] || '';
        // If it's a TA2 role, only include Asset-level
        if (roleName.toLowerCase().includes('ta2')) {
          return pos.includes('asset');
        }
        // For non-TA2 roles, include all
        return true;
      });

      const toMember = (p: any): ResolvedMember => ({
        user_id: p.user_id,
        full_name: p.full_name || '',
        avatar_url: p.avatar_url,
        position: p.position || '',
        role_name: roleIdToName[p.role] || '',
      });

      // Resolve delivering party
      const deliveringRoleIds = deliveringRoles
        .map(name => roleNameToId[name.toLowerCase()])
        .filter(Boolean);
      const delivering = assetProfiles
        .filter((p: any) => deliveringRoleIds.includes(p.role))
        .map(toMember);

      // Resolve approving parties grouped by role name
      const approving: Record<string, ResolvedMember[]> = {};
      approvingRoles.forEach(roleName => {
        const roleId = roleNameToId[roleName.toLowerCase()];
        if (!roleId) return;
        const members = assetProfiles
          .filter((p: any) => p.role === roleId)
          .map(toMember);
        approving[roleName] = members;
      });

      return { delivering, approving };
    },
    enabled: open && !!item,
  });

  if (!item) return null;

  const hasOverrides = currentOverride && Object.keys(currentOverride).length > 0;

  const itemId = categoryRefId
    ? `${categoryRefId}-${String(item.sequence_number).padStart(2, '0')}`
    : `#${item.sequence_number}`;

  const handleSave = () => {
    const override: ChecklistItemOverride = {};
    if (formData.topic !== (item.topic ?? '')) override.topic = formData.topic;
    if (formData.description !== item.description) override.description = formData.description;
    if (formData.supporting_evidence !== (item.supporting_evidence ?? '')) override.supporting_evidence = formData.supporting_evidence;
    if (formData.approvers !== (item.approvers ?? '')) override.approvers = formData.approvers;
    if (formData.responsible !== (item.responsible ?? '')) override.responsible = formData.responsible;
    onSave(item.id, override);
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset(item.id);
    setFormData({
      topic: item.topic ?? '',
      description: item.description ?? '',
      supporting_evidence: item.supporting_evidence ?? '',
      approvers: item.approvers ?? '',
      responsible: item.responsible ?? '',
    });
  };

  const deliveringMembers = resolvedParties?.delivering || [];
  const approvingGroups = resolvedParties?.approving || {};
  const approvingRoleNames = Object.keys(approvingGroups);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base">Edit PSSR Item</SheetTitle>
            <Badge variant="outline" className="text-xs font-mono bg-primary/5 text-primary border-primary/20">
              {itemId}
            </Badge>
            {hasOverrides && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Customized
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Changes only apply to this PSSR instance.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-5">
            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                PSSR Item Description *
              </Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description..."
                rows={4}
                className="text-sm"
              />
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Topic
              </Label>
              <Input
                value={formData.topic || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="Enter topic..."
                className="text-sm"
              />
            </div>

            <Separator />

            {/* Delivering Party */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Delivering Party
              </Label>
              <Input
                value={formData.responsible || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
                placeholder="e.g., Project Engr"
                className="text-sm"
              />
              {deliveringMembers.length > 0 && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {deliveringMembers.map((member) => (
                    <div key={member.user_id} className="flex flex-col items-center gap-0.5">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={getAvatarUrl(member.avatar_url)} />
                        <AvatarFallback className="text-[10px]">{getInitials(member.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-foreground truncate max-w-[80px] text-center" title={member.full_name}>
                        {member.full_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
            </div>

            {/* Approving Parties */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Approving Parties ({approvingRoleNames.length})
                </Label>
              </div>
              <Input
                value={formData.approvers || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, approvers: e.target.value }))}
                placeholder="e.g., Process TA2, PACO TA2"
                className="text-sm"
              />
              {approvingRoleNames.length > 0 && (
                <Card className="mt-2">
                  <CardContent className="p-3">
                    <div className="divide-y divide-border">
                      {approvingRoleNames.map((roleName) => {
                        const members = approvingGroups[roleName] || [];
                        return (
                          <div key={roleName} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                            <span className="text-[10px] font-medium text-muted-foreground w-20 shrink-0 truncate" title={roleName}>
                              {roleName}
                            </span>
                            {members.length > 0 ? (
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                {members.map((member) => (
                                  <div key={member.user_id} className="flex flex-col items-center gap-0.5 w-14">
                                    <Avatar className="w-7 h-7">
                                      <AvatarImage src={getAvatarUrl(member.avatar_url)} />
                                      <AvatarFallback className="text-[10px]">{getInitials(member.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] text-foreground truncate w-full text-center" title={member.full_name}>
                                      {member.full_name?.split(' ')[0]}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground italic">Unassigned</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Guidance Notes / Supporting Evidence */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Guidance Notes
              </Label>
              <Textarea
                value={formData.supporting_evidence || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, supporting_evidence: e.target.value }))}
                placeholder="Enter guidance notes or supporting evidence requirements..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasOverrides}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PSSRItemDetailSheet;
