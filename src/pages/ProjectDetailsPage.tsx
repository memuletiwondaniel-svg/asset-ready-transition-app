import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, FileText, Calendar, Users, MapPin, Building, Target, FileCheck, UserCircle, ExternalLink, Edit, Eye, EyeOff } from 'lucide-react';
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
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
  onHide: () => void;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ id, children, onHide }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/widget relative">
      {React.cloneElement(children as React.ReactElement, {
        dragAttributes: attributes,
        dragListeners: listeners,
        onHide,
      })}
    </div>
  );
};

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateMetadata } = useBreadcrumb();
  const { projects, isLoading } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();
  const { toast } = useToast();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`project-widget-order-${id}`);
    return saved ? JSON.parse(saved) : ['orp', 'pssr', 'p2a', 'cost', 'orm'];
  });
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem(`project-hidden-widgets-${id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const project = projects.find(p => p.id === id);
  const plant = plants.find(p => p.id === project?.plant_id);
  const station = stations.find(s => s.id === project?.station_id);
  const hub = hubs.find(h => h.id === project?.hub_id);

  useEffect(() => {
    if (project) {
      updateMetadata('title', `${project.project_id_prefix}${project.project_id_number} - ${project.project_title}`);
    }
  }, [project, updateMetadata]);

  useEffect(() => {
    localStorage.setItem(`project-widget-order-${id}`, JSON.stringify(widgetOrder));
  }, [widgetOrder, id]);

  useEffect(() => {
    localStorage.setItem(`project-hidden-widgets-${id}`, JSON.stringify(hiddenWidgets));
  }, [hiddenWidgets, id]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
      
      toast({
        title: "Widget rearranged",
        description: "Your widget layout has been saved.",
      });
    }
  };

  const handleHideWidget = (widgetId: string) => {
    setHiddenWidgets(prev => [...prev, widgetId]);
    toast({
      title: "Widget hidden",
      description: "Widget has been hidden from view.",
    });
  };

  const handleShowWidget = (widgetId: string) => {
    setHiddenWidgets(prev => prev.filter(id => id !== widgetId));
    toast({
      title: "Widget shown",
      description: "Widget is now visible.",
    });
  };

  const visibleWidgets = widgetOrder.filter(id => !hiddenWidgets.includes(id));

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'orp':
        return <ORPActivityPlanWidget projectId={id || ''} />;
      case 'pssr':
        return <PSSRSummaryWidget projectId={id || ''} />;
      case 'p2a':
        return <P2AHandoverWidget projectId={id || ''} />;
      case 'cost':
        return <OwnersCostWidget projectId={id || ''} />;
      case 'orm':
        return <ORMtceWidget projectId={id || ''} />;
      default:
        return null;
    }
  };

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
              {hiddenWidgets.length > 0 && (
                <Button onClick={() => setHiddenWidgets([])} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Show All Widgets ({hiddenWidgets.length})
                </Button>
              )}
            </div>

            {/* Project Widgets Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Large Overview Widget */}
              <div className="lg:row-span-3">
                <ProjectReadinessWidget 
                  projectId={id || ''} 
                  onEditProject={() => setEditModalOpen(true)}
                />
              </div>
              
              {/* Right Column - Draggable Widgets */}
              <div className="lg:col-span-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={visibleWidgets} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {visibleWidgets.map((widgetId) => (
                        <SortableWidget 
                          key={widgetId} 
                          id={widgetId}
                          onHide={() => handleHideWidget(widgetId)}
                        >
                          {renderWidget(widgetId)}
                        </SortableWidget>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
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
}
