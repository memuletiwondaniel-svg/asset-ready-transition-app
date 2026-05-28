import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Briefcase,
  Wrench,
  Users,
  Settings,
  ShieldCheck,
  Folder,
  AlertTriangle,
  Activity,
  Cog,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useCategorizedRoles,
  useRoleCategories,
  useAddRole,
  useAddRoleCategory,
  useUpdateRoleCategory,
  useDeleteRoleCategory,
  useUpdateRole,
  useDeleteRole,
  type RoleCategory,
  type Role,
} from '@/hooks/useCategorizedRoles';

const categoryIcons: Record<string, React.ReactNode> = {
  'Project': <Briefcase className="h-5 w-5" />,
  'Engineering': <Cog className="h-5 w-5" />,
  'Maintenance': <Wrench className="h-5 w-5" />,
  'Management': <Users className="h-5 w-5" />,
  'Technical': <Settings className="h-5 w-5" />,
  'Security': <ShieldCheck className="h-5 w-5" />,
  'Safety': <AlertTriangle className="h-5 w-5" />,
  'Operations': <Activity className="h-5 w-5" />,
};

// Icon-only accent color (always shown). Card background tint is applied on hover only.
const categoryAccent: Record<string, { text: string; hoverBg: string }> = {
  'Project':     { text: 'text-blue-600 dark:text-blue-400',     hoverBg: 'hover:bg-blue-500/10' },
  'Engineering': { text: 'text-orange-600 dark:text-orange-400', hoverBg: 'hover:bg-orange-500/10' },
  'Maintenance': { text: 'text-slate-600 dark:text-slate-400',   hoverBg: 'hover:bg-slate-500/10' },
  'Management':  { text: 'text-purple-600 dark:text-purple-400', hoverBg: 'hover:bg-purple-500/10' },
  'Technical':   { text: 'text-emerald-600 dark:text-emerald-400', hoverBg: 'hover:bg-emerald-500/10' },
  'Security':    { text: 'text-red-600 dark:text-red-400',       hoverBg: 'hover:bg-red-500/10' },
  'Safety':      { text: 'text-lime-600 dark:text-lime-400',     hoverBg: 'hover:bg-lime-500/10' },
  'Operations':  { text: 'text-cyan-600 dark:text-cyan-400',     hoverBg: 'hover:bg-cyan-500/10' },
};

const FunctionsRolesManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: groupedRoles, isLoading: isLoadingRoles } = useCategorizedRoles();
  const { data: categories, isLoading: isLoadingCategories } = useRoleCategories();
  const { addRole } = useAddRole();
  const { addCategory } = useAddRoleCategory();
  const { updateCategory } = useUpdateRoleCategory();
  const { deleteCategory } = useDeleteRoleCategory();
  const { updateRole } = useUpdateRole();
  const { deleteRole } = useDeleteRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Combined Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<'function' | 'role'>('role');

  // Function dialogs
  const [editFunctionOpen, setEditFunctionOpen] = useState(false);
  const [functionName, setFunctionName] = useState('');
  const [functionDescription, setFunctionDescription] = useState('');
  const [functionOrder, setFunctionOrder] = useState('1');
  const [editingFunction, setEditingFunction] = useState<RoleCategory | null>(null);

  // Role dialogs
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const totalFunctions = categories?.length || 0;
  const totalRoles = groupedRoles?.reduce((sum, group) => sum + group.roles.length, 0) || 0;

  const filteredGroups = groupedRoles?.filter(group => {
    const categoryMatch = group.category.name.toLowerCase().includes(searchQuery.toLowerCase());
    const rolesMatch = group.roles.some(role => 
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return categoryMatch || rolesMatch;
  }).map(group => ({
    ...group,
    roles: searchQuery 
      ? group.roles.filter(role => 
          role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          role.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          group.category.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : group.roles
  }));

  const getCategoryIcon = (name: string) => {
    return categoryIcons[name] || <Folder className="h-5 w-5" />;
  };

  const getCategoryAccent = (name: string) => {
    return categoryAccent[name] || { text: 'text-muted-foreground', hoverBg: 'hover:bg-muted/50' };
  };

  // Function handlers
  const handleAddFunction = async () => {
    if (!functionName.trim()) {
      toast({ title: 'Error', description: 'Function name is required', variant: 'destructive' });
      return;
    }
    try {
      await addCategory(functionName.trim(), functionDescription.trim(), parseInt(functionOrder) || 1);
      queryClient.invalidateQueries({ queryKey: ['role-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      toast({ title: 'Success', description: 'Function added successfully' });
      setAddOpen(false);
      resetFunctionForm();
    } catch (error) {
      console.error('Error adding function:', error);
      toast({ title: 'Error', description: 'Failed to add function', variant: 'destructive' });
    }
  };

  const handleEditFunction = (category: RoleCategory) => {
    setEditingFunction(category);
    setFunctionName(category.name);
    setFunctionDescription(category.description || '');
    setFunctionOrder(category.display_order.toString());
    setEditFunctionOpen(true);
  };

  const handleUpdateFunction = async () => {
    if (!editingFunction || !functionName.trim()) {
      toast({ title: 'Error', description: 'Function name is required', variant: 'destructive' });
      return;
    }
    try {
      await updateCategory(editingFunction.id, functionName.trim(), functionDescription.trim(), parseInt(functionOrder) || 1);
      queryClient.invalidateQueries({ queryKey: ['role-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      toast({ title: 'Success', description: 'Function updated successfully' });
      setEditFunctionOpen(false);
      resetFunctionForm();
    } catch (error) {
      console.error('Error updating function:', error);
      toast({ title: 'Error', description: 'Failed to update function', variant: 'destructive' });
    }
  };

  const handleDeleteFunction = async (category: RoleCategory) => {
    if (!confirm(`Are you sure you want to deactivate "${category.name}"? This will also affect roles in this function.`)) {
      return;
    }
    try {
      await deleteCategory(category.id);
      queryClient.invalidateQueries({ queryKey: ['role-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      toast({ title: 'Success', description: 'Function deactivated successfully' });
    } catch (error) {
      console.error('Error deleting function:', error);
      toast({ title: 'Error', description: 'Failed to deactivate function', variant: 'destructive' });
    }
  };

  const resetFunctionForm = () => {
    setFunctionName('');
    setFunctionDescription('');
    setFunctionOrder('1');
    setEditingFunction(null);
  };

  // Role handlers
  const handleAddRole = async () => {
    if (!roleName.trim() || !selectedCategoryId) {
      toast({ title: 'Error', description: 'Role name and function are required', variant: 'destructive' });
      return;
    }
    try {
      await addRole(roleName.trim(), roleDescription.trim(), selectedCategoryId);
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      toast({ title: 'Success', description: 'Role added successfully' });
      setAddOpen(false);
      resetRoleForm();
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast({ title: 'Error', description: error?.message || 'Failed to add role', variant: 'destructive' });
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedCategoryId(role.category_id || '');
    setEditRoleOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingRole || !roleName.trim() || !selectedCategoryId) {
      toast({ title: 'Error', description: 'Role name and function are required', variant: 'destructive' });
      return;
    }
    try {
      await updateRole(editingRole.id, roleName.trim(), roleDescription.trim(), selectedCategoryId);
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      toast({ title: 'Success', description: 'Role updated successfully' });
      setEditRoleOpen(false);
      resetRoleForm();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Are you sure you want to deactivate the role "${role.name}"?`)) {
      return;
    }
    try {
      await deleteRole(role.id);
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      toast({ title: 'Success', description: 'Role deactivated successfully' });
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({ title: 'Error', description: 'Failed to deactivate role', variant: 'destructive' });
    }
  };

  const resetRoleForm = () => {
    setRoleName('');
    setRoleDescription('');
    setSelectedCategoryId('');
    setEditingRole(null);
  };

  if (isLoadingRoles || isLoadingCategories) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header — title + subtext on the left; search + Add on the right */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Roles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalFunctions} functions, {totalRoles} roles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={() => { setAddType('role'); setAddOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Roles
          </Button>
        </div>
      </div>


      {/* Hierarchical List */}
      <div className="space-y-3">
        {filteredGroups?.map((group) => {
          const accent = getCategoryAccent(group.category.name);
          const isOpen = expandedCategories.has(group.category.id);
          return (
          <Card key={group.category.id} className="overflow-hidden group/card border-border/60">
            <Collapsible
              open={isOpen}
              onOpenChange={() => toggleCategory(group.category.id)}
            >
              <CardHeader className="p-0">
                <div className={`flex items-center justify-between p-4 transition-colors ${accent.hoverBg}`}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-3 flex-1 text-left">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className={accent.text}>{getCategoryIcon(group.category.name)}</span>
                        <span className="font-medium text-foreground">{group.category.name}</span>
                      </div>
                      <span className="ml-2 text-xs text-muted-foreground/60">
                        {group.roles.length} roles
                      </span>
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFunction(group.category);
                      }}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFunction(group.category);
                      }}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CollapsibleContent>
                <CardContent className="p-0">
                  {group.roles.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No roles in this function
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {group.roles.map((role) => (
                        <div
                          key={role.id}
                          className="group/role flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <p className="font-medium flex-1">{role.name}</p>
                          <div className="flex items-center gap-1 opacity-0 group-hover/role:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRole(role)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRole(role)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          );
        })}

        {filteredGroups?.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No functions or roles found matching your search.
          </Card>
        )}
      </div>

      {/* Combined Add Dialog (Function or Role) */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { resetFunctionForm(); resetRoleForm(); } }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 space-y-1">
            <DialogTitle className="text-xl font-semibold">Add New</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Add a function or a role to the organization.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-5 border-t border-border/60 pt-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Type
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'function', label: 'Function', icon: <Folder className="h-5 w-5" /> },
                  { key: 'role',     label: 'Role',     icon: <ShieldCheck className="h-5 w-5" /> },
                ] as const).map(opt => {
                  const active = addType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setAddType(opt.key)}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 transition-all ${
                        active
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      {opt.icon}
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {addType === 'function' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="function-name" className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Name</Label>
                  <Input id="function-name" value={functionName} onChange={(e) => setFunctionName(e.target.value)} placeholder="e.g., Engineering" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="function-description" className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Description — optional</Label>
                  <Textarea id="function-description" value={functionDescription} onChange={(e) => setFunctionDescription(e.target.value)} placeholder="Short label or full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="function-order" className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Display Order</Label>
                  <Input id="function-order" type="number" value={functionOrder} onChange={(e) => setFunctionOrder(e.target.value)} min="1" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Function</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Select a function" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-name" className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Role Name</Label>
                  <Input id="role-name" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g., Senior Engineer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-description" className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Description — optional</Label>
                  <Textarea id="role-description" value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} placeholder="Short label or full name" />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/30">
            <Button variant="outline" onClick={() => { setAddOpen(false); resetFunctionForm(); resetRoleForm(); }}>
              Cancel
            </Button>
            <Button onClick={addType === 'function' ? handleAddFunction : handleAddRole}>
              {addType === 'function' ? 'Add Function' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Function Dialog */}
      <Dialog open={editFunctionOpen} onOpenChange={setEditFunctionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Function</DialogTitle>
            <DialogDescription>Update function details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-function-name">Name</Label>
              <Input id="edit-function-name" value={functionName} onChange={(e) => setFunctionName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-function-description">Description</Label>
              <Textarea id="edit-function-description" value={functionDescription} onChange={(e) => setFunctionDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-function-order">Display Order</Label>
              <Input id="edit-function-order" type="number" value={functionOrder} onChange={(e) => setFunctionOrder(e.target.value)} min="1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditFunctionOpen(false); resetFunctionForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateFunction}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-category">Function</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a function" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-description">Description</Label>
              <Textarea
                id="edit-role-description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditRoleOpen(false); resetRoleForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FunctionsRolesManagement;
