
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface ProjectInformationSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const ProjectInformationSection: React.FC<ProjectInformationSectionProps> = ({ 
  formData, 
  setFormData 
}) => {
  const currentYear = new Date().getFullYear();
  
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

  const handleProjectIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any existing "DP" and non-numeric characters except spaces
    const numericValue = value.replace(/^DP\s*/, '').replace(/[^0-9\s]/g, '');
    setFormData((prev: any) => ({ ...prev, projectId: numericValue }));
  };

  return (
    <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-300 to-blue-400 text-white rounded-t-lg" style={{ minHeight: '50px' }}>
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Building2 className="h-6 w-6" />
          </div>
          Project Information
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* First Row: Project ID and Title */}
        <div className="flex gap-3 items-end">
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
          
          <div className="flex-1 space-y-2">
            <Label htmlFor="projectTitle" className="text-sm font-medium text-gray-700">
              Project Title *
            </Label>
            <Input
              id="projectTitle"
              value={formData.projectTitle}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, projectTitle: e.target.value }))}
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
              <Select value={formData.plant} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, plant: value }))}>
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
                <Select value={formData.csLocation} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, csLocation: value }))}>
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

            {/* 2025 Project Milestone and Score Card Project - Side by Side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="projectMilestone" className="text-sm font-medium text-gray-700">
                  {currentYear} Project Milestone
                </Label>
                <Input
                  id="projectMilestone"
                  value={formData.projectMilestone}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, projectMilestone: e.target.value }))}
                  placeholder={`Enter ${currentYear} milestone`}
                  className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scorecardProject" className="text-sm font-medium text-gray-700">
                  Score Card Project *
                </Label>
                <Select value={formData.scorecardProject} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, scorecardProject: value }))}>
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
          </div>

          {/* Right Column - Project Scope */}
          <div className="space-y-2">
            <Label htmlFor="projectScope" className="text-sm font-medium text-gray-700">
              Project Scope *
            </Label>
            <Textarea
              id="projectScope"
              value={formData.projectScope}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, projectScope: e.target.value }))}
              placeholder="Describe the comprehensive project scope, objectives, and deliverables..."
              rows={5}
              required
              className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
