import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, FileText, User, Plus } from 'lucide-react';

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Add New Project</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-gray-900">Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId" className="text-sm font-medium">Project ID (DP Number) *</Label>
                  <Input
                    id="projectId"
                    value={formData.projectId}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                    placeholder="e.g., DP 425"
                    required
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectTitle" className="text-sm font-medium">Project Title *</Label>
                  <Input
                    id="projectTitle"
                    value={formData.projectTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectTitle: e.target.value }))}
                    placeholder="Enter project title"
                    required
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectScope" className="text-sm font-medium">Project Scope / Details *</Label>
                <Textarea
                  id="projectScope"
                  value={formData.projectScope}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectScope: e.target.value }))}
                  placeholder="Describe the project scope and details..."
                  rows={3}
                  required
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plant" className="text-sm font-medium">Select Plant *</Label>
                  <Select value={formData.plant} onValueChange={(value) => setFormData(prev => ({ ...prev, plant: value }))}>
                    <SelectTrigger className="h-10">
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
                  <div className="space-y-2">
                    <Label htmlFor="csLocation" className="text-sm font-medium">CS Location *</Label>
                    <Select value={formData.csLocation} onValueChange={(value) => setFormData(prev => ({ ...prev, csLocation: value }))}>
                      <SelectTrigger className="h-10">
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

              <div className="space-y-4">
                <Label className="text-sm font-medium">Supporting Documents</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <div className="p-2 bg-blue-100 rounded-lg w-fit mx-auto mb-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
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
                  >
                    Choose Files
                  </Button>
                </div>
                
                {formData.supportingDocs.length > 0 && (
                  <div className="space-y-2">
                    {formData.supportingDocs.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFile(index)}
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

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-gray-900">Team Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Hub Lead */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Project Hub Lead *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Full name"
                    value={formData.projectHubLead.name}
                    onChange={(e) => updateTeamMember('projectHubLead', 'name', e.target.value)}
                    required
                    className="h-10"
                  />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.projectHubLead.email}
                    onChange={(e) => updateTeamMember('projectHubLead', 'email', e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
              </div>

              {/* Commissioning Lead */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Commissioning Lead *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Full name"
                    value={formData.commissioningLead.name}
                    onChange={(e) => updateTeamMember('commissioningLead', 'name', e.target.value)}
                    required
                    className="h-10"
                  />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.commissioningLead.email}
                    onChange={(e) => updateTeamMember('commissioningLead', 'email', e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
              </div>

              {/* Construction Lead */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Construction Lead *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Full name"
                    value={formData.constructionLead.name}
                    onChange={(e) => updateTeamMember('constructionLead', 'name', e.target.value)}
                    required
                    className="h-10"
                  />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.constructionLead.email}
                    onChange={(e) => updateTeamMember('constructionLead', 'email', e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
              </div>

              {/* Additional Team Members */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-700">Additional Team Members</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalPerson}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Add Person
                  </Button>
                </div>
                
                {formData.additionalPersons.map((person, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        placeholder="Full name"
                        value={person.name}
                        onChange={(e) => updateAdditionalPerson(index, 'name', e.target.value)}
                        className="h-9"
                      />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={person.email}
                        onChange={(e) => updateAdditionalPerson(index, 'email', e.target.value)}
                        className="h-9"
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Role/Title"
                          value={person.role}
                          onChange={(e) => updateAdditionalPerson(index, 'role', e.target.value)}
                          className="h-9"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAdditionalPerson(index)}
                          className="text-red-600 hover:text-red-700"
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

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Add Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewProjectWidget;
