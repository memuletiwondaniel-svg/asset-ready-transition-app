import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, FileText, Calendar, Users, MapPin, Building, Layers, Check, ChevronsUpDown } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useStations } from '@/hooks/useStations';
import { usePlants } from '@/hooks/usePlants';
import { useFields } from '@/hooks/useFields';
import { useHubs } from '@/hooks/useHubs';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useProjectLocations } from '@/hooks/useProjectLocations';
import { useProjectHierarchy } from '@/hooks/useProjectHierarchy';
import { useToast } from '@/hooks/use-toast';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { ProjectTeamSection } from './ProjectTeamSection';
import { ProjectMilestonesSection } from './ProjectMilestonesSection';
import { EnhancedProjectDocumentsSection } from './EnhancedProjectDocumentsSection';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface EditProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (project: any) => void;
  project: any;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ 
  open, 
  onClose,
  onSave,
  project
}) => {
  const { updateProject, isUpdating } = useProjects();
  const { allStations, getStationsByField, isLoading: stationsLoading } = useStations();
  const { plants, isLoading: plantsLoading } = usePlants();
  const { allFields, getFieldsByPlant, isLoading: fieldsLoading } = useFields();
  const { data: hubs = [], createHub } = useHubs();
  const { regions } = useProjectRegions();
  const { regions: hierarchyRegions } = useProjectHierarchy();
  const { locations, saveLocations } = useProjectLocations(project?.id);
  const { toast } = useToast();
  const { mutate: logActivity } = useLogActivity();

  const [formData, setFormData] = useState({
    project_id_prefix: '' as 'DP' | 'ST' | 'MoC' | '',
    project_id_number: '',
    project_title: '',
    region_id: '',
    hub_id: '',
    project_scope: '',
    project_scope_image_url: '',
    is_favorite: false,
  });

  // Multiple locations state - each with plant_id, field_id, station_id
  interface LocationEntry {
    id: string;
    plant_id: string;
    field_id: string;
    station_id: string;
  }
  
  const [projectLocations, setProjectLocations] = useState<LocationEntry[]>([
    { id: crypto.randomUUID(), plant_id: '', field_id: '', station_id: '' }
  ]);
  const [openStationPopovers, setOpenStationPopovers] = useState<Record<string, boolean>>({});

  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper functions for location management
  const addLocation = () => {
    setProjectLocations(prev => [...prev, { 
      id: crypto.randomUUID(), 
      plant_id: '', 
      field_id: '', 
      station_id: '' 
    }]);
  };

  const removeLocation = (id: string) => {
    if (projectLocations.length > 1) {
      setProjectLocations(prev => prev.filter(loc => loc.id !== id));
    }
  };

  const updateLocation = (id: string, field: 'plant_id' | 'field_id' | 'station_id', value: string) => {
    setProjectLocations(prev => prev.map(loc => {
      if (loc.id === id) {
        if (field === 'plant_id') {
          return { ...loc, plant_id: value, field_id: '', station_id: '' };
        } else if (field === 'field_id') {
          return { ...loc, field_id: value, station_id: '' };
        }
        return { ...loc, [field]: value };
      }
      return loc;
    }));
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Load existing project data
  useEffect(() => {
    if (open && project) {
      setFormData({
        project_id_prefix: project.project_id_prefix || '',
        project_id_number: project.project_id_number || '',
        project_title: project.project_title || '',
        region_id: project.region_id || '',
        hub_id: project.hub_id || '',
        project_scope: project.project_scope || '',
        project_scope_image_url: project.project_scope_image_url || '',
        is_favorite: project.is_favorite || false,
      });
      
      // Initialize locations from project data
      if (project.plant_id || project.station_id) {
        setProjectLocations([{
          id: crypto.randomUUID(),
          plant_id: project.plant_id || '',
          field_id: project.field_id || '',
          station_id: project.station_id || ''
        }]);
      } else {
        setProjectLocations([{ id: crypto.randomUUID(), plant_id: '', field_id: '', station_id: '' }]);
      }
      
      // Fetch existing team members, milestones, and documents
      fetchProjectDetails();
    }
  }, [open, project]);

  // Load existing locations
  useEffect(() => {
    if (locations.length > 0) {
      setSelectedLocationIds(locations.map(l => l.station_id));
    }
  }, [locations]);

  const fetchProjectDetails = async () => {
    if (!project?.id) return;
    
    setLoading(true);
    try {
      // Fetch team members
      const { data: teamData, error: teamError } = await supabase
        .from('project_team_members')
        .select('*')
        .eq('project_id', project.id);
      
      if (!teamError && teamData) {
        // Fetch profiles separately
        const userIds = teamData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, position')
          .in('user_id', userIds);
        
        const formattedTeam = teamData.map(member => {
          const profile = profilesData?.find(p => p.user_id === member.user_id);
          return {
            id: member.id,
            role: member.role,
            user_id: member.user_id,
            user_name: profile?.full_name || '',
            is_lead: member.is_lead,
            avatar_url: profile?.avatar_url || '',
            position: profile?.position || ''
          };
        });
        setTeamMembers(formattedTeam);
      }

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', project.id)
        .order('milestone_date', { ascending: true });
      
      if (!milestonesError && milestonesData) {
        const formattedMilestones = milestonesData.map(m => ({
          id: m.id,
          milestone_name: m.milestone_name,
          milestone_date: m.milestone_date,
          is_scorecard_project: m.is_scorecard_project,
          status: m.status || 'pending'
        }));
        setMilestones(formattedMilestones);
      }

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });
      
      if (!documentsError && documentsData) {
        const formattedDocs = documentsData.map(d => ({
          id: d.id,
          document_name: d.document_name,
          document_type: d.document_type,
          file_path: d.file_path,
          link_url: d.link_url,
          link_type: d.link_type,
          file_extension: d.file_extension,
          file_size: d.file_size
        }));
        setDocuments(formattedDocs);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

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

    try {
      // 1. Update project basic info
      const projectData = {
        project_id_prefix: formData.project_id_prefix as 'DP' | 'ST' | 'MoC',
        project_id_number: formData.project_id_number,
        project_title: formData.project_title,
        project_scope: formData.project_scope,
        project_scope_image_url: formData.project_scope_image_url,
        region_id: formData.region_id || undefined,
        hub_id: formData.hub_id || undefined,
        // Use the first location's plant and station for backward compatibility
        plant_id: projectLocations[0]?.plant_id || undefined,
        station_id: projectLocations[0]?.station_id || undefined,
        is_favorite: formData.is_favorite,
      };

      updateProject({ id: project.id, updates: projectData });

      // 2. Save project locations (multiple stations from all location entries)
      const stationIds = projectLocations
        .filter(loc => loc.station_id)
        .map(loc => loc.station_id);
      await saveLocations({ projectId: project.id, stationIds });

      // 2. Update team members - delete existing and insert new (filter invalid)
      await supabase.from('project_team_members').delete().eq('project_id', project.id);
      
      if (teamMembers.length > 0) {
        const validTeamMembers = teamMembers.filter(member => 
          member.user_id && 
          member.user_id.trim() !== '' && 
          member.user_id !== 'undefined'
        );
        
        const skippedMembers = teamMembers.length - validTeamMembers.length;
        
        if (validTeamMembers.length > 0) {
          const teamData = validTeamMembers.map(member => ({
            project_id: project.id,
            user_id: member.user_id,
            role: member.role,
            is_lead: member.is_lead || false
          }));
          
          const { error: teamError } = await supabase
            .from('project_team_members')
            .insert(teamData);
            
          if (teamError) {
            console.error('Error saving team members:', teamError);
            throw teamError;
          }
        }
        
        if (skippedMembers > 0) {
          toast({
            title: "Note",
            description: `${skippedMembers} team member(s) without selected users were skipped`,
            variant: "default"
          });
        }
      }

      // 3. Update milestones - delete existing and insert new (filter invalid)
      await supabase.from('project_milestones').delete().eq('project_id', project.id);
      
      if (milestones.length > 0) {
        const validMilestones = milestones.filter(m => 
          m.milestone_name && 
          m.milestone_name.trim() !== '' &&
          m.milestone_date
        );
        
        const skippedMilestones = milestones.length - validMilestones.length;
        
        if (validMilestones.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          const milestoneData = validMilestones.map(m => ({
            project_id: project.id,
            milestone_name: m.milestone_name,
            milestone_date: m.milestone_date,
            is_scorecard_project: m.is_scorecard_project || false,
            status: m.status || 'pending',
            created_by: user?.id || ''
          }));
          
          const { error: milestoneError } = await supabase
            .from('project_milestones')
            .insert(milestoneData);
            
          if (milestoneError) {
            console.error('Error saving milestones:', milestoneError);
            throw milestoneError;
          }
        }
        
        if (skippedMilestones > 0) {
          toast({
            title: "Note",
            description: `${skippedMilestones} incomplete milestone(s) were skipped`,
            variant: "default"
          });
        }
      }

      // 4. Update documents - delete existing and insert new (filter invalid)
      await supabase.from('project_documents').delete().eq('project_id', project.id);
      
      if (documents.length > 0) {
        const validDocuments = documents.filter(d =>
          d.document_name &&
          d.document_name.trim() !== '' &&
          (d.file_path || d.link_url)
        );
        
        const skippedDocuments = documents.length - validDocuments.length;
        
        if (validDocuments.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          const docData = validDocuments.map(d => ({
            project_id: project.id,
            document_name: d.document_name,
            document_type: d.document_type || 'General',
            file_path: d.file_path,
            link_url: d.link_url,
            link_type: d.link_type,
            file_extension: d.file_extension,
            file_size: d.file_size,
            uploaded_by: user?.id || ''
          }));
          
          const { error: docError } = await supabase
            .from('project_documents')
            .insert(docData);
            
          if (docError) {
            console.error('Error saving documents:', docError);
            throw docError;
          }
        }
        
        if (skippedDocuments > 0) {
          toast({
            title: "Note",
            description: `${skippedDocuments} incomplete document(s) were skipped`,
            variant: "default"
          });
        }
      }
      
      // Log activity
      logActivity({
        activityType: 'project_updated',
        description: `Updated project: ${formData.project_id_prefix}${formData.project_id_number} - ${formData.project_title}`,
        metadata: {
          project_id: `${formData.project_id_prefix}${formData.project_id_number}`,
          project_title: formData.project_title
        }
      });
      
      toast({
        title: "Success",
        description: "Project updated successfully",
      });

      // Call onSave with updated project data if provided
      if (onSave) {
        onSave({ ...project, ...projectData });
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    }
  };

  // Get hubs filtered by selected region
  const filteredHubs = useMemo(() => {
    if (!formData.region_id) return hubs;
    
    const selectedRegion = hierarchyRegions.find(r => r.id === formData.region_id);
    if (!selectedRegion) return hubs;
    
    const hubIdsInRegion = selectedRegion.hubs.map(h => h.id);
    return hubs.filter(hub => hubIdsInRegion.includes(hub.id));
  }, [formData.region_id, hierarchyRegions, hubs]);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-2xl font-bold text-foreground">
            {formData.project_id_prefix}{formData.project_id_number} - {formData.project_title || 'Untitled Project'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg gap-2 text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Project ID Section */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <Label htmlFor="project_id" className="text-sm font-medium text-muted-foreground">
                    Project ID <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-3">
                    <EnhancedCombobox
                      options={prefixOptions}
                      value={formData.project_id_prefix}
                      onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, project_id_prefix: value as 'DP' | 'ST' | 'MoC' }))
                      }
                      placeholder="Prefix"
                      allowCreate={false}
                      showSearch={false}
                      className="w-28 bg-muted/50"
                    />
                    <Input
                      value={formData.project_id_number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData(prev => ({ ...prev, project_id_number: value }));
                      }}
                      placeholder="Enter number"
                      className="flex-1 bg-muted/50"
                    />
                  </div>
                  {formData.project_id_prefix && formData.project_id_number && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 mt-1">
                      {formData.project_id_prefix}{formData.project_id_number}
                    </Badge>
                  )}
                </div>

                {/* Project Title Section */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <Label htmlFor="project_title" className="text-sm font-semibold text-foreground">
                    Project Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="project_title"
                    value={formData.project_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_title: e.target.value }))}
                    placeholder="Enter project title"
                    required
                    className="bg-muted/50"
                  />
                </div>

                {/* Location Section */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <h4 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">
                    Location Details
                  </h4>
                  
                  {/* Portfolio and Hub - 2 columns */}
                  <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="region" className="text-sm font-medium text-muted-foreground">
                        Portfolio
                      </Label>
                      <EnhancedCombobox
                        options={regions.map(region => ({ value: region.id, label: region.name }))}
                        value={formData.region_id}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, region_id: value, hub_id: '' }));
                        }}
                        placeholder="Select portfolio"
                        emptyText="No portfolios found"
                        allowCreate={false}
                        showSearch={false}
                        className="w-full bg-muted/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hub" className="text-sm font-medium text-muted-foreground">
                        Project Hub
                      </Label>
                      <EnhancedCombobox
                        options={filteredHubs.map(hub => ({ value: hub.id, label: hub.name }))}
                        value={formData.hub_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, hub_id: value }))}
                        onCreateNew={async (name) => {
                          await createHub(name);
                        }}
                        placeholder="Select or create hub"
                        emptyText="No hubs found"
                        createText="Create hub"
                        showSearch={false}
                        className="w-full bg-muted/50"
                      />
                    </div>
                  </div>

                  {/* Asset Hierarchy Location Selection - Multiple Locations */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium text-muted-foreground">
                          Locations
                        </Label>
                        {projectLocations.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {projectLocations.length}
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addLocation}
                        className="text-xs"
                      >
                        + Add Location
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {projectLocations.map((location, index) => (
                        <div 
                          key={location.id} 
                          className="grid gap-3 grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] items-end p-3 rounded-lg bg-background border border-border/40"
                        >
                          {/* Plant Selection - No Search */}
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              Plant
                            </Label>
                            <Select
                              value={location.plant_id}
                              onValueChange={(value) => updateLocation(location.id, 'plant_id', value)}
                            >
                              <SelectTrigger className="bg-muted/50">
                                <SelectValue placeholder={plantsLoading ? "Loading..." : "Select plant"} />
                              </SelectTrigger>
                              <SelectContent>
                                {plants?.map((plant) => (
                                  <SelectItem key={plant.id} value={plant.id}>
                                    {plant.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Field Selection - No Search */}
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              Field
                            </Label>
                            <Select
                              value={location.field_id}
                              onValueChange={(value) => updateLocation(location.id, 'field_id', value)}
                              disabled={!location.plant_id}
                            >
                              <SelectTrigger className="bg-muted/50">
                                <SelectValue placeholder={
                                  !location.plant_id 
                                    ? "Select plant first" 
                                    : fieldsLoading 
                                      ? "Loading..." 
                                      : "Select field"
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {getFieldsByPlant(location.plant_id)?.map((field) => (
                                  <SelectItem key={field.id} value={field.id}>
                                    {field.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Station Selection - With Search */}
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Station
                            </Label>
                            <Popover 
                              open={openStationPopovers[location.id] || false} 
                              onOpenChange={(open) => setOpenStationPopovers(prev => ({ ...prev, [location.id]: open }))}
                              modal={true}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openStationPopovers[location.id] || false}
                                  className="w-full justify-between bg-muted/50"
                                  disabled={!location.field_id}
                                >
                                  {location.station_id
                                    ? getStationsByField(location.field_id)?.find(s => s.id === location.station_id)?.name || "Select station"
                                    : !location.field_id 
                                      ? "Select field first"
                                      : stationsLoading 
                                        ? "Loading..." 
                                        : "Select station"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0 z-50" align="start">
                                <Command>
                                  <CommandInput placeholder="Search station..." />
                                  <CommandList>
                                    <CommandEmpty>No station found.</CommandEmpty>
                                    <CommandGroup>
                                      {getStationsByField(location.field_id)?.map((station) => (
                                        <CommandItem
                                          key={station.id}
                                          value={station.name}
                                          onSelect={() => {
                                            updateLocation(location.id, 'station_id', station.id);
                                            setOpenStationPopovers(prev => ({ ...prev, [location.id]: false }));
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              location.station_id === station.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {station.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Remove button */}
                          <div className="flex items-center justify-center">
                            {projectLocations.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLocation(location.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Project Scope Section */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <Label htmlFor="project_scope" className="text-sm font-semibold text-foreground">
                    Project Scope
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="project_scope"
                      value={formData.project_scope}
                      onChange={(e) => setFormData(prev => ({ ...prev, project_scope: e.target.value }))}
                      onPaste={(e) => {
                        const items = e.clipboardData?.items;
                        if (items) {
                          for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') !== -1) {
                              const blob = items[i].getAsFile();
                              if (blob) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    project_scope_image_url: event.target?.result as string 
                                  }));
                                };
                                reader.readAsDataURL(blob);
                              }
                              break;
                            }
                          }
                        }
                      }}
                      placeholder="Describe the project scope... (You can paste an image here)"
                      rows={4}
                      className="resize-none bg-background"
                    />
                  </div>
                  
                  {/* Pasted Image Preview */}
                  {formData.project_scope_image_url && (
                    <div className="relative border border-border/60 rounded-lg p-3 bg-background">
                      <img 
                        src={formData.project_scope_image_url} 
                        alt="Project Scope" 
                        className="w-full max-h-48 object-contain rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, project_scope_image_url: '' }))}
                        className="absolute top-4 right-4 bg-destructive/10 hover:bg-destructive/20 text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    Tip: You can paste an image directly into the text field above
                  </p>
                </div>

              </CardContent>
            </Card>

            {/* Project Team */}
            <ProjectTeamSection 
              teamMembers={teamMembers}
              setTeamMembers={setTeamMembers}
              regionName={regions.find(r => r.id === formData.region_id)?.name || null}
              hubName={filteredHubs.find(h => h.id === formData.hub_id)?.name || null}
              hubId={formData.hub_id || null}
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
          </form>
        </ScrollArea>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 shrink-0 flex justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isUpdating || loading}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={isUpdating || loading}
            className="min-w-[100px]"
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};