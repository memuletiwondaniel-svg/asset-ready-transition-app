
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, FileText, User, Plus, Building2, Users, Mail, Target, FolderOpen, Search, File, ChevronDown } from 'lucide-react';

interface AddNewProjectWidgetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (projectData: any) => void;
  editMode?: boolean;
  existingProject?: any;
}

interface TeamMember {
  name: string;
  email: string;
}

interface AdditionalPerson {
  name: string;
  email: string;
  role: string;
}

interface DocumentFilter {
  project: string;
  originator: string;
  plant: string;
  site: string;
  unit: string;
  discipline: string;
  docType: string;
  sequence: string;
}

const AddNewProjectWidget: React.FC<AddNewProjectWidgetProps> = ({ 
  open, 
  onClose, 
  onSubmit, 
  editMode = false, 
  existingProject 
}) => {
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState({
    projectId: '',
    projectTitle: '',
    projectScope: '',
    projectMilestone: '',
    plant: '',
    csLocation: '',
    scorecardProject: '',
    projectHubLead: { name: '', email: '' } as TeamMember,
    commissioningLead: { name: '', email: '' } as TeamMember,
    constructionLead: { name: '', email: '' } as TeamMember,
    additionalPersons: [] as AdditionalPerson[],
    supportingDocs: [] as File[]
  });

  const [documentFilters, setDocumentFilters] = useState<DocumentFilter>({
    project: '',
    originator: '',
    plant: '',
    site: '',
    unit: '',
    discipline: '',
    docType: '',
    sequence: ''
  });

  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Initialize form data when in edit mode
  useEffect(() => {
    if (editMode && existingProject) {
      setFormData(existingProject);
    } else if (!editMode) {
      // Reset form for new project
      setFormData({
        projectId: '',
        projectTitle: '',
        projectScope: '',
        projectMilestone: '',
        plant: '',
        csLocation: '',
        scorecardProject: '',
        projectHubLead: { name: '', email: '' },
        commissioningLead: { name: '', email: '' },
        constructionLead: { name: '', email: '' },
        additionalPersons: [],
        supportingDocs: []
      });
    }
  }, [editMode, existingProject, open]);

  // Check for scroll indicator
  useEffect(() => {
    const checkScroll = () => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        const hasScroll = scrollArea.scrollHeight > scrollArea.clientHeight;
        const isAtBottom = scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 10;
        setShowScrollIndicator(hasScroll && !isAtBottom);
      }
    };

    if (open) {
      setTimeout(checkScroll, 100);
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.addEventListener('scroll', checkScroll);
        return () => scrollArea.removeEventListener('scroll', checkScroll);
      }
    }
  }, [open]);

  const plants = [
    'KAZ',
    'NRNGL', 
    'UQ',
    'Compressor Station (CS)',
    'BNGL'
  ];

  const csLocations = [
    'West Qurna',
    'North Rumaila', 
    'South Rumaila',
    'Zubair'
  ];

  // Document filter options
  const filterOptions = {
    project: ['Project A', 'Project B', 'Project C'],
    originator: ['Engineering', 'Construction', 'Operations'],
    plant: plants,
    site: ['Site 1', 'Site 2', 'Site 3'],
    unit: ['Unit 100', 'Unit 200', 'Unit 300'],
    discipline: ['Mechanical', 'Electrical', 'Instrumentation', 'Civil'],
    docType: ['Drawing', 'Specification', 'Report', 'Manual'],
    sequence: ['001', '002', '003', '004']
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    if (!editMode) {
      // Reset form only for new projects
      setFormData({
        projectId: '',
        projectTitle: '',
        projectScope: '',
        projectMilestone: '',
        plant: '',
        csLocation: '',
        scorecardProject: '',
        projectHubLead: { name: '', email: '' },
        commissioningLead: { name: '', email: '' },
        constructionLead: { name: '', email: '' },
        additionalPersons: [],
        supportingDocs: []
      });
    }
  };

  const handleProjectIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any existing "DP" and non-numeric characters except spaces
    const numericValue = value.replace(/^DP\s*/, '').replace(/[^0-9\s]/g, '');
    setFormData(prev => ({ ...prev, projectId: numericValue }));
  };

  const displayProjectId = formData.projectId ? `DP ${formData.projectId}` : '';

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({
      ...prev,
      supportingDocs: [...prev.supportingDocs, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      supportingDocs: prev.supportingDocs.filter((_, i) => i !== index)
    }));
  };

  const addAdditionalPerson = () => {
    setFormData(prev => ({
      ...prev,
      additionalPersons: [...prev.additionalPersons, { name: '', email: '', role: '' }]
    }));
  };

  const updateAdditionalPerson = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalPersons: prev.additionalPersons.map((person, i) => 
        i === index ? { ...person, [field]: value } : person
      )
    }));
  };

  const removeAdditionalPerson = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalPersons: prev.additionalPersons.filter((_, i) => i !== index)
    }));
  };

  const updateTeamMember = (role: keyof typeof formData, field: keyof TeamMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      [role]: { ...(prev[role] as TeamMember), [field]: value }
    }));
  };

  const updateDocumentFilter = (field: keyof DocumentFilter, value: string) => {
    setDocumentFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFindDocumentsInAssai = () => {
    // Build query parameters from document filters
    const queryParams = new URLSearchParams();
    Object.entries(documentFilters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    // Open Assai in new tab with search parameters
    const assaiUrl = `https://assai.com/search?${queryParams.toString()}`;
    window.open(assaiUrl, '_blank');
  };

  const handleFindDocumentsInWrench = () => {
    // Build query parameters from document filters
    const queryParams = new URLSearchParams();
    Object.entries(documentFilters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    // Open Wrench in new tab with search parameters
    const wrenchUrl = `https://wrench.com/search?${queryParams.toString()}`;
    window.open(wrenchUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
              <Plus className="h-5 w-5 text-white" />
            </div>
            {editMode ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Project Information Section */}
                <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-300 to-blue-400 text-white rounded-t-lg">
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Building2 className="h-8 w-8" />
                      </div>
                      Project Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* First Row: Project ID and Title */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="projectId" className="text-sm font-medium text-gray-700">
                          Project ID *
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">
                            DP
                          </span>
                          <Input
                            id="projectId"
                            value={formData.projectId}
                            onChange={handleProjectIdChange}
                            placeholder="425"
                            required
                            className="h-10 pl-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 w-32"
                          />
                        </div>
                      </div>
                      
                      <div className="col-span-3 space-y-2">
                        <Label htmlFor="projectTitle" className="text-sm font-medium text-gray-700">
                          Project Title *
                        </Label>
                        <Input
                          id="projectTitle"
                          value={formData.projectTitle}
                          onChange={(e) => setFormData(prev => ({ ...prev, projectTitle: e.target.value }))}
                          placeholder="Enter comprehensive project title"
                          required
                          className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left Column - Form Fields */}
                      <div className="space-y-4">
                        {/* Plant Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="plant" className="text-sm font-medium text-gray-700">
                            Select Plant *
                          </Label>
                          <Select value={formData.plant} onValueChange={(value) => setFormData(prev => ({ ...prev, plant: value }))}>
                            <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500">
                              <SelectValue placeholder="Choose plant" />
                            </SelectTrigger>
                            <SelectContent>
                              {plants.map((plant) => (
                                <SelectItem key={plant} value={plant}>{plant}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* CS Location (conditional) */}
                        {formData.plant === 'Compressor Station (CS)' && (
                          <div className="space-y-2">
                            <Label htmlFor="csLocation" className="text-sm font-medium text-gray-700">
                              CS Location *
                            </Label>
                            <Select value={formData.csLocation} onValueChange={(value) => setFormData(prev => ({ ...prev, csLocation: value }))}>
                              <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500">
                                <SelectValue placeholder="Choose CS location" />
                              </SelectTrigger>
                              <SelectContent>
                                {csLocations.map((location) => (
                                  <SelectItem key={location} value={location}>{location}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* 2025 Project Milestone */}
                        <div className="space-y-2">
                          <Label htmlFor="projectMilestone" className="text-sm font-medium text-gray-700">
                            {currentYear} Project Milestone
                          </Label>
                          <Input
                            id="projectMilestone"
                            value={formData.projectMilestone}
                            onChange={(e) => setFormData(prev => ({ ...prev, projectMilestone: e.target.value }))}
                            placeholder={`Enter ${currentYear} milestone`}
                            className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        </div>

                        {/* Score Card Project */}
                        <div className="space-y-2">
                          <Label htmlFor="scorecardProject" className="text-sm font-medium text-gray-700">
                            Score Card Project *
                          </Label>
                          <Select value={formData.scorecardProject} onValueChange={(value) => setFormData(prev => ({ ...prev, scorecardProject: value }))}>
                            <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Right Column - Project Scope */}
                      <div className="space-y-2">
                        <Label htmlFor="projectScope" className="text-sm font-medium text-gray-700">
                          Project Scope *
                        </Label>
                        <Textarea
                          id="projectScope"
                          value={formData.projectScope}
                          onChange={(e) => setFormData(prev => ({ ...prev, projectScope: e.target.value }))}
                          placeholder="Describe the comprehensive project scope, objectives, and deliverables..."
                          rows={5}
                          required
                          className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Members Section */}
                <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
                  <CardHeader className="pb-3 bg-gradient-to-r from-purple-300 to-purple-400 text-white rounded-t-lg">
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Users className="h-8 w-8" />
                      </div>
                      Team Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Core Team Members */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Project Hub Lead */}
                      <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <User className="h-4 w-4 text-purple-500" />
                          Project Hub Lead *
                        </Label>
                        <Input
                          placeholder="Full name"
                          value={formData.projectHubLead.name}
                          onChange={(e) => updateTeamMember('projectHubLead', 'name', e.target.value)}
                          required
                          className="h-9 border-gray-300 focus:border-purple-400"
                        />
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="Email address"
                            value={formData.projectHubLead.email}
                            onChange={(e) => updateTeamMember('projectHubLead', 'email', e.target.value)}
                            required
                            className="h-9 pl-10 border-gray-300 focus:border-purple-400"
                          />
                        </div>
                      </div>

                      {/* Commissioning Lead */}
                      <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <User className="h-4 w-4 text-purple-500" />
                          Commissioning Lead *
                        </Label>
                        <Input
                          placeholder="Full name"
                          value={formData.commissioningLead.name}
                          onChange={(e) => updateTeamMember('commissioningLead', 'name', e.target.value)}
                          required
                          className="h-9 border-gray-300 focus:border-purple-400"
                        />
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="Email address"
                            value={formData.commissioningLead.email}
                            onChange={(e) => updateTeamMember('commissioningLead', 'email', e.target.value)}
                            required
                            className="h-9 pl-10 border-gray-300 focus:border-purple-400"
                          />
                        </div>
                      </div>

                      {/* Construction Lead */}
                      <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <User className="h-4 w-4 text-purple-500" />
                          Construction Lead *
                        </Label>
                        <Input
                          placeholder="Full name"
                          value={formData.constructionLead.name}
                          onChange={(e) => updateTeamMember('constructionLead', 'name', e.target.value)}
                          required
                          className="h-9 border-gray-300 focus:border-purple-400"
                        />
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="Email address"
                            value={formData.constructionLead.email}
                            onChange={(e) => updateTeamMember('constructionLead', 'email', e.target.value)}
                            required
                            className="h-9 pl-10 border-gray-300 focus:border-purple-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Team Members */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-500" />
                          Additional Team Members
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addAdditionalPerson}
                          className="flex items-center gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
                        >
                          <Plus className="h-4 w-4" />
                          Add Person
                        </Button>
                      </div>
                      
                      {formData.additionalPersons.length > 0 && (
                        <div className="space-y-3 max-h-40 overflow-y-auto">
                          {formData.additionalPersons.map((person, index) => (
                            <div key={index} className="p-4 border border-purple-200 rounded-xl bg-purple-50/50">
                              <div className="grid grid-cols-4 gap-3">
                                <Input
                                  placeholder="Full name"
                                  value={person.name}
                                  onChange={(e) => updateAdditionalPerson(index, 'name', e.target.value)}
                                  className="h-9 border-gray-300 focus:border-purple-400"
                                />
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input
                                    type="email"
                                    placeholder="Email"
                                    value={person.email}
                                    onChange={(e) => updateAdditionalPerson(index, 'email', e.target.value)}
                                    className="h-9 pl-10 border-gray-300 focus:border-purple-400"
                                  />
                                </div>
                                <Input
                                  placeholder="Role/Title"
                                  value={person.role}
                                  onChange={(e) => updateAdditionalPerson(index, 'role', e.target.value)}
                                  className="h-9 border-gray-300 focus:border-purple-400"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAdditionalPerson(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-9 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Project Documents Section */}
                <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
                  <CardHeader className="pb-3 bg-gradient-to-r from-emerald-300 to-emerald-400 text-white rounded-t-lg">
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <FolderOpen className="h-8 w-8" />
                      </div>
                      Project Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Document Search Filters */}
                    <div className="space-y-6">
                      <Label className="text-sm font-medium text-gray-700">Find Documents</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {Object.entries(filterOptions).map(([key, options], index) => (
                          <div key={key} className="flex items-center gap-2">
                            <div className="min-w-[120px]">
                              <Select value={documentFilters[key as keyof DocumentFilter]} onValueChange={(value) => updateDocumentFilter(key as keyof DocumentFilter, value)}>
                                <SelectTrigger className="h-8 text-xs border-gray-300">
                                  <SelectValue placeholder={key.charAt(0).toUpperCase() + key.slice(1)} />
                                </SelectTrigger>
                                <SelectContent>
                                  {options.map((option) => (
                                    <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {index < Object.keys(filterOptions).length - 1 && (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3 mt-6">
                        <Button
                          type="button"
                          onClick={handleFindDocumentsInAssai}
                          variant="outline"
                          className="h-8 px-3 text-xs flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 shadow-none"
                        >
                          <img src="/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png" alt="Assai" className="h-4 w-4" />
                          Find Documents in Assai
                        </Button>
                        <Button
                          type="button"
                          onClick={handleFindDocumentsInWrench}
                          variant="outline"
                          className="h-8 px-3 text-xs flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 shadow-none"
                        >
                          <img src="/lovable-uploads/81080018-90d7-4e00-a4b2-ee1682e5d8bd.png" alt="Wrench" className="h-4 w-4" />
                          Find Documents in Wrench
                        </Button>
                      </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Upload className="h-4 w-4 text-emerald-500" />
                        Upload Supporting Documents
                      </Label>
                      <div className="border-2 border-dashed border-emerald-300 rounded-xl p-6 text-center bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                        <div className="p-3 bg-emerald-100 rounded-full w-fit mx-auto mb-3">
                          <Upload className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          Click to upload files or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          PDF, DOC, XLS files up to 10MB each
                        </p>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          id="project-file-upload"
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={() => document.getElementById('project-file-upload')?.click()}
                          className="border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose Files
                        </Button>
                      </div>
                      
                      {/* Uploaded Files List */}
                      {formData.supportingDocs.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="text-sm font-medium text-gray-900">Uploaded Documents</h5>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {formData.supportingDocs.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-emerald-100 rounded-lg">
                                    <FileText className="h-4 w-4 text-emerald-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                </div>
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </form>
            </div>
          </ScrollArea>

          {/* Scroll Indicator */}
          {showScrollIndicator && (
            <div className="absolute bottom-20 right-6 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow-lg animate-bounce">
              <ChevronDown className="h-4 w-4 text-gray-600" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 bg-white/95 backdrop-blur-sm flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            {editMode ? 'Update Project' : 'Create Project'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewProjectWidget;
