import React, { useState, useEffect } from 'react';
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
  ClipboardCheck, Package, Play, ClipboardPaste, Trash2, Edit2,
  Image, FileCheck, Download, Eye, Filter, Presentation, FileType2
} from 'lucide-react';
import { EvidenceUploadModal } from './EvidenceUploadModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { readExcelFile } from '@/utils/excelUtils';
import { ORATrainingItem, ORATrainingMaterial } from '@/hooks/useORATrainingPlan';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useQuery } from '@tanstack/react-query';
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
  
  // Mock training materials data with TA review info
  const mockMaterials: ORATrainingMaterial[] = [
    {
      id: 'mat-001',
      training_item_id: item.id,
      file_name: 'BGC_Compressor_Operations_Module1_Introduction.pptx',
      file_path: 'mock/compressor-intro.pptx',
      file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      file_size: 2458624,
      material_type: 'PRESENTATION',
      uploaded_by: 'user-001',
      is_approved: true,
      approved_by: 'Bart Den Hond, TA2 - PACO - Asset',
      approved_at: '2026-01-05T10:30:00Z',
      created_at: '2026-01-03T09:00:00Z'
    },
    {
      id: 'mat-002',
      training_item_id: item.id,
      file_name: 'BGC_Compressor_Safety_Procedures.pdf',
      file_path: 'mock/compressor-safety.pdf',
      file_type: 'application/pdf',
      file_size: 1845632,
      material_type: 'DOCUMENT',
      uploaded_by: 'user-001',
      is_approved: true,
      approved_by: 'TA2 - Rotating - Asset',
      approved_at: '2026-01-05T11:15:00Z',
      created_at: '2026-01-03T10:00:00Z'
    },
    {
      id: 'mat-003',
      training_item_id: item.id,
      file_name: 'BGC_Compressor_Startup_Shutdown_Procedures.pptx',
      file_path: 'mock/compressor-ops.pptx',
      file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      file_size: 4194304,
      material_type: 'PRESENTATION',
      uploaded_by: 'user-001',
      is_approved: true,
      approved_by: 'TA2 - Process - Asset',
      approved_at: '2026-01-06T09:00:00Z',
      created_at: '2026-01-04T08:00:00Z'
    },
    {
      id: 'mat-004',
      training_item_id: item.id,
      file_name: 'Compressor_Technical_Manual_Rev3.pdf',
      file_path: 'mock/compressor-manual.pdf',
      file_type: 'application/pdf',
      file_size: 8388608,
      material_type: 'DOCUMENT',
      uploaded_by: 'user-001',
      is_approved: true,
      approved_by: 'Ali Abdullah, TA2 - Static - Asset',
      approved_at: '2026-01-06T14:30:00Z',
      created_at: '2026-01-04T11:00:00Z'
    },
    {
      id: 'mat-005',
      training_item_id: item.id,
      file_name: 'Trainee_Assessment_Form_Template.docx',
      file_path: 'mock/assessment-form.docx',
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 524288,
      material_type: 'DOCUMENT',
      uploaded_by: 'user-001',
      is_approved: true,
      approved_by: 'Bart Den Hond, TA2 - PACO - Asset',
      approved_at: '2026-01-07T08:45:00Z',
      created_at: '2026-01-05T14:00:00Z'
    },
    {
      id: 'mat-006',
      training_item_id: item.id,
      file_name: 'BGC_Compressor_Troubleshooting_Guide.docx',
      file_path: 'mock/compressor-troubleshoot.docx',
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 1048576,
      material_type: 'DOCUMENT',
      uploaded_by: 'user-001',
      is_approved: false,
      approved_by: undefined,
      approved_at: undefined,
      created_at: '2026-01-07T10:00:00Z'
    }
  ];
  
  const [materials, setMaterials] = useState<ORATrainingMaterial[]>(
    item.materials?.length ? item.materials : mockMaterials
  );
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [selectedTAIds, setSelectedTAIds] = useState<string[]>([]);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  
  // New trainee form state
  const [newTraineeName, setNewTraineeName] = useState('');
  const [newTraineeRole, setNewTraineeRole] = useState('');
  const [newTraineeStaffId, setNewTraineeStaffId] = useState('');

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    item.scheduled_date ? new Date(item.scheduled_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    item.scheduled_end_date ? new Date(item.scheduled_end_date) : undefined
  );

  // Cost/PO editor state
  const [showCostEditor, setShowCostEditor] = useState(false);
  const [editedCost, setEditedCost] = useState<number>(item.estimated_cost || 0);
  const [editedPOStatus, setEditedPOStatus] = useState<'PENDING' | 'ISSUED'>(
    (item.po_status as 'PENDING' | 'ISSUED') || 'PENDING'
  );
  const [editedPONumber, setEditedPONumber] = useState(item.po_number || '');

  // Sync state when item changes
  useEffect(() => {
    setStartDate(item.scheduled_date ? new Date(item.scheduled_date) : undefined);
    setEndDate(item.scheduled_end_date ? new Date(item.scheduled_end_date) : undefined);
    setEditedCost(item.estimated_cost || 0);
    setEditedPOStatus((item.po_status as 'PENDING' | 'ISSUED') || 'PENDING');
    setEditedPONumber(item.po_number || '');
  }, [item]);

  // Evidence state
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [showEvidenceUploadModal, setShowEvidenceUploadModal] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<string | null>(null);

  // Fetch training evidence
  const { data: evidenceData, refetch: refetchEvidence } = useQuery({
    queryKey: ['training-evidence', item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ora_training_evidence')
        .select('*')
        .eq('training_item_id', item.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!item.id
  });

  const EVIDENCE_TYPES = [
    { value: 'attendance_sheet', label: 'Attendance Sheet', icon: FileCheck },
    { value: 'photo', label: 'Training Photo', icon: Image },
    { value: 'certificate', label: 'Certificate', icon: FileText },
    { value: 'other', label: 'Other Document', icon: FileText }
  ];

  // Filtered evidence based on selected type
  const filteredEvidence = evidenceFilter 
    ? evidenceData?.filter((e: any) => e.evidence_type === evidenceFilter)
    : evidenceData;

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

  // Handle saving dates
  const handleSaveDates = () => {
    onUpdateItem({
      itemId: item.id,
      updates: {
        scheduled_date: startDate?.toISOString().split('T')[0],
        scheduled_end_date: endDate?.toISOString().split('T')[0]
      }
    });
    setShowDatePicker(false);
    toast({ title: 'Dates Updated', description: 'Training dates have been saved' });
  };

  // Handle saving cost and PO status
  const handleSaveCostAndPO = () => {
    const updates: Partial<ORATrainingItem> = {
      estimated_cost: editedCost,
      po_status: editedPOStatus
    };
    
    if (editedPOStatus === 'ISSUED') {
      updates.po_number = editedPONumber;
      updates.po_issued_date = new Date().toISOString().split('T')[0];
    } else {
      updates.po_number = undefined;
      updates.po_issued_date = undefined;
    }
    
    onUpdateItem({ itemId: item.id, updates });
    setShowCostEditor(false);
    toast({ title: 'Cost Updated', description: 'Cost and PO status have been saved' });
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

  // Handle evidence upload from modal
  const handleEvidenceUpload = async (file: File, evidenceType: string, description: string) => {
    setIsUploadingEvidence(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const filePath = `${item.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('training-evidence')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('ora_training_evidence')
        .insert({
          training_item_id: item.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          evidence_type: evidenceType,
          description: description || null,
          uploaded_by: user.user.id
        });

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'Evidence uploaded successfully' });
      refetchEvidence();
      setShowEvidenceUploadModal(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  // Handle evidence deletion
  const handleDeleteEvidence = async (evidenceId: string, filePath: string) => {
    try {
      await supabase.storage.from('training-evidence').remove([filePath]);
      await supabase.from('ora_training_evidence').delete().eq('id', evidenceId);
      toast({ title: 'Success', description: 'Evidence deleted' });
      refetchEvidence();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Get public URL for evidence file
  const getEvidenceUrl = (filePath: string) => {
    // Handle mock files from public folder
    if (filePath.startsWith('mock/')) {
      return `/mock-evidence/${filePath.replace('mock/', '')}`;
    }
    const { data } = supabase.storage.from('training-evidence').getPublicUrl(filePath);
    return data.publicUrl;
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
            {item.execution_stage === 'COMPLETED' && (
              <TabsTrigger value="evidence" className="gap-2">
                <FileCheck className="w-4 h-4" />
                Evidence ({evidenceData?.length || 0})
              </TabsTrigger>
            )}
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
                {/* Estimated Cost Card - Interactive */}
                <Popover open={showCostEditor} onOpenChange={setShowCostEditor}>
                  <PopoverTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Estimated Cost</p>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">${item.estimated_cost?.toLocaleString() || '0'}</p>
                              <Badge variant={item.po_status === 'ISSUED' ? 'default' : 'secondary'} className="text-xs">
                                {item.po_status === 'ISSUED' ? 'PO Issued' : 'PO Pending'}
                              </Badge>
                            </div>
                          </div>
                          <Edit2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Estimated Cost ($)</Label>
                        <Input
                          type="number"
                          value={editedCost}
                          onChange={(e) => setEditedCost(parseFloat(e.target.value) || 0)}
                          placeholder="Enter cost"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PO Status</Label>
                        <RadioGroup 
                          value={editedPOStatus} 
                          onValueChange={(v) => setEditedPOStatus(v as 'PENDING' | 'ISSUED')}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="PENDING" id="po-pending" />
                            <Label htmlFor="po-pending" className="cursor-pointer">PO Pending</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ISSUED" id="po-issued" />
                            <Label htmlFor="po-issued" className="cursor-pointer">PO Issued</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      {editedPOStatus === 'ISSUED' && (
                        <div className="space-y-2">
                          <Label>PO Number (optional)</Label>
                          <Input
                            value={editedPONumber}
                            onChange={(e) => setEditedPONumber(e.target.value)}
                            placeholder="e.g., PO-2026-0001"
                          />
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowCostEditor(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveCostAndPO}>Save Changes</Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Scheduled Date Card - Interactive */}
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Scheduled Date</p>
                            <p className="font-medium">
                              {item.scheduled_date && item.scheduled_end_date
                                ? `${format(new Date(item.scheduled_date), 'MMM d')} - ${format(new Date(item.scheduled_end_date), 'MMM d, yyyy')}`
                                : item.scheduled_date 
                                  ? format(new Date(item.scheduled_date), 'MMM d, yyyy')
                                  : item.tentative_date 
                                    ? `${format(new Date(item.tentative_date), 'MMM d, yyyy')} (Tentative)`
                                    : 'Click to schedule'}
                            </p>
                          </div>
                          <Edit2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Start Date</Label>
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            className="rounded-md border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">End Date</Label>
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            disabled={(date) => startDate ? date < startDate : false}
                            className="rounded-md border"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => setShowDatePicker(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveDates}>Save Dates</Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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
                    <div>
                      <CardTitle className="text-base">Training Materials</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {materials.filter(m => m.is_approved).length} of {materials.length} materials approved by TA
                      </p>
                    </div>
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
                    <div className="space-y-3">
                      {materials.map((material) => {
                        const isPPT = material.file_type?.includes('presentation') || material.file_name.endsWith('.pptx') || material.file_name.endsWith('.ppt');
                        const isPDF = material.file_type?.includes('pdf') || material.file_name.endsWith('.pdf');
                        const isWord = material.file_type?.includes('wordprocessing') || material.file_name.endsWith('.docx') || material.file_name.endsWith('.doc');
                        
                        const getFileIcon = () => {
                          if (isPPT) return { bg: 'bg-orange-100 dark:bg-orange-950/30', color: 'text-orange-600', label: 'PowerPoint Presentation' };
                          if (isPDF) return { bg: 'bg-red-100 dark:bg-red-950/30', color: 'text-red-600', label: 'PDF Document' };
                          if (isWord) return { bg: 'bg-blue-100 dark:bg-blue-950/30', color: 'text-blue-600', label: 'Word Document' };
                          return { bg: 'bg-gray-100 dark:bg-gray-950/30', color: 'text-gray-600', label: 'Document' };
                        };
                        
                        const fileStyle = getFileIcon();
                        const FileIcon = isPPT ? Presentation : isPDF ? FileType2 : isWord ? FileText : FileText;
                        return (
                          <div key={material.id} className="p-4 rounded-lg border bg-card">
                            <div className="flex items-start gap-4">
                              {/* File Icon */}
                              <div className={`p-3 rounded-lg ${fileStyle.bg}`}>
                                <FileIcon className={`w-6 h-6 ${fileStyle.color}`} />
                              </div>
                              
                              {/* File Details */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{material.file_name}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>{material.file_size ? `${(material.file_size / (1024 * 1024)).toFixed(1)} MB` : 'Unknown size'}</span>
                                  <span>•</span>
                                  <span>{fileStyle.label}</span>
                                </div>
                                
                                {/* TA Review Status */}
                                <div className="mt-3 pt-3 border-t">
                                  {material.is_approved ? (
                                    <p className="text-sm text-muted-foreground">
                                      Approved by {material.approved_by}{material.approved_at ? `, ${format(new Date(material.approved_at), 'MMM d, yyyy')}` : ''}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-amber-600 dark:text-amber-400">
                                      Pending TA Review
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <div className="flex-shrink-0">
                                {material.is_approved ? (
                                  <Badge className="bg-green-500 text-white">
                                    Approved
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                    Pending
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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

            {/* Evidence Tab - Only for completed trainings */}
            {item.execution_stage === 'COMPLETED' && (
              <TabsContent value="evidence" className="m-0 space-y-4" forceMount={activeTab === 'evidence' ? true : undefined} hidden={activeTab !== 'evidence'}>
                {/* Filter and Upload Header */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filter Evidence
                      </CardTitle>
                      <Button 
                        className="gap-2"
                        onClick={() => setShowEvidenceUploadModal(true)}
                      >
                        <Upload className="w-4 h-4" />
                        Upload Evidence
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {/* All filter */}
                      <Button
                        variant={evidenceFilter === null ? 'default' : 'outline'}
                        size="sm"
                        className="gap-2"
                        onClick={() => setEvidenceFilter(null)}
                      >
                        All
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                          {evidenceData?.length || 0}
                        </Badge>
                      </Button>
                      {/* Type filters */}
                      {EVIDENCE_TYPES.map((type) => {
                        const Icon = type.icon;
                        const count = evidenceData?.filter((e: any) => e.evidence_type === type.value).length || 0;
                        return (
                          <Button
                            key={type.value}
                            variant={evidenceFilter === type.value ? 'default' : 'outline'}
                            size="sm"
                            className="gap-2"
                            onClick={() => setEvidenceFilter(type.value)}
                          >
                            <Icon className="w-4 h-4" />
                            {type.label}
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                              {count}
                            </Badge>
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Evidence List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {evidenceFilter 
                        ? `${EVIDENCE_TYPES.find(t => t.value === evidenceFilter)?.label || 'Evidence'} (${filteredEvidence?.length || 0})`
                        : `All Evidence (${evidenceData?.length || 0})`
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredEvidence && filteredEvidence.length > 0 ? (
                      <div className="space-y-3">
                        {filteredEvidence.map((evidence: any) => {
                          const typeInfo = EVIDENCE_TYPES.find(t => t.value === evidence.evidence_type) || EVIDENCE_TYPES[3];
                          const Icon = typeInfo.icon;
                          const isImage = evidence.file_type?.startsWith('image/') || evidence.file_path?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                          
                          return (
                            <div key={evidence.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                              <div className="p-2 rounded-md bg-primary/10">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{evidence.file_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">{typeInfo.label}</Badge>
                                  {evidence.description && (
                                    <span className="text-xs text-muted-foreground truncate">{evidence.description}</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(evidence.created_at), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {isImage && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => window.open(getEvidenceUrl(evidence.file_path), '_blank')}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = getEvidenceUrl(evidence.file_path);
                                    link.download = evidence.file_name;
                                    link.click();
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteEvidence(evidence.id, evidence.file_path)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{evidenceFilter ? 'No evidence of this type' : 'No evidence uploaded yet'}</p>
                        <p className="text-sm">
                          {evidenceFilter 
                            ? 'Try selecting a different filter or upload new evidence'
                            : 'Click "Upload Evidence" to add attendance sheets, photos, or certificates'
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Evidence Upload Modal */}
                <EvidenceUploadModal
                  open={showEvidenceUploadModal}
                  onOpenChange={setShowEvidenceUploadModal}
                  onUpload={handleEvidenceUpload}
                  isUploading={isUploadingEvidence}
                />
              </TabsContent>
            )}
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
