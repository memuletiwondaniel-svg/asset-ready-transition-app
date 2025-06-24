import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Save, Upload, X, CheckCircle, ClipboardCheck, FileText, Building2, Briefcase, Plus, User, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PSSRChecklist from './PSSRChecklist';
import AddNewProjectWidget from './AddNewProjectWidget';

interface CreatePSSRFlowProps {
  onBack: () => void;
}

const CreatePSSRFlow: React.FC<CreatePSSRFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAddProjectWidget, setShowAddProjectWidget] = useState(false);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const [formData, setFormData] = useState({
    asset: '',
    reason: '',
    projectId: '',
    projectName: '',
    scope: '',
    files: [] as File[],
    teamMembers: {
      technicalAuthorities: {},
      assetTeam: {},
      projectTeam: {},
      hsse: {}
    }
  });

  const assets = [
    'KAZ',
    'NRNGL',
    'UQ',
    'Compressor Station (CS)',
    'BNGL'
  ];

  const reasons = [
    'Start-up or Commissioning of a new Asset',
    'Restart following significant modification to an existing Asset\'s Hardware, Safeguarding or Operating Philosophy',
    'Restart following a process safety incident',
    'Others (specify in the Scope Description)'
  ];

  // Extended projects list with team information
  const projects = [
    { 
      id: 'DP 300', 
      name: 'HM Additional Compressors',
      hubLead: {
        name: 'Ahmed Al-Rashid',
        avatar: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=150&h=150&fit=crop&crop=face'
      },
      others: [
        {
          name: 'Sarah Johnson',
          role: 'Commissioning Lead',
          avatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face'
        },
        {
          name: 'Mohammed Hassan',
          role: 'Construction Lead',
          avatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face'
        }
      ]
    },
    { 
      id: 'DP 163', 
      name: 'LPG Unit 12.1 Rehabilitation',
      hubLead: {
        name: 'Omar Al-Basri',
        avatar: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=150&h=150&fit=crop&crop=face'
      },
      others: [
        {
          name: 'Lisa Chen',
          role: 'Commissioning Lead',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        }
      ]
    },
    { 
      id: 'DP 083C', 
      name: 'UQ Jetty 2 Export Terminal',
      hubLead: {
        name: 'David Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      others: [
        {
          name: 'Elena Petrov',
          role: 'Construction Lead',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=150&h=150&fit=crop&crop=face'
        },
        {
          name: 'Marcus Thompson',
          role: 'Commissioning Lead',
          avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face'
        }
      ]
    },
    { 
      id: 'DP 317', 
      name: 'Majnoon New Gas Tie-in',
      hubLead: {
        name: 'Fatima Al-Zahra',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
      },
      others: [
        {
          name: 'John Mitchell',
          role: 'Construction Lead',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
        }
      ]
    },
    { 
      id: 'DP 33A', 
      name: 'Hammar New TEG',
      hubLead: {
        name: 'Yasmin Ibrahim',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face'
      },
      others: []
    },
    { 
      id: 'DP 368', 
      name: 'CS7 to CS6 Cross-over Line',
      hubLead: {
        name: 'Ali Hassan',
        avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face'
      },
      others: [
        {
          name: 'Nina Volkov',
          role: 'Commissioning Lead',
          avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&h=150&fit=crop&crop=face'
        }
      ]
    },
    { 
      id: 'DP 245', 
      name: 'KAZ Flare System Upgrade',
      hubLead: {
        name: 'Karim Al-Sudani',
        avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face'
      },
      others: []
    },
    { 
      id: 'DP 156', 
      name: 'NRNGL Gas Processing Enhancement',
      hubLead: {
        name: 'Layla Mahmoud',
        avatar: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=150&h=150&fit=crop&crop=face'
      },
      others: [
        {
          name: 'Robert Kim',
          role: 'Construction Lead',
          avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'
        }
      ]
    },
    { 
      id: 'DP 421', 
      name: 'BNGL Storage Tank Expansion',
      hubLead: {
        name: 'Noor Al-Tamimi',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'
      },
      others: []
    },
    { 
      id: 'DP 289', 
      name: 'UQ Pipeline Integrity Project',
      hubLead: {
        name: 'Hassan Al-Baghdadi',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop&crop=face'
      },
      others: [
        {
          name: 'Maria Santos',
          role: 'Commissioning Lead',
          avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face'
        },
        {
          name: 'James Wilson',
          role: 'Construction Lead',
          avatar: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=150&h=150&fit=crop&crop=face'
        }
      ]
    }
  ];

  const handleContinue = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setCurrentStep(2);
    setShowConfirmDialog(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleProjectSelect = (value: string) => {
    if (value === 'add-new') {
      setShowAddProjectWidget(true);
      setProjectSearchOpen(false);
    } else {
      const selectedProject = projects.find(p => p.id === value);
      setFormData(prev => ({
        ...prev,
        projectId: value,
        projectName: selectedProject?.name || ''
      }));
      setProjectSearchOpen(false);
      setShowOthers(false); // Reset others view when selecting new project
    }
  };

  const handleNewProjectAdded = (projectData: any) => {
    setFormData(prev => ({
      ...prev,
      projectId: projectData.projectId,
      projectName: projectData.projectTitle
    }));
    setShowAddProjectWidget(false);
  };

  const selectedProject = projects.find(p => p.id === formData.projectId);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="projectId" className="text-sm font-semibold text-gray-700">Project ID</Label>
                        <Popover open={projectSearchOpen} onOpenChange={setProjectSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={projectSearchOpen}
                              className="h-12 w-full justify-between border-2 border-gray-200 focus:border-blue-500 transition-colors"
                            >
                              {formData.projectId
                                ? `${formData.projectId} - ${projects.find((project) => project.id === formData.projectId)?.name}`
                                : "Search projects..."}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search projects..." className="h-9" />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-6 text-center">
                                    <div className="mx-auto mb-4 p-3 bg-gray-100 rounded-full w-fit">
                                      <Search className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">
                                      No projects found matching your search.
                                    </p>
                                    <Button
                                      variant="outline"
                                      onClick={() => handleProjectSelect('add-new')}
                                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add New Project
                                    </Button>
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {projects.map((project) => (
                                    <CommandItem
                                      key={project.id}
                                      value={`${project.id} ${project.name}`}
                                      onSelect={() => handleProjectSelect(project.id)}
                                      className="py-3"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span className="font-medium">{project.id}</span>
                                        <span className="text-gray-600">- {project.name}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                  <CommandItem
                                    value="add-new-project"
                                    onSelect={() => handleProjectSelect('add-new')}
                                    className="py-3 border-t border-gray-200 bg-blue-50"
                                  >
                                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                                      <Plus className="h-4 w-4" />
                                      Add New Project
                                    </div>
                                  </CommandItem>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="projectName" className="text-sm font-semibold text-gray-700">Project Name</Label>
                        <Input 
                          value={formData.projectName} 
                          onChange={(e) => setFormData(prev => ({...prev, projectName: e.target.value}))}
                          placeholder="Project name"
                          className="h-12 border-2 border-gray-200 focus:border-blue-500 transition-colors"
                          disabled={formData.projectId && formData.projectId !== 'add-new'}
                        />
                      </div>
                    </div>

                    {/* Project Details Section */}
                    {selectedProject && (
                      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-4">Project Team</h5>
                        
                        {/* Project Hub Lead */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={selectedProject.hubLead.avatar} alt={selectedProject.hubLead.name} />
                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                  {selectedProject.hubLead.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">{selectedProject.hubLead.name}</p>
                                <p className="text-sm text-gray-600">Project Hub Lead</p>
                              </div>
                            </div>
                          </div>

                          {/* Others Section */}
                          {selectedProject.others.length > 0 && (
                            <div className="border-t border-gray-200 pt-4">
                              <Button
                                variant="ghost"
                                onClick={() => setShowOthers(!showOthers)}
                                className="w-full justify-between p-3 hover:bg-gray-50"
                              >
                                <span className="font-medium text-gray-700">
                                  Others ({selectedProject.others.length})
                                </span>
                                {showOthers ? (
                                  <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                              
                              {showOthers && (
                                <div className="space-y-2 mt-2">
                                  {selectedProject.others.map((member, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.avatar} alt={member.name} />
                                        <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                                          {member.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                        <p className="text-xs text-gray-600">{member.role}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
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

                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-gray-700">Supporting Documents</Label>
                  <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                    <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Click to upload files or drag and drop
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      PDF, DOC, XLS files up to 10MB each
                    </p>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button 
                      variant="outline" 
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Choose Files
                    </Button>
                  </div>
                  
                  {formData.files.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">Uploaded Files</h5>
                      <div className="space-y-2">
                        {formData.files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <Button 
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto mb-6 p-4 bg-green-100 rounded-full w-fit">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900">PSSR Created Successfully</CardTitle>
                <CardDescription className="text-lg text-gray-600 mt-2">
                  Your PSSR has been created with ID: <Badge variant="secondary" className="ml-2 text-base">PSSR-2024-004</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-8">
                  <p className="text-gray-600 mb-6 text-lg">
                    You can now proceed to complete the PSSR checklist.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      onClick={() => setCurrentStep(3)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                    >
                      <ClipboardCheck className="h-5 w-5 mr-2" />
                      Continue to Checklist
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={onBack}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg"
                    >
                      Return to PSSR List
                    </Button>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-8">
                  <h4 className="font-bold text-xl text-gray-900 mb-6">PSSR Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formData.asset && (
                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                        <span className="text-sm text-gray-500 block mb-1">Asset</span>
                        <span className="text-lg font-semibold text-gray-900">{formData.asset}</span>
                      </div>
                    )}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-500 block mb-1">Reason</span>
                      <span className="text-lg font-semibold text-gray-900">{formData.reason}</span>
                    </div>
                    {formData.projectId && (
                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                        <span className="text-sm text-gray-500 block mb-1">Project ID</span>
                        <span className="text-lg font-semibold text-gray-900">{formData.projectId}</span>
                      </div>
                    )}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-500 block mb-1">Uploaded Files</span>
                      <span className="text-lg font-semibold text-gray-900">{formData.files.length} files</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return <PSSRChecklist />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} className="hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PSSR List
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentStep === 1 ? "Create New PSSR" : currentStep === 2 ? "PSSR Created" : "PSSR Checklist"}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Progress Steps */}
        {currentStep <= 2 && (
          <div className="mb-12">
            <div className="flex items-center justify-center">
              <div className="flex items-center">
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  currentStep >= 1 ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
                }`}>
                  <span className="font-bold">1</span>
                  {currentStep >= 1 && (
                    <div className="absolute inset-0 rounded-full bg-blue-600 animate-pulse opacity-30"></div>
                  )}
                </div>
                <div className="ml-4 text-left">
                  <span className="block text-sm font-medium text-gray-900">Step 1</span>
                  <span className="block text-xs text-gray-500">PSSR Information</span>
                </div>
              </div>
              <div className={`flex-1 h-2 mx-8 rounded-full transition-all duration-500 ${
                currentStep >= 2 ? 'bg-gradient-to-r from-blue-600 to-green-500' : 'bg-gray-300'
              }`}></div>
              <div className="flex items-center">
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  currentStep >= 2 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
                }`}>
                  <span className="font-bold">2</span>
                  {currentStep >= 2 && (
                    <div className="absolute inset-0 rounded-full bg-green-600 animate-pulse opacity-30"></div>
                  )}
                </div>
                <div className="ml-4 text-left">
                  <span className="block text-sm font-medium text-gray-900">Step 2</span>
                  <span className="block text-xs text-gray-500">Confirmation</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {renderStepContent()}

        {/* Enhanced Navigation */}
        {currentStep === 1 && (
          <div className="flex justify-between mt-12">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3"
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleContinue} 
              disabled={!formData.reason || !formData.scope || (formData.reason !== 'Start-up or Commissioning of a new Asset' && !formData.asset)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </main>

      {/* Enhanced Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <DialogTitle className="text-center text-xl">Create PSSR</DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Are you ready to create this PSSR? Once created, a unique ID will be generated and you can proceed to complete the checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center space-x-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Project Widget */}
      <AddNewProjectWidget
        open={showAddProjectWidget}
        onClose={() => setShowAddProjectWidget(false)}
        onSubmit={handleNewProjectAdded}
      />
    </div>
  );
};

export default CreatePSSRFlow;
