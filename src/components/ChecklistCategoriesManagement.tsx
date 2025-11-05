import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  Loader2, 
  Search,
  Tag,
  MoreVertical 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useChecklistCategories, useCreateChecklistCategory, useUpdateChecklistCategory, useDeleteChecklistCategory, ChecklistCategory } from '@/hooks/useChecklistCategories';
import { useToast } from '@/hooks/use-toast';

interface ChecklistCategoriesManagementProps {
  onBack: () => void;
  translations?: any;
}

interface CategoryFormData {
  name: string;
  description: string;
  display_order?: number;
}

const ChecklistCategoriesManagement: React.FC<ChecklistCategoriesManagementProps> = ({ onBack, translations }) => {
  const t = translations || {
    search: 'Search',
    categories: 'Categories',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    save: 'Save',
    cancel: 'Cancel',
    create: 'Create',
    add: 'Add',
    name: 'Name'
  };
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ChecklistCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
  });

  const { toast } = useToast();
  const { data: categories = [], isLoading } = useChecklistCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateChecklistCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateChecklistCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteChecklistCategory();

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
  };

  const handleCreateCategory = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required.",
        variant: "destructive"
      });
      return;
    }

    createCategory(
      {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        display_order: categories.length + 1,
      },
      {
        onSuccess: () => {
          toast({
            title: "Category Created",
            description: `"${formData.name}" has been added successfully.`
          });
          setShowCreateDialog(false);
          resetForm();
        },
        onError: (error: any) => {
          console.error('Failed to create category:', error);
          toast({
            title: "Failed to create category",
            description: error?.message || "Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleEditCategory = () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required.",
        variant: "destructive"
      });
      return;
    }

    updateCategory(
      {
        id: selectedCategory.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Category Updated",
            description: `"${formData.name}" has been updated successfully.`
          });
          setShowEditDialog(false);
          setSelectedCategory(null);
          resetForm();
        },
        onError: (error: any) => {
          console.error('Failed to update category:', error);
          toast({
            title: "Failed to update category",
            description: error?.message || "Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleDeleteCategory = () => {
    if (!selectedCategory) return;

    deleteCategory(selectedCategory.id, {
      onSuccess: () => {
        toast({
          title: "Category Deleted",
          description: `"${selectedCategory.name}" has been deleted successfully.`
        });
        setShowDeleteDialog(false);
        setSelectedCategory(null);
      },
      onError: (error: any) => {
        console.error('Failed to delete category:', error);
        toast({
          title: "Failed to delete category",
          description: error?.message || "Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const openEditDialog = (category: ChecklistCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (category: ChecklistCategory) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading categories...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Categories</h3>
          <p className="text-muted-foreground mt-2">Organize checklist items into logical categories</p>
        </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="h-10">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Create New Category
                  </DialogTitle>
                  <DialogDescription>
                    Add a new category to organize your checklist items
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category-name">Category Name *</Label>
                    <Input
                      id="category-name"
                      placeholder="e.g., Process Safety"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category-description">Description</Label>
                    <Textarea
                      id="category-description"
                      placeholder="Describe what this category covers..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowCreateDialog(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCategory} disabled={isCreating}>
                    {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
      </div>

      {/* Search and Stats */}
      <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Badge variant="secondary" className="text-sm">
                {categories.length} Categories
              </Badge>
            </div>
        </div>
      </div>

      {/* Categories Table */}
      <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
            <CardDescription>
              Manage and organize your checklist categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No categories found matching your search." : "No categories available."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {category.description || "No description"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{category.display_order || "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={category.is_active ? "default" : "secondary"}
                            className={category.is_active ? "bg-green-50 text-green-700 border-green-200" : ""}
                          >
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(category)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit Category
            </DialogTitle>
            <DialogDescription>
              Update the category information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-category-name">Category Name *</Label>
              <Input
                id="edit-category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category-description">Description</Label>
              <Textarea
                id="edit-category-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setSelectedCategory(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? This action cannot be undone
              and will affect any checklist items associated with this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setSelectedCategory(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChecklistCategoriesManagement;