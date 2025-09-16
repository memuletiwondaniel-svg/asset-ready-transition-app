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
  BookOpen,
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
import { useChecklistTopics, useCreateChecklistTopic, useUpdateChecklistTopic, useDeleteChecklistTopic, ChecklistTopic } from '@/hooks/useChecklistTopics';
import { useToast } from '@/hooks/use-toast';

interface ChecklistTopicsManagementProps {
  onBack: () => void;
}

interface TopicFormData {
  name: string;
  description: string;
  display_order?: number;
}

const ChecklistTopicsManagement: React.FC<ChecklistTopicsManagementProps> = ({ onBack }) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ChecklistTopic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<TopicFormData>({
    name: '',
    description: '',
  });

  const { toast } = useToast();
  const { data: topics = [], isLoading } = useChecklistTopics();
  const { mutate: createTopic, isPending: isCreating } = useCreateChecklistTopic();
  const { mutate: updateTopic, isPending: isUpdating } = useUpdateChecklistTopic();
  const { mutate: deleteTopic, isPending: isDeleting } = useDeleteChecklistTopic();

  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
  };

  const handleCreateTopic = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Topic name is required.",
        variant: "destructive"
      });
      return;
    }

    createTopic(
      {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        display_order: topics.length + 1,
      },
      {
        onSuccess: () => {
          toast({
            title: "Topic Created",
            description: `"${formData.name}" has been added successfully.`
          });
          setShowCreateDialog(false);
          resetForm();
        },
        onError: (error: any) => {
          console.error('Failed to create topic:', error);
          toast({
            title: "Failed to create topic",
            description: error?.message || "Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleEditTopic = () => {
    if (!selectedTopic || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Topic name is required.",
        variant: "destructive"
      });
      return;
    }

    updateTopic(
      {
        id: selectedTopic.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Topic Updated",
            description: `"${formData.name}" has been updated successfully.`
          });
          setShowEditDialog(false);
          setSelectedTopic(null);
          resetForm();
        },
        onError: (error: any) => {
          console.error('Failed to update topic:', error);
          toast({
            title: "Failed to update topic",
            description: error?.message || "Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleDeleteTopic = () => {
    if (!selectedTopic) return;

    deleteTopic(selectedTopic.id, {
      onSuccess: () => {
        toast({
          title: "Topic Deleted",
          description: `"${selectedTopic.name}" has been deleted successfully.`
        });
        setShowDeleteDialog(false);
        setSelectedTopic(null);
      },
      onError: (error: any) => {
        console.error('Failed to delete topic:', error);
        toast({
          title: "Failed to delete topic",
          description: error?.message || "Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const openEditDialog = (topic: ChecklistTopic) => {
    setSelectedTopic(topic);
    setFormData({
      name: topic.name,
      description: topic.description || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (topic: ChecklistTopic) => {
    setSelectedTopic(topic);
    setShowDeleteDialog(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading topics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-16 items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="h-10 px-4 py-2 rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-accent/50 hover:border-border transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] font-medium text-foreground/90 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to Categories
            </Button>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="transition-all duration-300 hover:scale-110 hover:drop-shadow-lg">
              <img 
                src="/images/orsh-logo.png" 
                alt="ORSH Logo" 
                className="h-12 w-auto filter drop-shadow-sm" 
              />
            </div>
          </div>
          <div className="w-40"></div> {/* Spacer to center the logo */}
        </div>
      </div>

      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Checklist Topics Management
              </h2>
              <p className="text-muted-foreground mt-2">
                Define and manage topics for categorizing and organizing checklists
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="h-10">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Topic
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Create New Topic
                  </DialogTitle>
                  <DialogDescription>
                    Add a new topic to organize your checklist items
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="topic-name">Topic Name *</Label>
                    <Input
                      id="topic-name"
                      placeholder="e.g., PSSR Walkdown"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="topic-description">Description</Label>
                    <Textarea
                      id="topic-description"
                      placeholder="Describe what this topic covers..."
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
                  <Button onClick={handleCreateTopic} disabled={isCreating}>
                    {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Topic
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Badge variant="secondary" className="text-sm">
                {topics.length} Topics
              </Badge>
            </div>
          </div>
        </div>

        {/* Topics Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Topics</CardTitle>
            <CardDescription>
              Manage and organize your checklist topics
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
                  {filteredTopics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No topics found matching your search." : "No topics available."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTopics.map((topic) => (
                      <TableRow key={topic.id}>
                        <TableCell className="font-medium">{topic.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {topic.description || "No description"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{topic.display_order || "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={topic.is_active ? "default" : "secondary"}
                            className={topic.is_active ? "bg-green-50 text-green-700 border-green-200" : ""}
                          >
                            {topic.is_active ? "Active" : "Inactive"}
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
                              <DropdownMenuItem onClick={() => openEditDialog(topic)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(topic)}
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit Topic
            </DialogTitle>
            <DialogDescription>
              Update the topic information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-topic-name">Topic Name *</Label>
              <Input
                id="edit-topic-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-topic-description">Description</Label>
              <Textarea
                id="edit-topic-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setSelectedTopic(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditTopic} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTopic?.name}"? This action cannot be undone
              and will affect any checklist items associated with this topic.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setSelectedTopic(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTopic}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Topic
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChecklistTopicsManagement;