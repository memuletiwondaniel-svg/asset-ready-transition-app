import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { RotateCcw, Save, ArrowRight, Plus, X, Search, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
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
  plantName?: string;
  fieldName?: string;
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
  plantName,
  fieldName,
}) => {
  const [formData, setFormData] = useState<ChecklistItemOverride>({});
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [addRoleSearch, setAddRoleSearch] = useState('');
  const [selectedDeliveringMemberId, setSelectedDeliveringMemberId] = useState<string | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [deliveringExpanded, setDeliveringExpanded] = useState(false);
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
      
      // Filter delivering members by PSSR location — only show members at the PSSR's plant/field
      const allDeliveringProfiles = assetProfiles.filter((p: any) => deliveringRoleIds.includes(p.role));
      const allDeliveringMembers = allDeliveringProfiles.map(toMember);
      
      const locationMatched: string[] = [];
      let delivering: ResolvedMember[];
      
      if (plantName) {
        const plantLower = plantName.toLowerCase();
        const fieldLower = fieldName?.toLowerCase() || '';
        
        // Only include members whose position matches the PSSR location
        delivering = allDeliveringMembers.filter(member => {
          const pos = member.position.toLowerCase();
          if (!pos.includes(plantLower)) return false;
          // If field is specified, also check field match
          if (fieldLower && !pos.includes(fieldLower)) return false;
          return true;
        });
        
        // All shown members are location-matched for auto-selection
        delivering.forEach(m => locationMatched.push(m.user_id));
      } else {
        delivering = allDeliveringMembers;
      }

      const approving: Record<string, ResolvedMember[]> = {};
      approvingRoles.forEach(roleName => {
        const roleId = roleNameToId[roleName.toLowerCase()];
        if (!roleId) return;
        const members = assetProfiles
          .filter((p: any) => p.role === roleId)
          .map(toMember);
        approving[roleName] = members;
      });

      return { delivering, approving, roleNameToId, locationMatched };
    },
    enabled: open && !!item,
  });
  // Auto-select location-matched or single delivering member
  useEffect(() => {
    const matched = resolvedParties?.locationMatched;
    if (matched && matched.length > 0) {
      setSelectedDeliveringMemberId(matched[0]);
    } else if (resolvedParties?.delivering && resolvedParties.delivering.length === 1) {
      setSelectedDeliveringMemberId(resolvedParties.delivering[0].user_id);
    }
  }, [resolvedParties?.locationMatched, resolvedParties?.delivering]);

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
          <SheetDescription className="sr-only">
            Edit PSSR item details
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

            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Delivering Party <span className="text-destructive">*</span>
              </Label>
              {!currentDeliveringRole && (
                <p className="text-[10px] text-destructive">A delivering party is required for every PSSR item.</p>
              )}
              <Select
                value={currentDeliveringRole}
                onValueChange={(roleName) => {
                  handleChangeDelivering(roleName);
                  setSelectedDeliveringMemberId(null);
                }}
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
              {currentDeliveringRole && deliveringMembers.length > 0 && (
                <Collapsible open={deliveringExpanded} onOpenChange={setDeliveringExpanded}>
                  <div className="border rounded-lg bg-muted/50 dark:bg-muted/30">
                    <div className="flex items-center px-3 py-2.5">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                        >
                          <ChevronRight className={cn(
                            "h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform duration-200",
                            deliveringExpanded && "rotate-90"
                          )} />
                          <span className="font-semibold text-sm tracking-tight text-foreground/90 truncate">{currentDeliveringRole}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal ml-1 shrink-0 text-muted-foreground/50">
                            {deliveringMembers.length}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0">
                        <div className="flex flex-wrap gap-2 pl-0.5">
                          {deliveringMembers.map((member) => (
                            <div
                              key={member.user_id}
                              className="flex items-center gap-2 bg-background border rounded-md px-2.5 py-1.5"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={getAvatarUrl(member.avatar_url)} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {getInitials(member.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{member.full_name}</p>
                                {member.position && (
                                  <p className="text-[10px] text-muted-foreground/50 truncate">{member.position}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
              {currentDeliveringRole && deliveringMembers.length === 0 && (
                <p className="text-xs text-muted-foreground italic pl-1">
                  No matching personnel found{plantName ? ` for ${plantName}` : ''}
                </p>
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
                <div className="space-y-2">
                  {currentApprovingRoles.map((roleName) => {
                    const members = approvingGroups[roleName] || [];
                    const isExpanded = expandedRoles.has(roleName);
                    return (
                      <Collapsible
                        key={roleName}
                        open={isExpanded}
                        onOpenChange={(open) => {
                          setExpandedRoles(prev => {
                            const next = new Set(prev);
                            open ? next.add(roleName) : next.delete(roleName);
                            return next;
                          });
                        }}
                      >
                        <div className="border rounded-lg bg-muted/50 dark:bg-muted/30 group">
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                              >
                                <ChevronRight className={cn(
                                  "h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform duration-200",
                                  isExpanded && "rotate-90"
                                )} />
                                <span className="font-semibold text-sm tracking-tight text-foreground/90 truncate">{roleName}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal ml-1 shrink-0 text-muted-foreground/50">
                                  {members.length}
                                </Badge>
                              </button>
                            </CollapsibleTrigger>
                            <button
                              type="button"
                              onClick={() => handleRemoveApprover(roleName)}
                              className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-full hover:bg-destructive/10 text-destructive/70 hover:text-destructive shrink-0 ml-2"
                              title={`Remove ${roleName}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 pt-0">
                              {members.length > 0 ? (
                                <div className="flex flex-wrap gap-2 pl-0.5">
                                  {members.map((member) => (
                                    <div
                                      key={member.user_id}
                                      className="flex items-center gap-2 bg-background border rounded-md px-2.5 py-1.5"
                                    >
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={getAvatarUrl(member.avatar_url)} />
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                          {getInitials(member.full_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium truncate">{member.full_name}</p>
                                        {member.position && (
                                          <p className="text-[10px] text-muted-foreground/50 truncate">{member.position}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  No matching personnel found{plantName ? ` for ${plantName}` : ''}
                                </p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
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
