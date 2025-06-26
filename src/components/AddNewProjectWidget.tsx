
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, FileText, User, Plus, Building2, Users, Mail, Briefcase } from 'lucide-react';

interface AddNewProjectWidgetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (projectData: any) => void;
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

const AddNewProjectWidget: React.FC<AddNewProjectWidgetProps> = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    projectId: '',
    projectTitle: '',
    projectScope: '',
    plant: '',
    csLocation: '',
    projectHubLead: { name: '', email: '' } as TeamMember,
    commissioningLead: { name: '', email: '' } as TeamMember,
    constructionLead: { name: '', email: '' } as TeamMember,
    additionalPersons: [] as AdditionalPerson[],
    supportingDocs: [] as File[]
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Reset form
    setFormData({
      projectId: '',
      projectTitle: '',
      projectScope: '',
      plant: '',
      csLocation: '',
      projectHubLead: { name: '', email: '' },
      commissioningLead: { name: '', email: '' },
      constructionLead: { name: '', email: '' },
      additionalPersons: [],
      supportingDocs: []
    });
  };

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <DialogHeader className="px-6 py-4 border-b border-blue-200 bg-white/90">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-md">
              <Plus className="h-4 w-4 text-white" />
            </div>
            Add New Project
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Project Information - Compact Layout */}
            <Card className="shadow-sm border-0 bg-white/80">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="projectId" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-blue-600" />
                      Project ID (DP Number) *
                    </Label>
                    <Input
                      id="projectId"
                      value={formData.projectId}
                      onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                      placeholder="e.g., DP 425"
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="projectTitle" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <FileText className="h-3 w-3 text-blue-600" />
                      Project Title *
                    </Label>
                    <Input
                      id="projectTitle"
                      value={formData.projectTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, projectTitle: e.target.value }))}
                      placeholder="Enter project title"
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="projectScope" className="text-xs font-medium text-gray-700">
                    Project Scope / Details *
                  </Label>
                  <Textarea
                    id="projectScope"
                    value={formData.projectScope}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectScope: e.target.value }))}
                    placeholder="Describe the project scope and details..."
                    rows={2}
                    required
                    className="resize-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="plant" className="text-xs font-medium text-gray-700">
                      Select Plant *
                    </Label>
                    <Select value={formData.plant} onValueChange={(value) => setFormData(prev => ({ ...prev, plant: value }))}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Choose plant" />
                      </SelectTrigger>
                      <SelectContent>
                        {plants.map((plant) => (
                          <SelectItem key={plant} value={plant}>{plant}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.plant === 'Compressor Station (CS)' && (
                    <div className="space-y-1">
                      <Label htmlFor="csLocation" className="text-xs font-medium text-gray-700">
                        CS Location *
                      </Label>
                      <Select value={formData.csLocation} onValueChange={(value) => setFormData(prev => ({ ...prev, csLocation: value }))}>
                        <SelectTrigger className="h-9 text-sm">
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
                </div>

                {/* Supporting Documents - Compact */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Upload className="h-3 w-3 text-blue-600" />
                    Supporting Documents
                  </Label>
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-3 text-center bg-blue-50/50">
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
                      size="sm"
                      onClick={() => document.getElementById('project-file-upload')?.click()}
                      className="border-blue-300 text-blue-600 hover:bg-blue-50 h-8 text-xs"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Choose Files
                    </Button>
                  </div>
                  
                  {formData.supportingDocs.length > 0 && (
                    <div className="max-h-20 overflow-y-auto space-y-1">
                      {formData.supportingDocs.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </div>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Members - Compact Grid Layout */}
            <Card className="shadow-sm border-0 bg-white/80">
              <CardHeader className="pb-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Core Team Members in Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Project Hub Lead */}
                  <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <User className="h-3 w-3 text-green-600" />
                      Project Hub Lead *
                    </Label>
                    <Input
                      placeholder="Full name"
                      value={formData.projectHubLead.name}
                      onChange={(e) => updateTeamMember('projectHubLead', 'name', e.target.value)}
                      required
                      className="h-8 text-sm"
                    />
                    <div className="relative">
                      <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={formData.projectHubLead.email}
                        onChange={(e) => updateTeamMember('projectHubLead', 'email', e.target.value)}
                        required
                        className="h-8 pl-7 text-sm"
                      />
                    </div>
                  </div>

                  {/* Commissioning Lead */}
                  <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <User className="h-3 w-3 text-blue-600" />
                      Commissioning Lead *
                    </Label>
                    <Input
                      placeholder="Full name"
                      value={formData.commissioningLead.name}
                      onChange={(e) => updateTeamMember('commissioningLead', 'name', e.target.value)}
                      required
                      className="h-8 text-sm"
                    />
                    <div className="relative">
                      <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={formData.commissioningLead.email}
                        onChange={(e) => updateTeamMember('commissioningLead', 'email', e.target.value)}
                        required
                        className="h-8 pl-7 text-sm"
                      />
                    </div>
                  </div>

                  {/* Construction Lead */}
                  <div className="space-y-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <User className="h-3 w-3 text-orange-600" />
                      Construction Lead *
                    </Label>
                    <Input
                      placeholder="Full name"
                      value={formData.constructionLead.name}
                      onChange={(e) => updateTeamMember('constructionLead', 'name', e.target.value)}
                      required
                      className="h-8 text-sm"
                    />
                    <div className="relative">
                      <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={formData.constructionLead.email}
                        onChange={(e) => updateTeamMember('constructionLead', 'email', e.target.value)}
                        required
                        className="h-8 pl-7 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Team Members */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Users className="h-3 w-3 text-purple-600" />
                      Additional Team Members
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAdditionalPerson}
                      className="flex items-center gap-1 border-purple-300 text-purple-600 hover:bg-purple-50 h-7 text-xs px-2"
                    >
                      <Plus className="h-3 w-3" />
                      Add Person
                    </Button>
                  </div>
                  
                  {formData.additionalPersons.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {formData.additionalPersons.map((person, index) => (
                        <div key={index} className="p-2 border border-purple-200 rounded-lg bg-purple-50/50">
                          <div className="grid grid-cols-4 gap-2">
                            <Input
                              placeholder="Full name"
                              value={person.name}
                              onChange={(e) => updateAdditionalPerson(index, 'name', e.target.value)}
                              className="h-8 text-sm"
                            />
                            <div className="relative">
                              <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                              <Input
                                type="email"
                                placeholder="Email"
                                value={person.email}
                                onChange={(e) => updateAdditionalPerson(index, 'email', e.target.value)}
                                className="h-8 pl-7 text-sm"
                              />
                            </div>
                            <Input
                              placeholder="Role/Title"
                              value={person.role}
                              onChange={(e) => updateAdditionalPerson(index, 'role', e.target.value)}
                              className="h-8 text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAdditionalPerson(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        </ScrollArea>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-white/90">
          <Button type="button" variant="outline" onClick={onClose} className="px-4 py-2 h-9 text-sm">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 h-9 text-sm shadow-lg"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewProjectWidget;
