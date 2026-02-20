import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw, Save, ArrowRight, Plus, Minus, Search } from 'lucide-react';
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

interface RoleInfo {
  id: string;
  name: string;
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
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [addRoleSearch, setAddRoleSearch] = useState('');

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

  // Fetch all roles for add popover
  const { data: allRoles = [] } = useQuery({
    queryKey: ['all-roles-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return (data || []) as RoleInfo[];
    },
    enabled: open,
  });

  // Parse current approving role names
  const currentApprovingRoles = useMemo(() => {
    const text = formData.approvers || '';
    return text ? text.split(',').map(r => r.trim()).filter(Boolean) : [];
  }, [formData.approvers]);

  // Parse current delivering role name
  const currentDeliveringRole = (formData.responsible || '').trim();

  // Resolve role names to Asset-level profiles
  const { data: resolvedParties } = useQuery({
    queryKey: ['pssr-item-parties', item?.id, formData.responsible, formData.approvers],
    queryFn: async () => {
      if (!item) return { delivering: [] as ResolvedMember[], approving: {} as Record<string, ResolvedMember[]>, roleNameToId: {} as Record<string, string> };

      const responsibleText = formData.responsible || '';
      const approversText = formData.approvers || '';

      const deliveringRoles = responsibleText ? responsibleText.split(',').map(r => r.trim()).filter(Boolean) : [];
      const approvingRoles = approversText ? approversText.split(',').map(r => r.trim()).filter(Boolean) : [];
      const allRoleNames = [...new Set([...deliveringRoles, ...approvingRoles])];

      if (allRoleNames.length === 0) return { delivering: [], approving: {}, roleNameToId: {} };

      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true);

      if (!roles) return { delivering: [], approving: {}, roleNameToId: {} };

      const roleNameToId: Record<string, string> = {};
      const roleIdToName: Record<string, string> = {};
      roles.forEach(r => {
        roleNameToId[r.name.toLowerCase()] = r.id;
        roleIdToName[r.id] = r.name;
      });

      const matchedRoleIds = allRoleNames
        .map(name => roleNameToId[name.toLowerCase()])
        .filter(Boolean);

      if (matchedRoleIds.length === 0) return { delivering: [], approving: {}, roleNameToId };

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, position')
        .in('role', matchedRoleIds)
        .eq('is_active', true);

      if (!profiles) return { delivering: [], approving: {}, roleNameToId };

      // For TA2 roles, filter to Asset-level staff only for disciplines that have
      // separate Asset/Project designations. MCI, Civil, and Tech Safety TA2s serve
      // both Asset and Project so they are always included (no position suffix).
      const sharedDisciplines = ['mci', 'civil', 'tech safety'];
      const assetProfiles = profiles.filter((p: any) => {
        const pos = (p.position || '').toLowerCase();
        const roleName = roleIdToName[p.role] || '';
        if (roleName.toLowerCase().includes('ta2')) {
          const isShared = sharedDisciplines.some(d => roleName.toLowerCase().includes(d));
          if (isShared) return true; // shared disciplines — include all
          // For split disciplines, only include Asset-level (exclude Project)
          return !pos.includes('project');
        }
        return true;
      });

      const toMember = (p: any): ResolvedMember => ({
        user_id: p.user_id,
        full_name: p.full_name || '',
        avatar_url: p.avatar_url,
        position: p.position || '',
        role_name: roleIdToName[p.role] || '',
      });

      const deliveringRoleIds = deliveringRoles
        .map(name => roleNameToId[name.toLowerCase()])
        .filter(Boolean);
      const delivering = assetProfiles
        .filter((p: any) => deliveringRoleIds.includes(p.role))
        .map(toMember);

      const approving: Record<string, ResolvedMember[]> = {};
      approvingRoles.forEach(roleName => {
        const roleId = roleNameToId[roleName.toLowerCase()];
        if (!roleId) return;
        const members = assetProfiles
          .filter((p: any) => p.role === roleId)
          .map(toMember);
        approving[roleName] = members;
      });

      return { delivering, approving, roleNameToId };
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

  const handleRemoveApprover = (roleName: string) => {
    const updated = currentApprovingRoles.filter(r => r !== roleName);
    setFormData(prev => ({ ...prev, approvers: updated.join(', ') }));
  };

  const handleAddApprover = (roleName: string) => {
    if (!currentApprovingRoles.some(r => r.toLowerCase() === roleName.toLowerCase())) {
      const updated = [...currentApprovingRoles, roleName];
      setFormData(prev => ({ ...prev, approvers: updated.join(', ') }));
    }
    setAddRoleOpen(false);
    setAddRoleSearch('');
  };

  const handleChangeDelivering = (roleName: string) => {
    setFormData(prev => ({ ...prev, responsible: roleName }));
  };

  const deliveringMembers = resolvedParties?.delivering || [];
  const approvingGroups = resolvedParties?.approving || {};

  // Filter roles not already in approving list for "Add" popover
  const availableRoles = allRoles.filter(
    r => !currentApprovingRoles.some(ar => ar.toLowerCase() === r.name.toLowerCase())
  );
  const filteredAvailableRoles = addRoleSearch
    ? availableRoles.filter(r => r.name.toLowerCase().includes(addRoleSearch.toLowerCase()))
    : availableRoles;

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
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Delivering Party
              </Label>
              <Select
                value={currentDeliveringRole}
                onValueChange={handleChangeDelivering}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select delivering party..." />
                </SelectTrigger>
                <SelectContent>
                  {allRoles.map(role => (
                    <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {deliveringMembers.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Approving Parties ({currentApprovingRoles.length})
                </Label>
                <Popover open={addRoleOpen} onOpenChange={setAddRoleOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-primary hover:text-primary">
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search roles..."
                          value={addRoleSearch}
                          onChange={(e) => setAddRoleSearch(e.target.value)}
                          className="h-8 pl-7 text-xs"
                        />
                      </div>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-0.5">
                          {filteredAvailableRoles.map(role => (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => handleAddApprover(role.name)}
                              className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                            >
                              {role.name}
                            </button>
                          ))}
                          {filteredAvailableRoles.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">No roles found</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {currentApprovingRoles.length > 0 && (
                <Card>
                  <CardContent className="p-3">
                    <div className="divide-y divide-border">
                      {currentApprovingRoles.map((roleName) => {
                        const members = approvingGroups[roleName] || [];
                        return (
                          <div
                            key={roleName}
                            className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-3 px-3 transition-colors"
                          >
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
                              <p className="text-[10px] text-muted-foreground italic flex-1">Unassigned</p>
                            )}
                            {/* Delete button - visible on hover */}
                            <button
                              type="button"
                              onClick={() => handleRemoveApprover(roleName)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                              title={`Remove ${roleName}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Guidance Notes */}
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
