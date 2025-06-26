import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ChevronDown } from 'lucide-react';
import { ProjectInformationSection } from './project/ProjectInformationSection';
import { TeamMembersSection } from './project/TeamMembersSection';
import { ProjectDocumentsSection } from './project/ProjectDocumentsSection';

interface AddNewProjectWidgetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (projectData: any) => void;
  editMode?: boolean;
  existingProject?: any;
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

interface DocumentFilter {
  project: string;
  originator: string;
  plant: string;
  site: string;
  unit: string;
  discipline: string;
  docType: string;
  sequence: string;
}

const AddNewProjectWidget: React.FC<AddNewProjectWidgetProps> = ({ 
  open, 
  onClose, 
  onSubmit, 
  editMode = false, 
  existingProject 
}) => {
  const [formData, setFormData] = useState({
    projectId: '',
    projectTitle: '',
    projectScope: '',
    projectMilestone: '',
    plant: '',
    csLocation: '',
    scorecardProject: '',
    projectHubLead: { name: '', email: '' } as TeamMember,
    commissioningLead: { name: '', email: '' } as TeamMember,
    constructionLead: { name: '', email: '' } as TeamMember,
    additionalPersons: [] as AdditionalPerson[],
    supportingDocs: [] as File[]
  });

  const [documentFilters, setDocumentFilters] = useState<DocumentFilter>({
    project: '',
    originator: '',
    plant: '',
    site: '',
    unit: '',
    discipline: '',
    docType: '',
    sequence: ''
  });

  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Initialize form data when in edit mode
  useEffect(() => {
    if (editMode && existingProject) {
      setFormData(existingProject);
    } else if (!editMode) {
      // Reset form for new project
      setFormData({
        projectId: '',
        projectTitle: '',
        projectScope: '',
        projectMilestone: '',
        plant: '',
        csLocation: '',
        scorecardProject: '',
        projectHubLead: { name: '', email: '' },
        commissioningLead: { name: '', email: '' },
        constructionLead: { name: '', email: '' },
        additionalPersons: [],
        supportingDocs: []
      });
    }
  }, [editMode, existingProject, open]);

  // Check for scroll indicator
  useEffect(() => {
    const checkScroll = () => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        const hasScroll = scrollArea.scrollHeight > scrollArea.clientHeight;
        const isAtBottom = scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 10;
        setShowScrollIndicator(hasScroll && !isAtBottom);
      }
    };

    if (open) {
      setTimeout(checkScroll, 100);
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.addEventListener('scroll', checkScroll);
        return () => scrollArea.removeEventListener('scroll', checkScroll);
      }
    }
  }, [open]);

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

  // Document filter options
  const filterOptions = {
    project: ['Project A', 'Project B', 'Project C'],
    originator: ['Engineering', 'Construction', 'Operations'],
    plant: plants,
    site: ['Site 1', 'Site 2', 'Site 3'],
    unit: ['Unit 100', 'Unit 200', 'Unit 300'],
    discipline: ['Mechanical', 'Electrical', 'Instrumentation', 'Civil'],
    docType: ['Drawing', 'Specification', 'Report', 'Manual'],
    sequence: ['001', '002', '003', '004']
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    if (!editMode) {
      // Reset form only for new projects
      setFormData({
        projectId: '',
        projectTitle: '',
        projectScope: '',
        projectMilestone: '',
        plant: '',
        csLocation: '',
        scorecardProject: '',
        projectHubLead: { name: '', email: '' },
        commissioningLead: { name: '', email: '' },
        constructionLead: { name: '', email: '' },
        additionalPersons: [],
        supportingDocs: []
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
              <Plus className="h-5 w-5 text-white" />
            </div>
            {editMode ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <ProjectInformationSection formData={formData} setFormData={setFormData} />
                <TeamMembersSection formData={formData} setFormData={setFormData} />
                <ProjectDocumentsSection 
                  formData={formData} 
                  setFormData={setFormData}
                  documentFilters={documentFilters}
                  setDocumentFilters={setDocumentFilters}
                />
              </form>
            </div>
          </ScrollArea>

          {/* Scroll Indicator - moved to bottom center */}
          {showScrollIndicator && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow-lg animate-bounce">
              <ChevronDown className="h-4 w-4 text-gray-600" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 bg-white/95 backdrop-blur-sm flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            {editMode ? 'Update Project' : 'Create Project'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewProjectWidget;
