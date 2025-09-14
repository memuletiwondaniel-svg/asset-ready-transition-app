import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload, Link, FileText, Calendar, Users, Image } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { useToast } from '@/hooks/use-toast';
import { ProjectTeamSection } from './ProjectTeamSection';
import { ProjectMilestonesSection } from './ProjectMilestonesSection';
import { EnhancedProjectDocumentsSection } from './EnhancedProjectDocumentsSection';
import { ProjectSummaryModal } from './ProjectSummaryModal';
import EnhancedAuthModal from '@/components/enhanced-auth/EnhancedAuthModal';
import { supabase } from '@/integrations/supabase/client';

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ open, onClose }) => {
  const { createProject, isCreating } = useProjects();
  const { plants, createPlant } = usePlants();
  const { stations, createStation } = useStations();
  const { data: hubs = [], createHub } = useHubs();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    project_id_prefix: '' as 'DP' | 'ST' | 'MoC' | '',
    project_id_number: '',
    project_title: '',
    plant_id: '',
    station_id: '',
    project_scope: '',
    project_scope_image_url: '',
    hub_id: '',
  });

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ 
          ...prev, 
          project_scope_image_url: event.target?.result as string 
        }));
      };
      reader.readAsDataURL(imageFile);
    }
  }, []);

  const handleImageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleImageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const prefixOptions = [
    { value: 'DP', label: 'DP' },
    { value: 'ST', label: 'ST' },
    { value: 'MoC', label: 'MoC' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id_prefix || !formData.project_id_number || !formData.project_title) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Project ID and Title)",
        variant: "destructive",
      });
      return;
    }

    // Show summary page instead of creating immediately
    setShowSummary(true);
  };

  const handleClose = () => {
    setFormData({
      project_id_prefix: '',
      project_id_number: '',
      project_title: '',
      plant_id: '',
      station_id: '',
      project_scope: '',
      project_scope_image_url: '',
      hub_id: '',
    });
    setTeamMembers([]);
    setMilestones([]);
    setDocuments([]);
    setShowSummary(false);
    onClose();
  };

  const createProjectNow = () => {
    const projectData = {
      project_id_prefix: formData.project_id_prefix as 'DP' | 'ST' | 'MoC',
      project_id_number: formData.project_id_number,
      project_title: formData.project_title,
      project_scope: formData.project_scope,
      project_scope_image_url: formData.project_scope_image_url,
      plant_id: formData.plant_id || undefined,
      station_id: formData.station_id || undefined,
      hub_id: formData.hub_id || undefined,
    };

    createProject(projectData);
    handleClose();
  };

  const handleConfirmCreation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAuthOpen(true);
      toast({
        title: 'Sign in required',
        description: 'Please sign in to create a project.',
        variant: 'destructive',
      });
      return;
    }

    createProjectNow();
  };

  const showStationField = formData.plant_id && plants.find(p => p.id === formData.plant_id)?.name === 'CS';

  if (showSummary) {
    return (
      <>
        <ProjectSummaryModal
          open={open}
          onClose={() => setShowSummary(false)}
          onConfirm={handleConfirmCreation}
          formData={formData}
          teamMembers={teamMembers}
          milestones={milestones}
          documents={documents}
          plants={plants}
          stations={stations}
          hubs={hubs}
          isCreating={isCreating}
        />
        <EnhancedAuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthenticated={() => {
            setAuthOpen(false);
            createProjectNow();
          }}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Add New Project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Project ID */}
              <div className="space-y-2">
                <Label htmlFor="project_id">Project ID *</Label>
                <div className="flex gap-2">
                  <EnhancedCombobox
                    options={prefixOptions}
                    value={formData.project_id_prefix}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, project_id_prefix: value as 'DP' | 'ST' | 'MoC' }))
                    }
                    placeholder="Prefix"
                    allowCreate={false}
                    className="w-32"
                  />
                  <Input
                    value={formData.project_id_number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setFormData(prev => ({ ...prev, project_id_number: value }));
                    }}
                    placeholder="Enter numbers only"
                    className="flex-1"
                  />
                </div>
                {formData.project_id_prefix && formData.project_id_number && (
                  <Badge variant="outline" className="bg-blue-100/80 text-blue-700 border-blue-200/60">
                    {formData.project_id_prefix}{formData.project_id_number}
                  </Badge>
                )}
              </div>

              {/* Project Title */}
              <div className="space-y-2">
                <Label htmlFor="project_title">Project Title *</Label>
                <Input
                  id="project_title"
                  value={formData.project_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_title: e.target.value }))}
                  placeholder="Enter project title"
                  required
                />
              </div>

              {/* Plant, Station, and Hub */}
              <div className={`grid gap-4 ${showStationField ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label htmlFor="plant">Plant</Label>
                  <EnhancedCombobox
                    options={plants.map(plant => ({ value: plant.id, label: plant.name }))}
                    value={formData.plant_id}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, plant_id: value, station_id: '' }));
                    }}
                    onCreateNew={async (name) => {
                      await createPlant(name);
                    }}
                    placeholder="Select or create plant"
                    emptyText="No plants found"
                    createText="Create plant"
                    className="w-full"
                  />
                </div>

                {showStationField && (
                  <div className="space-y-2">
                    <Label htmlFor="station">Station</Label>
                    <EnhancedCombobox
                      options={stations.map(station => ({ value: station.id, label: station.name }))}
                      value={formData.station_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, station_id: value }))}
                      onCreateNew={async (name) => {
                        await createStation(name);
                      }}
                      placeholder="Select or create station"
                      emptyText="No stations found"
                      createText="Create station"
                      className="w-full"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="hub">Hub (Optional)</Label>
                  <EnhancedCombobox
                    options={hubs.map(hub => ({ value: hub.id, label: hub.name }))}
                    value={formData.hub_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, hub_id: value }))}
                    onCreateNew={async (name) => {
                      await createHub(name);
                    }}
                    placeholder="Select or create hub"
                    emptyText="No hubs found"
                    createText="Create hub"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Project Scope */}
              <div className="space-y-2">
                <Label htmlFor="project_scope">Project Scope</Label>
                <div className="space-y-3">
                  <Textarea
                    id="project_scope"
                    value={formData.project_scope}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_scope: e.target.value }))}
                    placeholder="Describe the project scope..."
                    rows={4}
                  />
                  
                  {/* Drag and Drop Image Area */}
                  <div className="space-y-2">
                    <Label>Project Scope Image (Optional)</Label>
                    <div
                      className={`
                        border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                        ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                        ${formData.project_scope_image_url ? 'bg-gray-50' : ''}
                      `}
                      onDrop={handleImageDrop}
                      onDragOver={handleImageDragOver}
                      onDragLeave={handleImageDragLeave}
                      onClick={() => document.getElementById('project_scope_image')?.click()}
                    >
                      {formData.project_scope_image_url ? (
                        <div className="relative">
                          <img 
                            src={formData.project_scope_image_url} 
                            alt="Project Scope" 
                            className="w-full max-h-48 object-contain rounded-lg mx-auto"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData(prev => ({ ...prev, project_scope_image_url: '' }));
                            }}
                            className="absolute top-2 right-2 bg-red-100 hover:bg-red-200 text-red-600 z-10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-center">
                            <Image className="h-12 w-12 text-gray-400" />
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Drag and drop an image here</span>
                            <br />
                            or click to browse files
                          </div>
                          <div className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 10MB
                          </div>
                        </div>
                      )}
                    </div>
                    <Input
                      id="project_scope_image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              project_scope_image_url: event.target?.result as string 
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Team */}
          <ProjectTeamSection 
            teamMembers={teamMembers}
            setTeamMembers={setTeamMembers}
          />

          {/* Milestones */}
          <ProjectMilestonesSection 
            milestones={milestones}
            setMilestones={setMilestones}
          />

          {/* Documents */}
          <EnhancedProjectDocumentsSection 
            documents={documents}
            setDocuments={setDocuments}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isCreating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            >
              Review Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};