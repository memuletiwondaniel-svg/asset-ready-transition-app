import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Search, ChevronDown, ChevronRight, Users, Briefcase, Wrench, Shield, Building2 } from 'lucide-react';
import { useCategorizedRoles, useRoleCategories, useAddRole, useAddRoleCategory } from '@/hooks/useCategorizedRoles';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const categoryIcons: Record<string, React.ReactNode> = {
  'Project': <Briefcase className="h-5 w-5" />,
  'Engineering': <Wrench className="h-5 w-5" />,
  'Operations': <Building2 className="h-5 w-5" />,
  'Safety': <Shield className="h-5 w-5" />,
};

const categoryColors: Record<string, string> = {
  'Project': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Engineering': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Operations': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Safety': 'bg-red-500/10 text-red-600 border-red-500/20',
};

export const RolesManagement: React.FC = () => {
  const { data: groupedRoles, isLoading } = useCategorizedRoles();
  const { data: categories } = useRoleCategories();
  const { addRole } = useAddRole();
  const { addCategory } = useAddRoleCategory();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const filteredGroupedRoles = groupedRoles?.map(group => ({
    ...group,
    roles: group.roles.filter(role =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(group => 
    searchQuery === '' || group.roles.length > 0 || group.category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !selectedCategoryId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addRole(newRoleName.trim(), newRoleDescription.trim(), selectedCategoryId);
      toast({
        title: "Role Added",
        description: `"${newRoleName}" has been added successfully.`,
      });
      setIsAddRoleOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedCategoryId('');
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: "Error",
        description: "Failed to add role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const displayOrder = (categories?.length || 0) + 1;
      await addCategory(newCategoryName.trim(), newCategoryDescription.trim(), displayOrder);
      toast({
        title: "Category Added",
        description: `"${newCategoryName}" category has been added successfully.`,
      });
      setIsAddCategoryOpen(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      queryClient.invalidateQueries({ queryKey: ['role-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const totalRoles = groupedRoles?.reduce((acc, group) => acc + group.roles.length, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Roles & Categories</h2>
          <p className="text-muted-foreground">
            {categories?.length || 0} categories, {totalRoles} roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddCategoryOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={() => setIsAddRoleOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories with Roles */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredGroupedRoles?.map((group) => {
            const isExpanded = expandedCategories[group.category.id] ?? true;
            const colorClass = categoryColors[group.category.name] || 'bg-muted text-muted-foreground border-border';
            const icon = categoryIcons[group.category.name] || <Users className="h-5 w-5" />;

            return (
              <Card key={group.category.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(group.category.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className={`cursor-pointer transition-colors hover:bg-muted/50 ${colorClass} border-b`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {icon}
                          <div>
                            <CardTitle className="text-lg">{group.category.name}</CardTitle>
                            <p className="text-sm opacity-80">{group.roles.length} roles</p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      {group.roles.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          No roles in this category
                        </div>
                      ) : (
                        <div className="divide-y">
                          {group.roles.map((role) => (
                            <div
                              key={role.id}
                              className="px-6 py-4 hover:bg-muted/30 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium">{role.name}</p>
                                {role.description && (
                                  <p className="text-sm text-muted-foreground">{role.description}</p>
                                )}
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
        </div>
      )}

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Enter role name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Input
                id="roleDescription"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Enter role description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole}>Add Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Description</Label>
              <Input
                id="categoryDescription"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Enter category description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesManagement;
