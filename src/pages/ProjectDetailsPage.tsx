import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, FileText, Calendar, Users, MapPin, Building, Target, FileCheck, UserCircle, ExternalLink, Edit } from 'lucide-react';
import { OrshSidebar } from '@/components/OrshSidebar';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useProjects } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { EditProjectModal } from '@/components/project/EditProjectModal';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectReadinessWidget } from '@/components/widgets/ProjectReadinessWidget';
import { ORPActivityPlanWidget } from '@/components/widgets/ORPActivityPlanWidget';
import { PSSRSummaryWidget } from '@/components/widgets/PSSRSummaryWidget';
import { P2AHandoverWidget } from '@/components/widgets/P2AHandoverWidget';
import { OwnersCostWidget } from '@/components/widgets/OwnersCostWidget';
import { ORMtceWidget } from '@/components/widgets/ORMtceWidget';

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateMetadata } = useBreadcrumb();
  const { projects, isLoading } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();

  const [editModalOpen, setEditModalOpen] = useState(false);

  const project = projects.find(p => p.id === id);
  const plant = plants.find(p => p.id === project?.plant_id);
  const station = stations.find(s => s.id === project?.station_id);
  const hub = hubs.find(h => h.id === project?.hub_id);

  useEffect(() => {
    if (project) {
      updateMetadata('title', `${project.project_id_prefix}${project.project_id_number} - ${project.project_title}`);
    }
  }, [project, updateMetadata]);

  if (isLoading) {
    return (
      <AnimatedBackground>
        <div className="flex h-screen">
          <OrshSidebar />
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  if (!project) {
    return (
      <AnimatedBackground>
        <div className="flex h-screen">
          <OrshSidebar />
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
                  <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
                  <Button onClick={() => navigate('/projects')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Projects
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  const getProjectId = () => {
    return `${project.project_id_prefix}${project.project_id_number}`;
  };

  return (
    <AnimatedBackground>
      <div className="flex h-screen">
        <OrshSidebar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            <BreadcrumbNavigation currentPageLabel={project ? `${getProjectId()}` : 'Project'} />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {getProjectId()} - {project.project_title}
                </h1>
                <p className="text-muted-foreground mt-1">Project Dashboard</p>
              </div>
              <Button onClick={() => setEditModalOpen(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Project
              </Button>
            </div>

            {/* Project Widgets Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProjectReadinessWidget projectId={id || ''} />
              <ORPActivityPlanWidget projectId={id || ''} />
              <PSSRSummaryWidget projectId={id || ''} />
              <P2AHandoverWidget projectId={id || ''} />
              <OwnersCostWidget projectId={id || ''} />
              <ORMtceWidget projectId={id || ''} />
            </div>
          </div>

          {/* Edit Project Modal */}
          {editModalOpen && (
            <EditProjectModal
              project={project}
              open={editModalOpen}
              onClose={() => setEditModalOpen(false)}
            />
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
};
export { ProjectDetailsPage };
