import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload, Link, FileText, Calendar, Users } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { ProjectTeamSection } from './ProjectTeamSection';
import { ProjectMilestonesSection } from './ProjectMilestonesSection';
import { ProjectDocumentsSection } from './ProjectDocumentsSection';

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ open, onClose }) => {
  const { createProject, isCreating } = useProjects();
  const { plants, createPlant } = usePlants();
  const { stations, createStation } = useStations();
  const { data: hubs = [], createHub } = useHubs();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id_prefix || !formData.project_id_number || !formData.project_title) {
      return;
    }

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
    onClose();
  };

  const showStationField = formData.plant_id && plants.find(p => p.id === formData.plant_id)?.name === 'CS';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
                  <Select 
                    value={formData.project_id_prefix} 
                    onValueChange={(value: 'DP' | 'ST' | 'MoC') => 
                      setFormData(prev => ({ ...prev, project_id_prefix: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Prefix" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DP">DP</SelectItem>
                      <SelectItem value="ST">ST</SelectItem>
                      <SelectItem value="MoC">MoC</SelectItem>
                    </SelectContent>
                  </Select>
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

              {/* Plant and Station */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* Hub */}
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

              {/* Project Scope */}
              <div className="space-y-2">
                <Label htmlFor="project_scope">Project Scope</Label>
                <Textarea
                  id="project_scope"
                  value={formData.project_scope}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_scope: e.target.value }))}
                  placeholder="Describe the project scope..."
                  rows={4}
                />
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
          <ProjectDocumentsSection 
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
              disabled={isCreating || !formData.project_id_prefix || !formData.project_id_number || !formData.project_title}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};