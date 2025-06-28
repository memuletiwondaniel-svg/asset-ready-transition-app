
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectInformationSectionProps {
  formData: any;
  setFormData: (data: any) => void;
}

export const ProjectInformationSection: React.FC<ProjectInformationSectionProps> = ({
  formData,
  setFormData
}) => {
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

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project ID with DP prefix */}
          <div className="space-y-2">
            <Label htmlFor="projectId" className="text-sm font-medium text-gray-700">
              Project ID <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center">
              <div className="flex items-center bg-gray-100 border border-r-0 border-gray-300 rounded-l-md px-3 h-11">
                <span className="text-gray-700 font-medium">DP</span>
              </div>
              <Input
                id="projectId"
                type="text"
                placeholder="Enter project ID"
                value={formData.projectId}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                className="h-11 rounded-l-none border-l-0 focus:border-l"
                required
              />
            </div>
          </div>

          {/* Project Title */}
          <div className="space-y-2">
            <Label htmlFor="projectTitle" className="text-sm font-medium text-gray-700">
              Project Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="projectTitle"
              type="text"
              placeholder="Enter project title"
              value={formData.projectTitle}
              onChange={(e) => handleInputChange('projectTitle', e.target.value)}
              className="h-11"
              required
            />
          </div>

          {/* Plant - moved to come after Project Title */}
          <div className="space-y-2">
            <Label htmlFor="plant" className="text-sm font-medium text-gray-700">
              Plant <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.plant} onValueChange={(value) => handleInputChange('plant', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {plants.map((plant) => (
                  <SelectItem key={plant} value={plant}>
                    {plant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CS Location - only show if plant is CS */}
          {formData.plant === 'Compressor Station (CS)' && (
            <div className="space-y-2">
              <Label htmlFor="csLocation" className="text-sm font-medium text-gray-700">
                CS Location <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.csLocation} onValueChange={(value) => handleInputChange('csLocation', value)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select CS location" />
                </SelectTrigger>
                <SelectContent>
                  {csLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Project Scope */}
          <div className="space-y-2">
            <Label htmlFor="projectScope" className="text-sm font-medium text-gray-700">
              Project Scope <span className="text-red-500">*</span>
            </Label>
            <Input
              id="projectScope"
              type="text"
              placeholder="Enter project scope"
              value={formData.projectScope}
              onChange={(e) => handleInputChange('projectScope', e.target.value)}
              className="h-11"
              required
            />
          </div>

          {/* Project Milestone */}
          <div className="space-y-2">
            <Label htmlFor="projectMilestone" className="text-sm font-medium text-gray-700">
              Project Milestone
            </Label>
            <Input
              id="projectMilestone"
              type="text"
              placeholder="Enter project milestone"
              value={formData.projectMilestone}
              onChange={(e) => handleInputChange('projectMilestone', e.target.value)}
              className="h-11"
            />
          </div>

          {/* Milestone Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Milestone Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 w-full justify-start text-left font-normal",
                    !formData.milestoneDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.milestoneDate ? format(formData.milestoneDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.milestoneDate}
                  onSelect={(date) => handleInputChange('milestoneDate', date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Scorecard Project */}
          <div className="space-y-2">
            <Label htmlFor="scorecardProject" className="text-sm font-medium text-gray-700">
              Scorecard Project
            </Label>
            <Select value={formData.scorecardProject} onValueChange={(value) => handleInputChange('scorecardProject', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select scorecard project status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
