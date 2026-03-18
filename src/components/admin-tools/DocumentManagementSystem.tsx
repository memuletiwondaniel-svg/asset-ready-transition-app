import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, FileText, Plus, Pencil, Trash2, Search, FolderOpen, Layers, ClipboardList, Settings2, GripVertical } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { toast } from 'sonner';

interface DocumentManagementSystemProps {
  onBack: () => void;
}

// --- Type definitions ---


interface LifecyclePhase {
  id: string;
  name: string;
  code: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

interface PhaseDocumentMapping {
  id: string;
  phase_id: string;
  phase_name: string;
  document_type_id: string;
  document_type_name: string;
  is_mandatory: boolean;
  responsible_role: string;
}

interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

// --- Mock data ---

const MOCK_CATEGORIES: DocumentCategory[] = [
  { id: '1', name: 'Engineering', description: 'Engineering drawings, specifications, and technical documents', icon: 'engineering', display_order: 1, is_active: true },
  { id: '2', name: 'Safety & Compliance', description: 'Safety studies, HAZOP reports, and regulatory compliance documents', icon: 'safety', display_order: 2, is_active: true },
  { id: '3', name: 'Procurement', description: 'Purchase orders, vendor documents, and material certifications', icon: 'procurement', display_order: 3, is_active: true },
  { id: '4', name: 'Construction', description: 'Construction work packs, ITPs, and as-built records', icon: 'construction', display_order: 4, is_active: true },
  { id: '5', name: 'Commissioning', description: 'Commissioning procedures, test reports, and punch lists', icon: 'commissioning', display_order: 5, is_active: true },
  { id: '6', name: 'Operations', description: 'Operating procedures, maintenance manuals, and training materials', icon: 'operations', display_order: 6, is_active: true },
];


const MOCK_PHASES: LifecyclePhase[] = [
  { id: '1', name: 'Identify (FEL-1)', code: 'FEL1', description: 'Opportunity identification and concept screening', display_order: 1, is_active: true },
  { id: '2', name: 'Assess (FEL-2)', code: 'FEL2', description: 'Concept selection and feasibility assessment', display_order: 2, is_active: true },
  { id: '3', name: 'Select (FEL-3)', code: 'FEL3', description: 'FEED and detailed scope definition', display_order: 3, is_active: true },
  { id: '4', name: 'Define (Detailed Design)', code: 'DD', description: 'Detailed engineering and design', display_order: 4, is_active: true },
  { id: '5', name: 'Execute (Construction)', code: 'EX', description: 'Procurement, construction, and installation', display_order: 5, is_active: true },
  { id: '6', name: 'Commission & Start-up', code: 'CSU', description: 'Pre-commissioning, commissioning, and start-up', display_order: 6, is_active: true },
  { id: '7', name: 'Operate', code: 'OPS', description: 'Steady-state operations and maintenance', display_order: 7, is_active: true },
];

const MOCK_MAPPINGS: PhaseDocumentMapping[] = [
  { id: '1', phase_id: '3', phase_name: 'Select (FEL-3)', document_type_id: '1', document_type_name: 'P&ID', is_mandatory: true, responsible_role: 'Process Engineer' },
  { id: '2', phase_id: '3', phase_name: 'Select (FEL-3)', document_type_id: '2', document_type_name: 'HAZOP Report', is_mandatory: true, responsible_role: 'Safety Engineer' },
  { id: '3', phase_id: '4', phase_name: 'Define (Detailed Design)', document_type_id: '7', document_type_name: 'Design Basis Memorandum', is_mandatory: true, responsible_role: 'Lead Engineer' },
  { id: '4', phase_id: '5', phase_name: 'Execute (Construction)', document_type_id: '3', document_type_name: 'Material Requisition', is_mandatory: true, responsible_role: 'Procurement Lead' },
  { id: '5', phase_id: '5', phase_name: 'Execute (Construction)', document_type_id: '4', document_type_name: 'Inspection Test Plan', is_mandatory: true, responsible_role: 'QA/QC Engineer' },
  { id: '6', phase_id: '6', phase_name: 'Commission & Start-up', document_type_id: '5', document_type_name: 'Commissioning Procedure', is_mandatory: true, responsible_role: 'Commissioning Lead' },
  { id: '7', phase_id: '7', phase_name: 'Operate', document_type_id: '6', document_type_name: 'Operating Manual', is_mandatory: true, responsible_role: 'Operations Manager' },
  { id: '8', phase_id: '6', phase_name: 'Commission & Start-up', document_type_id: '8', document_type_name: 'SIL Assessment', is_mandatory: false, responsible_role: 'Safety Engineer' },
];

const DocumentManagementSystem: React.FC<DocumentManagementSystemProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('categories');
  const [searchQuery, setSearchQuery] = useState('');


  // --- Lifecycle Phases state ---
  const [phases, setPhases] = useState<LifecyclePhase[]>(MOCK_PHASES);
  const [editingPhase, setEditingPhase] = useState<LifecyclePhase | null>(null);
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);

  // --- Phase-Document Mappings state ---
  const [mappings, setMappings] = useState<PhaseDocumentMapping[]>(MOCK_MAPPINGS);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PhaseDocumentMapping | null>(null);

  // --- Categories state ---
  const [categories, setCategories] = useState<DocumentCategory[]>(MOCK_CATEGORIES);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);

  // --- Form states ---
  
  const [formPhase, setFormPhase] = useState<Partial<LifecyclePhase>>({});
  const [formMapping, setFormMapping] = useState<Partial<PhaseDocumentMapping>>({});
  const [formCategory, setFormCategory] = useState<Partial<DocumentCategory>>({});

  // --- Handlers ---


  const handleSavePhase = () => {
    if (!formPhase.name || !formPhase.code) {
      toast.error('Name and code are required');
      return;
    }
    if (editingPhase) {
      setPhases(prev => prev.map(p => p.id === editingPhase.id ? { ...p, ...formPhase } as LifecyclePhase : p));
      toast.success('Lifecycle phase updated');
    } else {
      const newPhase: LifecyclePhase = {
        id: crypto.randomUUID(),
        name: formPhase.name,
        code: formPhase.code,
        description: formPhase.description || '',
        display_order: phases.length + 1,
        is_active: formPhase.is_active ?? true,
      };
      setPhases(prev => [...prev, newPhase]);
      toast.success('Lifecycle phase created');
    }
    setPhaseDialogOpen(false);
    setEditingPhase(null);
    setFormPhase({});
  };

  const handleSaveMapping = () => {
    if (!formMapping.phase_id || !formMapping.document_type_id) {
      toast.error('Phase and document type are required');
      return;
    }
    const phase = phases.find(p => p.id === formMapping.phase_id);
    const docType = docTypes.find(d => d.id === formMapping.document_type_id);
    if (editingMapping) {
      setMappings(prev => prev.map(m => m.id === editingMapping.id ? {
        ...m,
        ...formMapping,
        phase_name: phase?.name || '',
        document_type_name: docType?.name || '',
      } as PhaseDocumentMapping : m));
      toast.success('Mapping updated');
    } else {
      const newMapping: PhaseDocumentMapping = {
        id: crypto.randomUUID(),
        phase_id: formMapping.phase_id,
        phase_name: phase?.name || '',
        document_type_id: formMapping.document_type_id,
        document_type_name: docType?.name || '',
        is_mandatory: formMapping.is_mandatory ?? false,
        responsible_role: formMapping.responsible_role || '',
      };
      setMappings(prev => [...prev, newMapping]);
      toast.success('Mapping created');
    }
    setMappingDialogOpen(false);
    setEditingMapping(null);
    setFormMapping({});
  };

  const handleSaveCategory = () => {
    if (!formCategory.name) {
      toast.error('Name is required');
      return;
    }
    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...formCategory } as DocumentCategory : c));
      toast.success('Category updated');
    } else {
      const newCat: DocumentCategory = {
        id: crypto.randomUUID(),
        name: formCategory.name,
        description: formCategory.description || '',
        icon: formCategory.icon || 'default',
        display_order: categories.length + 1,
        is_active: formCategory.is_active ?? true,
      };
      setCategories(prev => [...prev, newCat]);
      toast.success('Category created');
    }
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setFormCategory({});
  };

  const deleteDocType = (id: string) => {
    setDocTypes(prev => prev.filter(d => d.id !== id));
    toast.success('Document type deleted');
  };

  const deletePhase = (id: string) => {
    setPhases(prev => prev.filter(p => p.id !== id));
    toast.success('Lifecycle phase deleted');
  };

  const deleteMapping = (id: string) => {
    setMappings(prev => prev.filter(m => m.id !== id));
    toast.success('Mapping deleted');
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    toast.success('Category deleted');
  };

  const filteredDocTypes = docTypes.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMappings = mappings.filter(m =>
    m.phase_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.document_type_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.responsible_role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl px-6 py-4 sticky top-0 z-10">
        <BreadcrumbNavigation
          currentPageLabel="Document Management System"
          favoritePath="/admin-tools/document-management"
          customBreadcrumbs={[
            { label: 'Home', path: '/', onClick: () => window.location.href = '/' },
            { label: 'Administration', path: '/admin-tools', onClick: onBack }
          ]}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Document Management System
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure document types, lifecycle phases, and information plan mappings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid grid-cols-4 max-w-2xl">
                <TabsTrigger value="document-types" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document Types
                </TabsTrigger>
                <TabsTrigger value="categories" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Categories
                </TabsTrigger>
                <TabsTrigger value="lifecycle-phases" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Lifecycle Phases
                </TabsTrigger>
                <TabsTrigger value="information-plan" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Information Plan
                </TabsTrigger>
              </TabsList>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* ===== Document Types Tab ===== */}
            <TabsContent value="document-types" className="mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">Document Types</CardTitle>
                    <CardDescription>Define the types of documents managed across the project lifecycle</CardDescription>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => { setEditingDocType(null); setFormDocType({ is_active: true, requires_approval: false }); setDocTypeDialogOpen(true); }}>
                    <Plus className="h-4 w-4" /> Add Type
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-24 text-center">Approval</TableHead>
                        <TableHead className="w-28 text-center">Retention</TableHead>
                        <TableHead className="w-20 text-center">Status</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocTypes.map((dt) => (
                        <TableRow key={dt.id}>
                          <TableCell className="font-mono text-xs font-semibold text-primary">{dt.code}</TableCell>
                          <TableCell className="font-medium">{dt.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{dt.category}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {dt.requires_approval ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Required</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {dt.retention_years ? `${dt.retention_years} years` : <span className="text-muted-foreground">Permanent</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={dt.is_active ? 'default' : 'secondary'} className="text-xs">
                              {dt.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingDocType(dt); setFormDocType(dt); setDocTypeDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDocType(dt.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredDocTypes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No document types found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== Categories Tab ===== */}
            <TabsContent value="categories" className="mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">Document Categories</CardTitle>
                    <CardDescription>Organize document types into logical categories</CardDescription>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => { setEditingCategory(null); setFormCategory({ is_active: true }); setCategoryDialogOpen(true); }}>
                    <Plus className="h-4 w-4" /> Add Category
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24 text-center">Doc Types</TableHead>
                        <TableHead className="w-20 text-center">Status</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="text-muted-foreground text-sm">{cat.display_order}</TableCell>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{cat.description}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {docTypes.filter(d => d.category === cat.name).length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={cat.is_active ? 'default' : 'secondary'} className="text-xs">
                              {cat.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCategory(cat); setFormCategory(cat); setCategoryDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(cat.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== Lifecycle Phases Tab ===== */}
            <TabsContent value="lifecycle-phases" className="mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">Project Lifecycle Phases</CardTitle>
                    <CardDescription>Define the project lifecycle stages that drive the information plan</CardDescription>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => { setEditingPhase(null); setFormPhase({ is_active: true }); setPhaseDialogOpen(true); }}>
                    <Plus className="h-4 w-4" /> Add Phase
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Order</TableHead>
                        <TableHead className="w-20">Code</TableHead>
                        <TableHead>Phase Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-28 text-center">Documents</TableHead>
                        <TableHead className="w-20 text-center">Status</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phases.sort((a, b) => a.display_order - b.display_order).map((phase) => (
                        <TableRow key={phase.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <GripVertical className="h-3.5 w-3.5" />
                              {phase.display_order}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-primary">{phase.code}</TableCell>
                          <TableCell className="font-medium">{phase.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{phase.description}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {mappings.filter(m => m.phase_id === phase.id).length} mapped
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={phase.is_active ? 'default' : 'secondary'} className="text-xs">
                              {phase.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingPhase(phase); setFormPhase(phase); setPhaseDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePhase(phase.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== Information Plan Tab ===== */}
            <TabsContent value="information-plan" className="mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">Project Lifecycle Information Plan</CardTitle>
                    <CardDescription>Map which documents are required at each project lifecycle phase</CardDescription>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => { setEditingMapping(null); setFormMapping({ is_mandatory: false }); setMappingDialogOpen(true); }}>
                    <Plus className="h-4 w-4" /> Add Mapping
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lifecycle Phase</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead className="w-28 text-center">Mandatory</TableHead>
                        <TableHead>Responsible Role</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{mapping.phase_name}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{mapping.document_type_name}</TableCell>
                          <TableCell className="text-center">
                            {mapping.is_mandatory ? (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">Mandatory</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{mapping.responsible_role || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingMapping(mapping); setFormMapping(mapping); setMappingDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMapping(mapping.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredMappings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No mappings found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ===== Dialogs ===== */}

      {/* Document Type Dialog */}
      <Dialog open={docTypeDialogOpen} onOpenChange={setDocTypeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDocType ? 'Edit Document Type' : 'Add Document Type'}</DialogTitle>
            <DialogDescription>Define a document type for the project lifecycle</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={formDocType.code || ''} onChange={e => setFormDocType(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. PID" />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formDocType.category || ''} onValueChange={v => setFormDocType(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.is_active).map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formDocType.name || ''} onChange={e => setFormDocType(p => ({ ...p, name: e.target.value }))} placeholder="e.g. P&ID (Piping & Instrumentation Diagram)" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDocType.description || ''} onChange={e => setFormDocType(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Retention (years)</Label>
                <Input type="number" value={formDocType.retention_years ?? ''} onChange={e => setFormDocType(p => ({ ...p, retention_years: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Leave blank for permanent" />
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={formDocType.requires_approval ?? false} onCheckedChange={v => setFormDocType(p => ({ ...p, requires_approval: v }))} />
                  <Label className="text-sm">Requires Approval</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formDocType.is_active ?? true} onCheckedChange={v => setFormDocType(p => ({ ...p, is_active: v }))} />
                  <Label className="text-sm">Active</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDocType}>{editingDocType ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase Dialog */}
      <Dialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPhase ? 'Edit Lifecycle Phase' : 'Add Lifecycle Phase'}</DialogTitle>
            <DialogDescription>Define a project lifecycle phase</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={formPhase.code || ''} onChange={e => setFormPhase(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. FEL3" />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input type="number" value={formPhase.display_order ?? ''} onChange={e => setFormPhase(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formPhase.name || ''} onChange={e => setFormPhase(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Select (FEL-3)" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formPhase.description || ''} onChange={e => setFormPhase(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formPhase.is_active ?? true} onCheckedChange={v => setFormPhase(p => ({ ...p, is_active: v }))} />
              <Label className="text-sm">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhaseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePhase}>{editingPhase ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMapping ? 'Edit Mapping' : 'Add Phase-Document Mapping'}</DialogTitle>
            <DialogDescription>Map a document type to a lifecycle phase</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lifecycle Phase *</Label>
              <Select value={formMapping.phase_id || ''} onValueChange={v => setFormMapping(p => ({ ...p, phase_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                <SelectContent>
                  {phases.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={formMapping.document_type_id || ''} onValueChange={v => setFormMapping(p => ({ ...p, document_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                <SelectContent>
                  {docTypes.filter(d => d.is_active).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsible Role</Label>
              <Input value={formMapping.responsible_role || ''} onChange={e => setFormMapping(p => ({ ...p, responsible_role: e.target.value }))} placeholder="e.g. Process Engineer" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formMapping.is_mandatory ?? false} onCheckedChange={v => setFormMapping(p => ({ ...p, is_mandatory: v }))} />
              <Label className="text-sm">Mandatory Document</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMapping}>{editingMapping ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>Organize document types into categories</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formCategory.name || ''} onChange={e => setFormCategory(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Engineering" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formCategory.description || ''} onChange={e => setFormCategory(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formCategory.is_active ?? true} onCheckedChange={v => setFormCategory(p => ({ ...p, is_active: v }))} />
              <Label className="text-sm">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>{editingCategory ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentManagementSystem;
