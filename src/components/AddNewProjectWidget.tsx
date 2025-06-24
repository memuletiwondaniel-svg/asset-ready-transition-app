
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50">
        <DialogHeader className="pb-6 border-b border-blue-200">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            Add New Project
          </DialogTitle>
          <p className="text-gray-600 mt-2">Create a new project with all necessary details and team information</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-8 pt-4">
          {/* Project Information Card */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-3">
                <Building2 className="h-5 w-5" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="projectId" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Project ID (DP Number) *
                  </Label>
                  <Input
                    id="projectId"
                    value={formData.projectId}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                    placeholder="e.g., DP 425"
                    required
                    className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectTitle" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Project Title *
                  </Label>
                  <Input
                    id="projectTitle"
                    value={formData.projectTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectTitle: e.target.value }))}
                    placeholder="Enter project title"
                    required
                    className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectScope" className="text-sm font-semibold text-gray-700">
                  Project Scope / Details *
                </Label>
                <Textarea
                  id="projectScope"
                  value={formData.projectScope}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectScope: e.target.value }))}
                  placeholder="Describe the project scope and details..."
                  rows={4}
                  required
                  className="resize-none border-2 border-gray-200 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="plant" className="text-sm font-semibold text-gray-700">
                    Select Plant *
                  </Label>
                  <Select value={formData.plant} onValueChange={(value) => setFormData(prev => ({ ...prev, plant: value }))}>
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500">
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
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="csLocation" className="text-sm font-semibold text-gray-700">
                      CS Location *
                    </Label>
                    <Select value={formData.csLocation} onValueChange={(value) => setFormData(prev => ({ ...prev, csLocation: value }))}>
                      <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500">
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

              {/* Supporting Documents Section */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-600" />
                  Supporting Documents
                </Label>
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center bg-blue-50/50 hover:bg-blue-50 transition-colors">
                  <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Upload BFD, project documents, or SharePoint site links
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
                    size="sm"
                    onClick={() => document.getElementById('project-file-upload')?.click()}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
                
                {formData.supportingDocs.length > 0 && (
                  <div className="space-y-2">
                    {formData.supportingDocs.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium">{file.name}</span>
                        </div>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Members Card */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-3">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Project Hub Lead */}
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  Project Hub Lead *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Full name"
                    value={formData.projectHubLead.name}
                    onChange={(e) => updateTeamMember('projectHubLead', 'name', e.target.value)}
                    required
                    className="h-11 border-2 border-gray-200 focus:border-green-500"
                  />
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={formData.projectHubLead.email}
                      onChange={(e) => updateTeamMember('projectHubLead', 'email', e.target.value)}
                      required
                      className="h-11 pl-10 border-2 border-gray-200 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Commissioning Lead */}
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Commissioning Lead *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Full name"
                    value={formData.commissioningLead.name}
                    onChange={(e) => updateTeamMember('commissioningLead', 'name', e.target.value)}
                    required
                    className="h-11 border-2 border-gray-200 focus:border-blue-500"
                  />
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={formData.commissioningLead.email}
                      onChange={(e) => updateTeamMember('commissioningLead', 'email', e.target.value)}
                      required
                      className="h-11 pl-10 border-2 border-gray-200 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Construction Lead */}
              <div className="space-y-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4 text-orange-600" />
                  Construction Lead *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Full name"
                    value={formData.constructionLead.name}
                    onChange={(e) => updateTeamMember('constructionLead', 'name', e.target.value)}
                    required
                    className="h-11 border-2 border-gray-200 focus:border-orange-500"
                  />
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={formData.constructionLead.email}
                      onChange={(e) => updateTeamMember('constructionLead', 'email', e.target.value)}
                      required
                      className="h-11 pl-10 border-2 border-gray-200 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Team Members */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
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
                
                {formData.additionalPersons.map((person, index) => (
                  <div key={index} className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        placeholder="Full name"
                        value={person.name}
                        onChange={(e) => updateAdditionalPerson(index, 'name', e.target.value)}
                        className="h-10 border-2 border-gray-200 focus:border-purple-500"
                      />
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={person.email}
                          onChange={(e) => updateAdditionalPerson(index, 'email', e.target.value)}
                          className="h-10 pl-10 border-2 border-gray-200 focus:border-purple-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Role/Title"
                          value={person.role}
                          onChange={(e) => updateAdditionalPerson(index, 'role', e.target.value)}
                          className="h-10 border-2 border-gray-200 focus:border-purple-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAdditionalPerson(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 bg-white/50 backdrop-blur-sm rounded-lg p-4">
            <Button type="button" variant="outline" onClick={onClose} className="px-6 py-2 h-11">
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 h-11 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewProjectWidget;
