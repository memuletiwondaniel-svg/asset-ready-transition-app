import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Upload, Download, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronRight, FileText, Users, Shield, Cog, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useChecklistItems, useUploadChecklist, useChecklistUploads } from '@/hooks/useChecklistItems';
import { toast } from 'sonner';

interface ChecklistManagementPageProps {
  onBack: () => void;
}

const ChecklistManagementPage: React.FC<ChecklistManagementPageProps> = ({ onBack }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const { data: checklistItems, isLoading: itemsLoading } = useChecklistItems();
  const { data: uploads, isLoading: uploadsLoading } = useChecklistUploads();
  const uploadMutation = useUploadChecklist();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/tab-separated-values'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv') && !file.name.endsWith('.tsv')) {
        toast.error('Please select a valid Excel, CSV, or TSV file');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress(20);
      
      const result = await uploadMutation.mutateAsync(selectedFile);
      
      setUploadProgress(100);
      
      toast.success(
        `Upload completed: ${result.added} added, ${result.updated} updated, ${result.failed} failed`
      );
      
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Reset file input
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
      
    } catch (error) {
      setUploadProgress(0);
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const downloadTemplate = () => {
    const headers = ['ID', 'Description', 'Category', 'Topic', 'Supporting Evidence', 'Responsible Party', 'Approving Authority'];
    const sampleData = [
      'X01\tHave all Priority 1 actions from the PSSR walkdown been closed out?\tGeneral\tPSSR Walkdown\t\tProject Engr\tTA2, ORA, Dep Plant Dir.',
      'A01\tHave all Safety Critical Elements (SCEs) been identified?\tHardware Integrity\tSCE\tTIV report\tCommissioning Lead\tTA2'
    ];
    
    const content = [headers.join('\t'), ...sampleData].join('\n');
    const blob = new Blob([content], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'checklist-template.tsv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'COMPLETED_WITH_ERRORS':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />With Errors</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
    }
  };

  const categoryStats = checklistItems?.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Initialize category order when data loads
  React.useEffect(() => {
    if (categoryStats && categoryOrder.length === 0) {
      setCategoryOrder(Object.keys(categoryStats));
    }
  }, [categoryStats, categoryOrder.length]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setCategoryOrder((items) => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General':
        return <FileText className="h-4 w-4" />;
      case 'Technical Integrity':
        return <Cog className="h-4 w-4" />;
      case 'Start-Up Readiness':
        return <Shield className="h-4 w-4" />;
      case 'Health & Safety':
        return <Shield className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getItemsByCategory = (category: string) => {
    return checklistItems?.filter(item => item.category === category) || [];
  };

  // Draggable Category Component
  const DraggableCategory = ({ category, count }: { category: string; count: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: category });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const categoryItems = getItemsByCategory(category);

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? 'opacity-50 scale-105 z-50' : ''} transition-all duration-200`}
        {...attributes}
      >
        <AccordionItem value={category} className="border-0">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white via-white to-slate-50/50 border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1">
            {/* Fluent Design Acrylic Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Reveal Effect on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            
            {/* Category Header */}
            <AccordionTrigger className="hover:no-underline px-6 py-5 relative z-10 group-hover:bg-white/30 transition-all duration-300">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  {/* Drag Handle */}
                  <div 
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-gray-100/80 transition-colors duration-200 group-hover:bg-white/50"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                  </div>
                  
                  <div className="relative">
                    {/* Icon Background with Glow Effect */}
                    <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl flex items-center justify-center border border-blue-200/50 group-hover:border-blue-300/70 group-hover:shadow-lg transition-all duration-300">
                      {getCategoryIcon(category)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors duration-300">
                      {category}
                    </h4>
                    <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                      {count} checklist items
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge 
                    variant="secondary" 
                    className="bg-blue-50/80 text-blue-700 border border-blue-200/50 group-hover:bg-blue-100/80 group-hover:border-blue-300/60 transition-all duration-300"
                  >
                    {count} items
                  </Badge>
                  {/* Custom Chevron with Animation */}
                  <div className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-300">
                    <ChevronDown className="w-5 h-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            
            {/* Accordion Content */}
            <AccordionContent className="px-6 pb-6 relative z-10">
              <div className="space-y-4 animate-fade-in">
                {categoryItems.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No items in this category</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {categoryItems.map((item, index) => (
                      <Card 
                        key={item.id} 
                        className="group/item relative overflow-hidden bg-gradient-to-br from-white via-slate-50/30 to-white border border-gray-100 hover:border-blue-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.01] animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Left Accent Border */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 group-hover/item:w-2 transition-all duration-300"></div>
                        
                        {/* Item Content */}
                        <div className="p-5 ml-2 relative">
                          {/* Hover Reveal Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/30 to-transparent translate-x-[-100%] group-hover/item:translate-x-[100%] transition-transform duration-700"></div>
                          
                          <div className="space-y-3 relative z-10">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center border border-blue-200/50">
                                  <span className="text-xs font-bold text-blue-700">{item.id}</span>
                                </div>
                                <Badge 
                                  variant={item.is_active ? "default" : "secondary"} 
                                  className={`text-xs ${item.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                                >
                                  {item.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Description */}
                            <p className="text-sm text-gray-700 leading-relaxed group-hover/item:text-gray-800 transition-colors duration-300">
                              {item.description}
                            </p>
                            
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              {item.topic && (
                                <div className="flex items-start space-x-2">
                                  <div className="w-4 h-4 mt-0.5 bg-blue-100 rounded flex items-center justify-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Topic</span>
                                    <p className="text-xs text-gray-700">{item.topic}</p>
                                  </div>
                                </div>
                              )}
                              
                              {item.supporting_evidence && (
                                <div className="flex items-start space-x-2">
                                  <div className="w-4 h-4 mt-0.5 bg-purple-100 rounded flex items-center justify-center">
                                    <FileText className="w-2.5 h-2.5 text-purple-600" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Evidence</span>
                                    <p className="text-xs text-gray-700">{item.supporting_evidence}</p>
                                  </div>
                                </div>
                              )}
                              
                              {item.responsible_party && (
                                <div className="flex items-start space-x-2">
                                  <div className="w-4 h-4 mt-0.5 bg-orange-100 rounded flex items-center justify-center">
                                    <Users className="w-2.5 h-2.5 text-orange-600" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Responsible</span>
                                    <p className="text-xs text-gray-700">{item.responsible_party}</p>
                                  </div>
                                </div>
                              )}
                              
                              {item.approving_authority && (
                                <div className="flex items-start space-x-2">
                                  <div className="w-4 h-4 mt-0.5 bg-green-100 rounded flex items-center justify-center">
                                    <CheckCircle className="w-2.5 h-2.5 text-green-600" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Approvers</span>
                                    <p className="text-xs text-gray-700">{item.approving_authority}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Footer */}
                            {item.created_at && (
                              <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-gray-100 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    Created {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </div>
        </AccordionItem>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Checklist Management</h1>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload Excel</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Checklist Excel File
              </CardTitle>
              <CardDescription>
                Upload an Excel file to update the PSSR checklist items. The file should contain columns for ID, Description, Category, Topic, Supporting Evidence, Responsible Party, and Approving Authority.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>File Format Requirements:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Excel (.xlsx, .xls), CSV, or TSV file format</li>
                    <li>First row must contain headers</li>
                    <li>Required columns: ID, Description, Category</li>
                    <li>Optional columns: Topic, Supporting Evidence, Responsible Party, Approving Authority</li>
                    <li>Use tab-separated values for best compatibility</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="file-input">Select File</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  onChange={handleFileSelect}
                />
              </div>

              {selectedFile && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Selected:</strong> {selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}

              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Checklist Overview</CardTitle>
              <CardDescription>
                Current checklist items in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <p>Loading...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="text-2xl font-bold">{checklistItems?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Items</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-2xl font-bold">{Object.keys(categoryStats || {}).length}</div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </Card>
                  </div>

                  {categoryStats && categoryOrder.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Categories & Items</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <GripVertical className="w-4 h-4" />
                          <span>Drag to reorder categories</span>
                        </div>
                      </div>
                      
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={categoryOrder}
                          strategy={verticalListSortingStrategy}
                        >
                          <Accordion type="multiple" className="w-full space-y-4">
                            {categoryOrder.map((category) => {
                              const count = categoryStats[category] || 0;
                              return (
                                <DraggableCategory 
                                  key={category} 
                                  category={category} 
                                  count={count} 
                                />
                              );
                            })}
                          </Accordion>
                        </SortableContext>
                        
                        <DragOverlay>
                          {activeDragId ? (
                            <div className="opacity-90 rotate-3 scale-105">
                              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white via-white to-slate-50/50 border border-blue-300 shadow-xl">
                                <div className="px-6 py-5">
                                  <div className="flex items-center space-x-4">
                                    <GripVertical className="w-4 h-4 text-blue-600" />
                                    <div className="relative">
                                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-blue-300">
                                        {getCategoryIcon(activeDragId)}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <h4 className="font-semibold text-gray-900">
                                        {activeDragId}
                                      </h4>
                                      <p className="text-sm text-gray-500">
                                        {categoryStats[activeDragId]} checklist items
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>
                Previous checklist file uploads and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadsLoading ? (
                <p>Loading...</p>
              ) : uploads?.length === 0 ? (
                <p className="text-muted-foreground">No uploads yet</p>
              ) : (
                <div className="space-y-4">
                  {uploads?.map((upload) => (
                    <Card key={upload.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-medium">{upload.filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(upload.uploaded_at).toLocaleString()}
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span>Processed: {upload.items_processed}</span>
                            <span className="text-green-600">Added: {upload.items_added}</span>
                            <span className="text-blue-600">Updated: {upload.items_updated}</span>
                            {upload.items_failed > 0 && (
                              <span className="text-red-600">Failed: {upload.items_failed}</span>
                            )}
                          </div>
                          {upload.error_log && (
                            <details className="mt-2">
                              <summary className="text-sm text-red-600 cursor-pointer">View Errors</summary>
                              <pre className="text-xs bg-red-50 p-2 rounded mt-1 whitespace-pre-wrap">
                                {upload.error_log}
                              </pre>
                            </details>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(upload.upload_status)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChecklistManagementPage;