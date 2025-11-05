
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { FileText, Building2 } from 'lucide-react';
import ProjectSelector from './ProjectSelector';
import ProjectDetails from './ProjectDetails';
import FileUploadSection from './FileUploadSection';
import { usePSSRReasons, usePSSRReasonSubOptions, usePSSRTieInScopes, usePSSRMOCScopes } from '@/hooks/usePSSRReasons';

interface FormData {
  asset: string;
  reason: string;
  reasonSubOption: string;
  tieInScopes: string[];
  mocNumber: string;
  mocScope: string;
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
  const { data: pssrReasons = [] } = usePSSRReasons();
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const { data: reasonSubOptions = [] } = usePSSRReasonSubOptions(selectedReasonId);
  const { data: tieInScopes = [] } = usePSSRTieInScopes();
  const { data: mocScopes = [] } = usePSSRMOCScopes();

  // Update selected reason ID when formData.reason changes
  useEffect(() => {
    const selectedReason = pssrReasons.find(r => r.name === formData.reason);
    setSelectedReasonId(selectedReason?.id || null);
  }, [formData.reason, pssrReasons]);

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
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="reason" className="text-sm font-semibold text-gray-700">
                Reason for PSSR *
              </Label>
              <Select 
                value={formData.reason} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev, 
                  reason: value, 
                  projectId: '', 
                  projectName: '', 
                  asset: '',
                  reasonSubOption: '',
                  tieInScopes: [],
                  mocNumber: '',
                  mocScope: ''
                }))}
              >
                <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={8} className="bg-white z-[100] shadow-xl border rounded-md">
                  {pssrReasons.map((r) => (
                    <SelectItem key={r.id} value={r.name} className="py-3">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-options for "Restart following plant changes or modifications" */}
            {formData.reason === 'Restart following plant changes or modifications' && reasonSubOptions.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Change Type *</Label>
                <Select 
                  value={formData.reasonSubOption} 
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev, 
                    reasonSubOption: value,
                    tieInScopes: [],
                    mocNumber: '',
                    mocScope: ''
                  }))}
                >
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="Select change type" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={8} className="bg-white z-[100] shadow-xl border rounded-md">
                    {reasonSubOptions.map((option) => (
                      <SelectItem key={option.id} value={option.name} className="py-3">
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tie-in scopes selection */}
            {formData.reasonSubOption === 'Project Advanced Tie-in scope' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <Label className="text-sm font-semibold text-gray-700">Select Tie-in Scope(s) *</Label>
                <div className="space-y-3">
                  {tieInScopes.map((scope) => (
                    <div key={scope.id} className="flex items-start space-x-3 p-3 bg-white rounded-md border border-gray-200">
                      <Checkbox
                        id={scope.id}
                        checked={formData.tieInScopes?.includes(scope.code) || false}
                        onCheckedChange={(checked) => {
                          const currentScopes = formData.tieInScopes || [];
                          setFormData(prev => ({
                            ...prev,
                            tieInScopes: checked
                              ? [...currentScopes, scope.code]
                              : currentScopes.filter(s => s !== scope.code)
                          }));
                        }}
                      />
                      <div className="flex-1">
                        <label htmlFor={scope.id} className="text-sm font-medium cursor-pointer">
                          {scope.code}
                        </label>
                        <p className="text-xs text-gray-600 mt-1">{scope.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MOC Number and Scope */}
            {formData.reasonSubOption === 'Implementation of an approved Asset MOC' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="space-y-3">
                  <Label htmlFor="mocNumber" className="text-sm font-semibold text-gray-700">
                    MOC Number *
                  </Label>
                  <Input
                    id="mocNumber"
                    value={formData.mocNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, mocNumber: e.target.value }))}
                    placeholder="Enter MOC number"
                    className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">MOC Scope *</Label>
                  <Select 
                    value={formData.mocScope} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, mocScope: value }))}
                  >
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                      <SelectValue placeholder="Select MOC scope" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={8} className="bg-white z-[100] shadow-xl border rounded-md">
                      {mocScopes.map((scope) => (
                        <SelectItem key={scope.id} value={scope.name} className="py-3">
                          {scope.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {formData.reason && formData.reason !== 'Start-Up or Commissioning of a new Facility or Project' && (
              <div className="space-y-3">
                <Label htmlFor="asset" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Select Plant *
                </Label>
                <Select value={formData.asset} onValueChange={(value) => setFormData(prev => ({...prev, asset: value}))}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="Choose a plant" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={8} className="bg-white z-[100] shadow-xl border rounded-md">
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
                
                {/* CS Section Selection */}
                {/(Compression|Compressor) Station/.test(formData.asset) && (
                  <div className="mt-4 space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">CS Section *</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({...prev, asset: `Compression Station (${value})`}))}>
                      <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Select CS section" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={8} className="bg-white z-[100] shadow-xl border rounded-md">
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

          {formData.reason === 'Start-Up or Commissioning of a new Facility or Project' && (
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
              <div className="relative">
                <Textarea 
                  id="scope"
                  value={formData.scope}
                  onChange={(e) => setFormData(prev => ({...prev, scope: e.target.value}))}
                  onPaste={async (e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    
                    for (let i = 0; i < items.length; i++) {
                      const item = items[i];
                      if (item.type.startsWith('image/')) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                          try {
                            // Show temporary loading indicator
                            const currentCursor = e.currentTarget.selectionStart;
                            const beforeCursor = formData.scope.substring(0, currentCursor);
                            const afterCursor = formData.scope.substring(currentCursor);
                            
                            // Temporarily show "Processing image..." text
                            setFormData(prev => ({
                              ...prev, 
                              scope: beforeCursor + "[Processing image...]" + afterCursor
                            }));
                            
                            // Convert image to base64
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              const timestamp = new Date().toLocaleTimeString();
                              const imageMarkdown = `![Pasted Image ${timestamp}](${base64})`;
                              
                              // Replace the processing text with the actual image
                              setFormData(prev => ({
                                ...prev, 
                                scope: beforeCursor + imageMarkdown + afterCursor
                              }));
                            };
                            reader.onerror = () => {
                              // Remove processing text on error
                              setFormData(prev => ({
                                ...prev, 
                                scope: beforeCursor + afterCursor
                              }));
                              alert('Failed to process image. Please try again.');
                            };
                            reader.readAsDataURL(file);
                          } catch (error) {
                            console.error('Error processing pasted image:', error);
                            alert('Error processing image. Please try again.');
                          }
                        }
                        break;
                      }
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const files = Array.from(e.dataTransfer.files);
                    const imageFiles = files.filter(file => file.type.startsWith('image/'));
                    
                    if (imageFiles.length > 0) {
                      imageFiles.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          const timestamp = new Date().toLocaleTimeString();
                          const imageMarkdown = `\n\n![Dropped Image ${timestamp}](${base64})\n\n`;
                          
                          setFormData(prev => ({
                            ...prev, 
                            scope: prev.scope + imageMarkdown
                          }));
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  placeholder="Describe the scope of the PSSR. You can paste images here using Ctrl+V or drag and drop images..."
                  rows={6}
                  className="border-2 border-gray-200 focus:border-blue-500 transition-colors resize-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>💡 Pro tip: Paste images with Ctrl+V or drag and drop image files directly into the text area</span>
              </div>
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
