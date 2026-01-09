import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  GraduationCap, Building, Clock, DollarSign, Calendar, Users,
  FileText, CheckCircle2, AlertCircle, Upload, X, Plus,
  ClipboardCheck, Package, Play, ClipboardPaste, Trash2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { ORATrainingItem, ORATrainingMaterial } from '@/hooks/useORATrainingPlan';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Mail } from 'lucide-react';

interface ORATrainingItemDetailsProps {
  item: ORATrainingItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateItem: (data: { itemId: string; updates: Partial<ORATrainingItem> }) => void;
  planStatus: string;
}

const EXECUTION_STAGES = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'bg-slate-500', icon: Clock },
  { value: 'MATERIALS_REQUESTED', label: 'Materials Requested', color: 'bg-blue-500', icon: Package },
  { value: 'MATERIALS_UNDER_REVIEW', label: 'Under TA Review', color: 'bg-amber-500', icon: ClipboardCheck },
  { value: 'MATERIALS_APPROVED', label: 'Materials Approved', color: 'bg-green-500', icon: CheckCircle2 },
  { value: 'PO_ISSUED', label: 'PO Issued', color: 'bg-purple-500', icon: FileText },
  { value: 'TRAINEES_IDENTIFIED', label: 'Trainees Identified', color: 'bg-indigo-500', icon: Users },
  { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-cyan-500', icon: Calendar },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-orange-500', icon: Play },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500', icon: CheckCircle2 }
];

export const ORATrainingItemDetails: React.FC<ORATrainingItemDetailsProps> = ({
  item,
  open,
  onOpenChange,
  onUpdateItem,
  planStatus
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allUsers } = useProfileUsers();
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [materials, setMaterials] = useState<ORATrainingMaterial[]>(item.materials || []);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [selectedTAIds, setSelectedTAIds] = useState<string[]>([]);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  
  // New trainee form state
  const [newTraineeName, setNewTraineeName] = useState('');
  const [newTraineeRole, setNewTraineeRole] = useState('');
  const [newTraineeStaffId, setNewTraineeStaffId] = useState('');

  // Filter users who can be TAs (those with TA-related positions/roles)
  const taUsers = allUsers?.filter(u => 
    u.position?.toLowerCase().includes('ta') || 
    u.position?.toLowerCase().includes('technical') ||
    u.role?.toLowerCase().includes('ta') ||
    u.role?.toLowerCase().includes('technical') ||
    u.role?.toLowerCase().includes('approver')
  ) || allUsers || [];

  const selectedTAs = taUsers.filter(u => selectedTAIds.includes(u.user_id));

  const handleTAToggle = (userId: string) => {
    setSelectedTAIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRequestApproval = async () => {
    if (selectedTAIds.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one TA reviewer', variant: 'destructive' });
      return;
    }

    setIsRequestingApproval(true);
    try {
      // Update the training item with the TA reviewer
      onUpdateItem({ 
        itemId: item.id, 
        updates: { 
          execution_stage: 'MATERIALS_UNDER_REVIEW',
          ta_reviewer_id: selectedTAIds[0] // Primary reviewer
        } 
      });

      toast({ 
        title: 'Approval Requested', 
        description: `Approval request sent to ${selectedTAs.length} TA reviewer(s)` 
      });
      setSelectedTAIds([]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsRequestingApproval(false);
    }
  };

  const stageInfo = EXECUTION_STAGES.find(s => s.value === item.execution_stage) || EXECUTION_STAGES[0];
  const currentStageIndex = EXECUTION_STAGES.findIndex(s => s.value === item.execution_stage);

  // Parse trainees - they're stored as "Name|Role|StaffId" strings for backward compatibility
  const parseTrainee = (trainee: string) => {
    const parts = trainee.split('|');
    return {
      name: parts[0] || '',
      role: parts[1] || '',
      staffId: parts[2] || ''
    };
  };

  const formatTrainee = (name: string, role: string, staffId: string) => {
    return `${name}|${role}|${staffId}`;
  };

  const handleAddTrainee = () => {
    if (!newTraineeName.trim()) return;
    const traineeString = formatTrainee(newTraineeName.trim(), newTraineeRole.trim(), newTraineeStaffId.trim());
    const updatedTrainees = [...(item.trainees || []), traineeString];
    onUpdateItem({ itemId: item.id, updates: { trainees: updatedTrainees } });
    setNewTraineeName('');
    setNewTraineeRole('');
    setNewTraineeStaffId('');
  };

  const handleRemoveTrainee = (index: number) => {
    const updatedTrainees = (item.trainees || []).filter((_, i) => i !== index);
    onUpdateItem({ itemId: item.id, updates: { trainees: updatedTrainees } });
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      const newTrainees = jsonData.map(row => {
        const name = row['Name'] || row['name'] || row['NAME'] || '';
        const role = row['Role'] || row['role'] || row['ROLE'] || row['Position'] || row['position'] || '';
        const staffId = row['Staff ID'] || row['StaffID'] || row['staff_id'] || row['ID'] || row['id'] || '';
        return formatTrainee(name, role, staffId);
      }).filter(t => parseTrainee(t).name);

      const updatedTrainees = [...(item.trainees || []), ...newTrainees];
      onUpdateItem({ itemId: item.id, updates: { trainees: updatedTrainees } });
      toast({ title: 'Success', description: `Added ${newTrainees.length} trainees from Excel` });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to parse Excel file', variant: 'destructive' });
    }
    e.target.value = '';
  };

  const handlePasteImport = () => {
    if (!pasteContent.trim()) return;

    const lines = pasteContent.trim().split('\n');
    const newTrainees = lines.map(line => {
      const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
      const name = parts[0]?.trim() || '';
      const role = parts[1]?.trim() || '';
      const staffId = parts[2]?.trim() || '';
      return formatTrainee(name, role, staffId);
    }).filter(t => parseTrainee(t).name);

    if (newTrainees.length > 0) {
      const updatedTrainees = [...(item.trainees || []), ...newTrainees];
      onUpdateItem({ itemId: item.id, updates: { trainees: updatedTrainees } });
      toast({ title: 'Success', description: `Added ${newTrainees.length} trainees` });
      setPasteContent('');
      setShowPasteInput(false);
    }
  };

  const handleAdvanceStage = () => {
    if (currentStageIndex < EXECUTION_STAGES.length - 1) {
      const nextStage = EXECUTION_STAGES[currentStageIndex + 1].value as ORATrainingItem['execution_stage'];
      onUpdateItem({ itemId: item.id, updates: { execution_stage: nextStage } });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const filePath = `training-materials/${item.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('training-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('ora_training_materials')
        .insert({
          training_item_id: item.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          material_type: 'DOCUMENT',
          uploaded_by: user.user.id
        });

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'Material uploaded successfully' });
      queryClient.invalidateQueries({ queryKey: ['ora-training-plans'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{item.title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">{item.training_provider || 'No provider specified'}</p>
              </div>
            </div>
            <Badge className={`${stageInfo.color} text-white`}>
              {stageInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start flex-shrink-0">
            <TabsTrigger value="details" className="gap-2">
              <FileText className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="attendees" className="gap-2">
              <Users className="w-4 h-4" />
              Attendees ({item.trainees?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-2">
              <Package className="w-4 h-4" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Status & Approvals
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[calc(85vh-180px)]">
              <div className="pr-4">
              <TabsContent value="details" className="m-0 space-y-4" forceMount={activeTab === 'details' ? true : undefined} hidden={activeTab !== 'details'}>
              {/* Overview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{item.overview || 'No overview provided'}</p>
                </CardContent>
              </Card>

              {/* Detailed Description */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Detailed Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{item.detailed_description || 'No detailed description provided'}</p>
                </CardContent>
              </Card>

              {/* Justification */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Justification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{item.justification || 'No justification provided'}</p>
                </CardContent>
              </Card>

              {/* Key Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Training Provider</p>
                        <p className="font-medium">{item.training_provider || 'Not specified'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-medium">{item.duration_hours ? `${item.duration_hours} hours` : 'Not specified'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated Cost</p>
                        <p className="font-medium">${item.estimated_cost?.toLocaleString() || '0'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Scheduled Date</p>
                        <p className="font-medium">
                          {item.scheduled_date 
                            ? format(new Date(item.scheduled_date), 'MMM d, yyyy')
                            : item.tentative_date 
                              ? `${format(new Date(item.tentative_date), 'MMM d, yyyy')} (Tentative)`
                              : 'Not scheduled'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Target Audience */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Target Audience</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {item.target_audience?.length > 0 ? (
                      item.target_audience.map((audience, idx) => (
                        <Badge key={idx} variant="secondary">{audience}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No target audience specified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendees" className="m-0 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Training Attendees</CardTitle>
                    <div className="flex gap-2">
                      <Label className="cursor-pointer">
                        <Input
                          type="file"
                          className="hidden"
                          onChange={handleExcelUpload}
                          accept=".xlsx,.xls,.csv"
                        />
                        <Button variant="outline" size="sm" className="gap-2" asChild>
                          <span>
                            <Upload className="w-4 h-4" />
                            Import Excel
                          </span>
                        </Button>
                      </Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setShowPasteInput(!showPasteInput)}
                      >
                        <ClipboardPaste className="w-4 h-4" />
                        Paste Data
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Paste Input Area */}
                  {showPasteInput && (
                    <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        Paste data with columns: Name, Role, Staff ID (tab or comma separated)
                      </p>
                      <Textarea
                        placeholder="John Doe&#9;Engineer&#9;EMP001&#10;Jane Smith&#9;Operator&#9;EMP002"
                        value={pasteContent}
                        onChange={(e) => setPasteContent(e.target.value)}
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handlePasteImport}>Import</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowPasteInput(false); setPasteContent(''); }}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Add Trainee Form */}
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Name"
                      value={newTraineeName}
                      onChange={(e) => setNewTraineeName(e.target.value)}
                    />
                    <Input
                      placeholder="Role"
                      value={newTraineeRole}
                      onChange={(e) => setNewTraineeRole(e.target.value)}
                    />
                    <Input
                      placeholder="Staff ID"
                      value={newTraineeStaffId}
                      onChange={(e) => setNewTraineeStaffId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTrainee()}
                    />
                    <Button onClick={handleAddTrainee} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>

                  {/* Trainees Table */}
                  {item.trainees?.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">S/N</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Staff ID</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {item.trainees.map((trainee, idx) => {
                            const parsed = parseTrainee(trainee);
                            return (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{idx + 1}</TableCell>
                                <TableCell>{parsed.name}</TableCell>
                                <TableCell>{parsed.role || '-'}</TableCell>
                                <TableCell>{parsed.staffId || '-'}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleRemoveTrainee(idx)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No trainees added yet</p>
                      <p className="text-sm">Add trainees manually, import from Excel, or paste data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials" className="m-0 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Training Materials</CardTitle>
                    <Label className="cursor-pointer">
                      <Input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                      />
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <span>
                          <Upload className="w-4 h-4" />
                          Upload Material
                        </span>
                      </Button>
                    </Label>
                  </div>
                </CardHeader>
                <CardContent>
                  {materials?.length > 0 ? (
                    <div className="space-y-2">
                      {materials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{material.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {material.file_size ? `${(material.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {material.is_approved ? (
                              <Badge className="bg-green-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Review
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No materials uploaded yet</p>
                      <p className="text-sm">Upload training materials for review</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* TA Reviewer Selection */}
              {materials?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Select Asset TA Reviewer(s)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* TA Selection List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {taUsers.length > 0 ? (
                        taUsers.map((user) => (
                          <div 
                            key={user.user_id} 
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedTAIds.includes(user.user_id) 
                                ? 'border-primary bg-primary/5' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleTAToggle(user.user_id)}
                          >
                            <Checkbox 
                              checked={selectedTAIds.includes(user.user_id)}
                              onCheckedChange={() => handleTAToggle(user.user_id)}
                            />
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url} alt={user.full_name} />
                              <AvatarFallback>{user.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground">{user.position || user.role}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No TA users found</p>
                      )}
                    </div>

                    {/* Selected TAs Display */}
                    {selectedTAs.length > 0 && (
                      <div className="space-y-3 pt-3 border-t">
                        <p className="text-sm font-medium">Selected Reviewers ({selectedTAs.length})</p>
                        <div className="space-y-2">
                          {selectedTAs.map((ta) => (
                            <div key={ta.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={ta.avatar_url} alt={ta.full_name} />
                                <AvatarFallback>{ta.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">{ta.full_name}</p>
                                <p className="text-sm text-muted-foreground">{ta.position || ta.role}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {ta.user_id.substring(0, 8)}...@company.com
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleTAToggle(ta.user_id); }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Request Approval Button */}
                        <Button 
                          className="w-full gap-2" 
                          onClick={handleRequestApproval}
                          disabled={isRequestingApproval}
                        >
                          <Send className="w-4 h-4" />
                          {isRequestingApproval ? 'Sending...' : `Request Approval from ${selectedTAs.length} TA(s)`}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="status" className="m-0 space-y-4">
              {/* Execution Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Execution Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {EXECUTION_STAGES.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const StageIcon = stage.icon;
                      
                      return (
                        <div 
                          key={stage.value}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            isCurrent ? 'bg-primary/10 border border-primary/30' :
                            isCompleted ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/30'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isCurrent ? `${stage.color} text-white` : 'bg-muted'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <StageIcon className="w-4 h-4" />
                            )}
                          </div>
                          <span className={`font-medium ${
                            isCompleted ? 'text-green-700 dark:text-green-300' :
                            isCurrent ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {stage.label}
                          </span>
                          {isCurrent && (
                            <Badge variant="outline" className="ml-auto">Current</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {planStatus === 'APPROVED' && item.execution_stage !== 'COMPLETED' && (
                    <Button 
                      className="w-full mt-4 gap-2" 
                      onClick={handleAdvanceStage}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Advance to Next Stage
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* TA Approval Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">TA Review Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {item.ta_approval_date ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">Materials Approved</p>
                        <p className="text-sm text-muted-foreground">
                          Approved on {format(new Date(item.ta_approval_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-700 dark:text-amber-300">Pending TA Review</p>
                        <p className="text-sm text-muted-foreground">
                          Materials have not been reviewed by Technical Authority yet
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PO Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Purchase Order</CardTitle>
                </CardHeader>
                <CardContent>
                  {item.po_number ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="text-sm text-muted-foreground">PO Number</span>
                        <span className="font-medium">{item.po_number}</span>
                      </div>
                      {item.po_issued_date && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-sm text-muted-foreground">Issue Date</span>
                          <span className="font-medium">{format(new Date(item.po_issued_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No PO issued yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
