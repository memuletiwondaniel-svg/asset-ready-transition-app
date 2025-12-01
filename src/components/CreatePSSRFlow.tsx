import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PSSRChecklist from './PSSRChecklist';
import AddNewProjectWidget from './AddNewProjectWidget';
import ProgressSteps from './ProgressSteps';
import PSSRStepOne from './PSSRStepOne';
import PSSRStepTwo from './PSSRStepTwo';
import { useProjects, useProjectTeamMembers } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreatePSSRFlowProps {
  onBack: () => void;
}

interface Project {
  id: string;
  name: string;
  plant: string;
  subdivision?: string;
  scope: string;
  milestone?: string;
  scorecardProject?: string;
  hubLead: any;
  others: any[];
}

const CreatePSSRFlow: React.FC<CreatePSSRFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAddProjectWidget, setShowAddProjectWidget] = useState(false);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const { 
    projects: dbProjects, 
    isLoading, 
    createProject,
    isCreating 
  } = useProjects();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    asset: '',
    reason: '',
    reasonSubOption: '',
    tieInScopes: [] as string[],
    mocNumber: '',
    mocScope: '',
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
    'Umm Qasr (UQ)',
    'KAZ',
    'NRNGL', 
    'BNGL',
    'Compressor Station (CS)'
  ];

  const reasons = [
    'Start-up or Commissioning of a new Asset',
    'Restart following significant modification to existing Hardware, Safeguarding or Operating Philosophy',
    'Restart following a process safety incident',
    'Restart following a Turn Around (TAR) Event or Major Maintenance Activity',
    'Others (Specify)'
  ];

  // Convert database projects to the format expected by the UI
  const projects: Project[] = dbProjects?.map(p => ({
    id: `${p.project_id_prefix} ${p.project_id_number}`,
    name: p.project_title,
    plant: p.plant_name || '',
    subdivision: p.station_name,
    scope: p.project_scope || '',
    hubLead: {
      name: 'Hub Lead',
      email: '',
      avatar: '',
      status: 'green'
    },
    others: []
  })) || [];

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
    const selectedProject = projects.find(p => p.id === value);
    setFormData(prev => ({
      ...prev,
      projectId: value,
      projectName: selectedProject?.name || ''
    }));
    setProjectSearchOpen(false);
  };

  const handleNewProjectCreate = async (projectData: any) => {
    try {
      console.log('Creating new project:', projectData);
      
      // Find or create plant, station, hub IDs
      const { data: plants } = await supabase.from('plant').select('*').eq('name', projectData.plant).single();
      const { data: stations } = projectData.csLocation 
        ? await supabase.from('station').select('*').eq('name', projectData.csLocation).maybeSingle()
        : { data: null };
      const { data: hubs } = await supabase.from('hubs').select('*').limit(1).maybeSingle();
      
      // Create the project in database
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert([{
          project_id_prefix: projectData.projectId.split(' ')[0],
          project_id_number: projectData.projectId.split(' ')[1] || projectData.projectId,
          project_title: projectData.projectTitle,
          plant_id: plants?.id,
          station_id: stations?.id,
          hub_id: hubs?.id,
          project_scope: projectData.projectScope,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error);
        toast({
          title: 'Error',
          description: 'Failed to create project in database',
          variant: 'destructive',
        });
        return;
      }

      // Create team members if project was created successfully
      if (newProject && projectData.projectHubLead?.name) {
        const teamMembers = [
          { role: 'Project Hub Lead', ...projectData.projectHubLead, is_lead: true },
          ...(projectData.commissioningLead?.name ? [{ role: 'Commissioning Lead', ...projectData.commissioningLead }] : []),
          ...(projectData.constructionLead?.name ? [{ role: 'Construction Lead', ...projectData.constructionLead }] : []),
          ...projectData.additionalPersons.map((person: any) => ({ ...person }))
        ];

        // Note: In a real implementation, you would map these team members to actual user IDs
        // For now, we'll just store the project and the UI will work with the local data
      }

      toast({
        title: 'Success',
        description: 'Project created successfully',
      });

      // Set the form data to use this new project
      const projectId = `${newProject.project_id_prefix} ${newProject.project_id_number}`;
      setFormData(prev => ({
        ...prev,
        projectId: projectId,
        projectName: newProject.project_title
      }));
      
      setShowAddProjectWidget(false);
    } catch (error) {
      console.error('Error in handleNewProjectCreate:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    }
  };

  const handleContextAction = (action: string, person: any) => {
    switch (action) {
      case 'chat':
        window.open(`msteams:/l/chat/0/0?users=${person.email}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:${person.email}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(person.email);
        break;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PSSRStepOne
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            assets={assets}
            reasons={reasons}
            projectSearchOpen={projectSearchOpen}
            setProjectSearchOpen={setProjectSearchOpen}
            showAddProjectWidget={false}
            setShowAddProjectWidget={setShowAddProjectWidget}
            onProjectSelect={handleProjectSelect}
            onFileUpload={handleFileUpload}
            onRemoveFile={removeFile}
            onContextAction={handleContextAction}
            onNewProjectCreate={handleNewProjectCreate}
          />
        );

      case 2:
        return (
          <PSSRStepTwo
            formData={formData}
            onBack={onBack}
            onContinueToChecklist={() => setCurrentStep(3)}
          />
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
        <ProgressSteps currentStep={currentStep} />
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
        onSubmit={handleNewProjectCreate}
      />
    </div>
  );
};

export default CreatePSSRFlow;
