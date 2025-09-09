import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PSSRChecklist from './PSSRChecklist';
import AddNewProjectWidget from './AddNewProjectWidget';
import ProgressSteps from './ProgressSteps';
import PSSRStepOne from './PSSRStepOne';
import PSSRStepTwo from './PSSRStepTwo';

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

  // Extended projects list with team, plant, and scope information
  const [projects, setProjects] = useState<Project[]>([
    { 
      id: 'DP 300', 
      name: 'HM Additional Compressors',
      plant: 'KAZ',
      subdivision: 'CS-7',
      scope: 'Installation and commissioning of two new gas compressors to increase processing capacity at Hammar field. Includes tie-in to existing infrastructure, safety systems integration, and performance testing.',
      hubLead: {
        name: 'Ahmed Al-Rashid',
        email: 'ahmed.alrashid@company.com',
        avatar: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'Sarah Johnson',
          role: 'Commissioning Lead',
          email: 'sarah.johnson@company.com',
          avatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        },
        {
          name: 'Mohammed Hassan',
          role: 'Construction Lead',
          email: 'mohammed.hassan@company.com',
          avatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face',
          status: 'amber'
        }
      ]
    },
    { 
      id: 'DP 163', 
      name: 'LPG Unit 12.1 Rehabilitation',
      plant: 'NRNGL',
      scope: 'Major rehabilitation of LPG processing unit including vessel replacements, piping upgrades, and control system modernization to restore full operational capacity.',
      hubLead: {
        name: 'Omar Al-Basri',
        email: 'omar.albasri@company.com',
        avatar: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'Lisa Chen',
          role: 'Commissioning Lead',
          email: 'lisa.chen@company.com',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          status: 'red'
        }
      ]
    },
    { 
      id: 'DP 083C', 
      name: 'UQ Jetty 2 Export Terminal',
      plant: 'UQ',
      scope: 'Construction of new marine export terminal with loading arms, metering systems, and safety equipment for enhanced export capacity.',
      hubLead: {
        name: 'David Rodriguez',
        email: 'david.rodriguez@company.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        status: 'amber'
      },
      others: [
        {
          name: 'Elena Petrov',
          role: 'Construction Lead',
          email: 'elena.petrov@company.com',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        },
        {
          name: 'Marcus Thompson',
          role: 'Commissioning Lead',
          email: 'marcus.thompson@company.com',
          avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        }
      ]
    },
    { 
      id: 'DP 317', 
      name: 'Majnoon New Gas Tie-in',
      plant: 'Compressor Station (CS)',
      subdivision: 'CS-3',
      scope: 'Installation of new gas tie-in pipeline from Majnoon field to existing compressor station with pressure regulation and metering facilities.',
      hubLead: {
        name: 'Fatima Al-Zahra',
        email: 'fatima.alzahra@company.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'John Mitchell',
          role: 'Construction Lead',
          email: 'john.mitchell@company.com',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
          status: 'amber'
        }
      ]
    },
    { 
      id: 'DP 33A', 
      name: 'Hammar New TEG',
      plant: 'BNGL',
      scope: 'Installation of new Triethylene Glycol (TEG) dehydration unit for natural gas processing with regeneration system and utilities.',
      hubLead: {
        name: 'Yasmin Ibrahim',
        email: 'yasmin.ibrahim@company.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: []
    },
    { 
      id: 'DP 368', 
      name: 'CS7 to CS6 Cross-over Line',
      plant: 'Compressor Station (CS)',
      subdivision: 'CS-6',
      scope: 'Construction of cross-over pipeline between CS7 and CS6 compressor stations for operational flexibility and emergency backup.',
      hubLead: {
        name: 'Ali Hassan',
        email: 'ali.hassan@company.com',
        avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
        status: 'red'
      },
      others: [
        {
          name: 'Nina Volkov',
          role: 'Commissioning Lead',
          email: 'nina.volkov@company.com',
          avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        }
      ]
    },
    { 
      id: 'DP 245', 
      name: 'KAZ Flare System Upgrade',
      plant: 'KAZ',
      scope: 'Upgrade of existing flare system with new flare tip, knockout drum, and enhanced safety systems for improved environmental compliance.',
      hubLead: {
        name: 'Karim Al-Sudani',
        email: 'karim.alsudani@company.com',
        avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face',
        status: 'amber'
      },
      others: []
    },
    { 
      id: 'DP 156', 
      name: 'NRNGL Gas Processing Enhancement',
      plant: 'NRNGL',
      scope: 'Enhancement of gas processing capabilities through installation of additional separation equipment and process optimization systems.',
      hubLead: {
        name: 'Layla Mahmoud',
        email: 'layla.mahmoud@company.com',
        avatar: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'Robert Kim',
          role: 'Construction Lead',
          email: 'robert.kim@company.com',
          avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        }
      ]
    },
    { 
      id: 'DP 421', 
      name: 'BNGL Storage Tank Expansion',
      plant: 'BNGL',
      scope: 'Construction of additional storage tanks with associated piping, instrumentation, and fire protection systems to increase storage capacity.',
      hubLead: {
        name: 'Noor Al-Tamimi',
        email: 'noor.altamimi@company.com',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        status: 'amber'
      },
      others: []
    },
    { 
      id: 'DP 289', 
      name: 'UQ Pipeline Integrity Project',
      plant: 'UQ',
      scope: 'Comprehensive pipeline integrity assessment and rehabilitation including smart pig runs, coating repairs, and cathodic protection upgrades.',
      hubLead: {
        name: 'Hassan Al-Baghdadi',
        email: 'hassan.albaghdadi@company.com',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'Maria Santos',
          role: 'Commissioning Lead',
          email: 'maria.santos@company.com',
          avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
          status: 'red'
        },
        {
          name: 'James Wilson',
          role: 'Construction Lead',
          email: 'james.wilson@company.com',
          avatar: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=150&h=150&fit=crop&crop=face',
          status: 'amber'
        }
      ]
    }
  ]);

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
    }
  };

  const handleNewProjectAdded = (projectData: any) => {
    console.log('New project data received:', projectData);
    
    // Create a complete project object with all fields
    const newProject: Project = {
      id: projectData.projectId,
      name: projectData.projectTitle,
      plant: projectData.plant,
      subdivision: projectData.csLocation || undefined,
      scope: projectData.projectScope,
      milestone: projectData.projectMilestone,
      scorecardProject: projectData.scorecardProject,
      hubLead: {
        ...projectData.projectHubLead,
        role: 'Project Hub Lead'
      },
      others: [
        ...(projectData.commissioningLead?.name ? [{
          ...projectData.commissioningLead,
          role: 'Commissioning Lead'
        }] : []),
        ...(projectData.constructionLead?.name ? [{
          ...projectData.constructionLead,
          role: 'Construction Lead'
        }] : []),
        ...projectData.additionalPersons.map((person: any) => ({
          name: person.name,
          email: person.email,
          avatar: person.avatar || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`,
          status: person.status || 'green',
          role: person.role
        }))
      ]
    };

    // Add the new project to the projects list
    setProjects(prev => [...prev, newProject]);
    
    // Set the form data to use this new project
    setFormData(prev => ({
      ...prev,
      projectId: projectData.projectId,
      projectName: projectData.projectTitle
    }));
    
    setShowAddProjectWidget(false);
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
            data={formData}
            onDataUpdate={() => {}}
            onNext={() => setCurrentStep(2)}
            onBack={onBack}
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            setProjects={setProjects}
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
          />
        );

      case 2:
        return (
          <PSSRStepTwo
            data={formData}
            onDataUpdate={() => {}}
            onNext={() => setCurrentStep(3)}
            onBack={onBack}
            formData={formData}
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
        onSubmit={handleNewProjectAdded}
      />
    </div>
  );
};

export default CreatePSSRFlow;
