import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Briefcase, Building2 } from 'lucide-react';
import ProjectDetails from './ProjectDetails';
import FileUploadSection from './FileUploadSection';
import AddNewProjectWidget from './AddNewProjectWidget';

interface FormData {
  asset: string;
  reason: string;
  projectId: string;
  projectName: string;
  scope: string;
  files: File[];
  teamMembers: {
    technicalAuthorities: {};
    assetTeam: {};
    projectTeam: {};
    hsse: {};
  };
}

interface Project {
  id: string;
  name: string;
  plant: string;
  subdivision?: string;
  scope: string;
  hubLead: any;
  others: any[];
  scorecardProject?: string;
}

interface PSSRStepOneProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  projects: Project[];
  assets: string[];
  reasons: string[];
  projectSearchOpen: boolean;
  setProjectSearchOpen: (open: boolean) => void;
  showAddProjectWidget: boolean;
  setShowAddProjectWidget: (show: boolean) => void;
  onProjectSelect: (value: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onContextAction: (action: string, person: any) => void;
}

const PSSRStepOne: React.FC<PSSRStepOneProps> = ({
  formData,
  setFormData,
  projects,
  assets,
  reasons,
  projectSearchOpen,
  setProjectSearchOpen,
  showAddProjectWidget,
  setShowAddProjectWidget,
  onProjectSelect,
  onFileUpload,
  onRemoveFile,
  onContextAction
}) => {
  const selectedProject = projects.find(p => p.id === formData.projectId);

  return (
    <div className="space-y-8">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">PSSR Information</CardTitle>
              <CardDescription className="text-base text-gray-600 mt-2">
                The PSSR process manages the safe introduction of hydrocarbons into newly constructed facilities. 
                This requires proper assurance and checks by an integrated team from Project, Asset, Engineering and Contractor teams.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="reason" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Reason for PSSR *
              </Label>
              <Select value={formData.reason} onValueChange={(value) => setFormData(prev => ({...prev, reason: value}))}>
                <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((reason) => (
                    <SelectItem key={reason} value={reason} className="py-3">
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.reason && formData.reason !== 'Start-up or Commissioning of a new Asset' && (
              <div className="space-y-3">
                <Label htmlFor="asset" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Select Asset *
                </Label>
                <Select value={formData.asset} onValueChange={(value) => setFormData(prev => ({...prev, asset: value}))}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="Choose an asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset} value={asset} className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {asset}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {formData.reason === 'Start-up or Commissioning of a new Asset' && (
            <div className="p-6 bg-blue-50 rounded-xl border-l-4 border-blue-500">
              <h4 className="font-semibold text-gray-900 mb-4">Project Information</h4>
              
              {/* Project ID Selector moved here */}
              <div className="mb-6">
                <ProjectIDSelector
                  projectId={formData.projectId}
                  projects={projects}
                  projectSearchOpen={projectSearchOpen}
                  onProjectSearchOpenChange={setProjectSearchOpen}
                  onProjectSelect={onProjectSelect}
                />
              </div>

              {/* Project Details */}
              {selectedProject && (
                <ProjectDetails
                  project={selectedProject}
                  onContextAction={onContextAction}
                />
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="scope" className="text-sm font-semibold text-gray-700">Scope Description *</Label>
            <Textarea 
              value={formData.scope}
              onChange={(e) => setFormData(prev => ({...prev, scope: e.target.value}))}
              placeholder="Describe the scope of the PSSR..."
              rows={4}
              className="border-2 border-gray-200 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <FileUploadSection
            files={formData.files}
            onFileUpload={onFileUpload}
            onRemoveFile={onRemoveFile}
          />
        </CardContent>
      </Card>

      <AddNewProjectWidget
        open={showAddProjectWidget}
        onClose={() => setShowAddProjectWidget(false)}
        onSubmit={(projectData) => {
          console.log('New project data:', projectData);
          setShowAddProjectWidget(false);
        }}
      />
    </div>
  );
};

// New component for Project ID Selector
const ProjectIDSelector: React.FC<{
  projectId: string;
  projects: Project[];
  projectSearchOpen: boolean;
  onProjectSearchOpenChange: (open: boolean) => void;
  onProjectSelect: (value: string) => void;
}> = ({ projectId, projects, projectSearchOpen, onProjectSearchOpenChange, onProjectSelect }) => {
  return (
    <div className="space-y-3">
      <Label htmlFor="projectId" className="text-sm font-semibold text-gray-700">Project ID</Label>
      <div className="w-64"> {/* Reduced width */}
        {/* Project search functionality will be implemented here */}
        <Select value={projectId} onValueChange={onProjectSelect}>
          <SelectTrigger className="h-10 border-2 border-gray-200 focus:border-blue-500 transition-colors">
            <SelectValue placeholder="Select project..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id} className="py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">{project.id}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default PSSRStepOne;
