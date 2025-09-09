
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Briefcase, Building2 } from 'lucide-react';
import ProjectSelector from './ProjectSelector';
import ProjectDetails from './ProjectDetails';
import FileUploadSection from './FileUploadSection';

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
}

interface PSSRStepOneProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
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
  setProjects,
  assets,
  reasons,
  projectSearchOpen,
  setProjectSearchOpen,
  onProjectSelect,
  onFileUpload,
  onRemoveFile,
  onContextAction
}) => {
  const selectedProject = projects.find(p => p.id === formData.projectId);

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prevProjects => 
      prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
  };

  const handleNewProjectCreate = (newProject: Project) => {
    setProjects(prevProjects => [...prevProjects, newProject]);
    setFormData(prev => ({ ...prev, projectId: newProject.id, projectName: newProject.name }));
  };

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
              <Select value={formData.reason} onValueChange={(value) => setFormData(prev => ({...prev, reason: value, projectId: '', projectName: '', asset: ''}))}>
                <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="Start-up or Commissioning of a new Asset" className="py-3">
                    Start-up or Commissioning of a new Asset
                  </SelectItem>
                  <SelectItem value="Restart following significant modification to existing Hardware, Safeguarding or Operating Philosophy" className="py-3">
                    Restart following significant modification to existing Hardware, Safeguarding or Operating Philosophy
                  </SelectItem>
                  <SelectItem value="Restart following a process safety incident" className="py-3">
                    Restart following a process safety incident
                  </SelectItem>
                  <SelectItem value="Restart following a Turn Around (TAR) Event or Major Maintenance Activity" className="py-3">
                    Restart following a Turn Around (TAR) Event or Major Maintenance Activity
                  </SelectItem>
                  <SelectItem value="Others (Specify)" className="py-3">
                    Others (Specify)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.reason && formData.reason !== 'Start-up or Commissioning of a new Asset' && (
              <div className="space-y-3">
                <Label htmlFor="asset" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Select Plant *
                </Label>
                <Select value={formData.asset} onValueChange={(value) => setFormData(prev => ({...prev, asset: value}))}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="Choose a plant" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="Umm Qasr (UQ)" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Umm Qasr (UQ)
                      </div>
                    </SelectItem>
                    <SelectItem value="KAZ" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        KAZ
                      </div>
                    </SelectItem>
                    <SelectItem value="NRNGL" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        NRNGL
                      </div>
                    </SelectItem>
                    <SelectItem value="BNGL" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        BNGL
                      </div>
                    </SelectItem>
                    <SelectItem value="Compression Station (CS)" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Compression Station (CS)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* CS Section Selection */}
                {formData.asset === 'Compression Station (CS)' && (
                  <div className="mt-4 space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">CS Section *</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({...prev, asset: `Compression Station (${value})`}))}>
                      <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Select CS section" />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-50">
                        <SelectItem value="Zubair" className="py-3">Zubair</SelectItem>
                        <SelectItem value="West Qurna (WQ)" className="py-3">West Qurna (WQ)</SelectItem>
                        <SelectItem value="North Rumaila (NR)" className="py-3">North Rumaila (NR)</SelectItem>
                        <SelectItem value="South Rumaila (SR)" className="py-3">South Rumaila (SR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {formData.reason === 'Start-up or Commissioning of a new Asset' && (
            <div className="p-6 bg-blue-50 rounded-xl">
              
              <div className="mb-4">
                <div className="w-64">
                  <ProjectSelector
                    projectId={formData.projectId}
                    projectName={formData.projectName}
                    projects={projects}
                    projectSearchOpen={projectSearchOpen}
                    onProjectSearchOpenChange={setProjectSearchOpen}
                    onProjectSelect={onProjectSelect}
                    onProjectNameChange={(name) => setFormData(prev => ({...prev, projectName: name}))}
                    onNewProjectCreate={handleNewProjectCreate}
                  />
                </div>
              </div>

              {/* Project Details */}
              {selectedProject && (
                <ProjectDetails
                  project={selectedProject}
                  onContextAction={onContextAction}
                  onProjectUpdate={handleProjectUpdate}
                />
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="scope" className="text-sm font-semibold text-gray-700">PSSR Scope *</Label>
            <div className="space-y-2">
              <Textarea 
                value={formData.scope}
                onChange={(e) => setFormData(prev => ({...prev, scope: e.target.value}))}
                placeholder="Describe the scope of the PSSR. You can paste images here..."
                rows={6}
                className="border-2 border-gray-200 focus:border-blue-500 transition-colors resize-none"
              />
              <p className="text-xs text-gray-500">
                Tip: You can paste images directly into the description box using Ctrl+V
              </p>
            </div>
          </div>

          <FileUploadSection
            files={formData.files}
            onFileUpload={onFileUpload}
            onRemoveFile={onRemoveFile}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PSSRStepOne;
