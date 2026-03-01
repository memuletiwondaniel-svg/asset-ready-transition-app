import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Search, Shield, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AppPermission } from '@/hooks/usePermissions';

const ALL_PERMISSIONS: { key: AppPermission; label: string; description: string }[] = [
  { key: 'create_project', label: 'Create Project', description: 'Can create new projects' },
  { key: 'create_vcr', label: 'Create VCR', description: 'Can create Verification Certificates' },
  { key: 'create_pssr', label: 'Create PSSR', description: 'Can create Pre-Startup Safety Reviews' },
  { key: 'approve_pssr', label: 'Approve PSSR', description: 'Can approve PSSRs' },
  { key: 'approve_sof', label: 'Approve SoF', description: 'Can approve Statement of Fitness' },
  { key: 'manage_users', label: 'Manage Users', description: 'Can manage user accounts' },
  { key: 'access_admin', label: 'Access Admin', description: 'Can access admin tools' },
  { key: 'view_reports', label: 'View Reports', description: 'Can view reports and dashboards' },
  { key: 'create_ora_plan', label: 'Create ORA Plan', description: 'Can create ORA Plans' },
  { key: 'manage_p2a', label: 'Manage P2A', description: 'Can manage P2A handover plans' },
  { key: 'manage_orm', label: 'Manage ORM', description: 'Can manage ORM deliverables' },
  { key: 'create_p2a_plan', label: 'Create P2A Plan', description: 'Can create P2A plans' },
];

interface RolePermission {
  role_id: string;
  permission: string;
}

interface RolePermissionsManagerProps {
  onBack: () => void;
}

export const RolePermissionsManager: React.FC<RolePermissionsManagerProps> = ({ onBack }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

  // Fetch roles grouped by category
  const { data: groupedRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles-by-category'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_roles_by_category');
      if (error) throw error;
      
      // Group by category
      const groups: Record<string, { id: string; name: string; roles: { id: string; name: string }[] }> = {};
      for (const row of (data || [])) {
        if (!groups[row.category_id]) {
          groups[row.category_id] = {
            id: row.category_id,
            name: row.category_name,
            roles: [],
          };
        }
        if (row.role_id && row.role_name) {
          groups[row.category_id].roles.push({ id: row.role_id, name: row.role_name });
        }
      }
      return Object.values(groups);
    },
  });

  // Fetch current permissions
  const { data: currentPermissions, isLoading: permsLoading } = useQuery({
    queryKey: ['role-permissions-matrix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_id, permission');
      if (error) throw error;
      
      const map = new Set<string>();
      for (const rp of (data || [])) {
        map.add(`${rp.role_id}:${rp.permission}`);
      }
      return map;
    },
  });

  const isLoading = rolesLoading || permsLoading;

  // All roles flat for the matrix
  const allRoles = useMemo(() => {
    if (!groupedRoles) return [];
    return groupedRoles.flatMap(g => g.roles);
  }, [groupedRoles]);

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return allRoles;
    const q = searchQuery.toLowerCase();
    return allRoles.filter(r => r.name.toLowerCase().includes(q));
  }, [allRoles, searchQuery]);

  const isChecked = (roleId: string, permission: string): boolean => {
    const key = `${roleId}:${permission}`;
    if (pendingChanges.has(key)) return pendingChanges.get(key)!;
    return currentPermissions?.has(key) || false;
  };

  const togglePermission = (roleId: string, permission: string) => {
    const key = `${roleId}:${permission}`;
    const currentValue = isChecked(roleId, permission);
    setPendingChanges(prev => {
      const next = new Map(prev);
      const originalValue = currentPermissions?.has(key) || false;
      if (!currentValue === originalValue) {
        next.delete(key); // Reverted to original
      } else {
        next.set(key, !currentValue);
      }
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const toAdd: { role_id: string; permission: string }[] = [];
      const toRemove: { role_id: string; permission: string }[] = [];

      for (const [key, value] of pendingChanges) {
        const [role_id, permission] = key.split(':');
        if (value) {
          toAdd.push({ role_id, permission });
        } else {
          toRemove.push({ role_id, permission });
        }
      }

      // Process removals
      for (const item of toRemove) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', item.role_id)
          .eq('permission', item.permission as any);
        if (error) throw error;
      }

      // Process additions
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(toAdd.map(a => ({ role_id: a.role_id, permission: a.permission as any })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setPendingChanges(new Map());
      queryClient.invalidateQueries({ queryKey: ['role-permissions-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permissions saved successfully');
    },
    onError: (error) => {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    },
  });

  const hasPendingChanges = pendingChanges.size > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <BreadcrumbNavigation currentPageLabel="Roles & Permissions" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Roles & Permissions</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage what each role can do across the platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasPendingChanges && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {pendingChanges.size} unsaved changes
              </Badge>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasPendingChanges || saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b border-border/50">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Matrix */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="min-w-max">
            {/* Sticky header row */}
            <div className="sticky top-0 z-10 bg-card border-b border-border">
              <div className="flex">
                <div className="w-56 shrink-0 px-4 py-3 font-semibold text-sm text-muted-foreground border-r border-border">
                  Role
                </div>
                {ALL_PERMISSIONS.map(perm => (
                  <div
                    key={perm.key}
                    className="w-28 shrink-0 px-2 py-3 text-center border-r border-border/30"
                    title={perm.description}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground leading-tight block">
                      {perm.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Role rows */}
            {filteredRoles.map((role, idx) => (
              <div
                key={role.id}
                className={`flex border-b border-border/20 hover:bg-muted/30 transition-colors ${
                  idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                }`}
              >
                <div className="w-56 shrink-0 px-4 py-2.5 font-medium text-sm text-foreground border-r border-border/30 flex items-center">
                  {role.name}
                </div>
                {ALL_PERMISSIONS.map(perm => {
                  const checked = isChecked(role.id, perm.key);
                  const key = `${role.id}:${perm.key}`;
                  const isPending = pendingChanges.has(key);
                  return (
                    <div
                      key={perm.key}
                      className={`w-28 shrink-0 flex items-center justify-center border-r border-border/10 ${
                        isPending ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => togglePermission(role.id, perm.key)}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RolePermissionsManager;
