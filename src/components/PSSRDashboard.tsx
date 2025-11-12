import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { OrshSidebar } from '@/components/OrshSidebar';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { AlertTriangle, GripVertical } from 'lucide-react';
import { PSSRInformationWidget } from '@/components/widgets/PSSRInformationWidget';
import { PSSRScopeWidget } from '@/components/widgets/PSSRScopeWidget';
import { PSSRItemStatisticsWidget } from '@/components/widgets/PSSRItemStatisticsWidget';
import { PSSRProgressWidget } from '@/components/widgets/PSSRProgressWidget';
import { PSSRRecentActivitiesWidget } from '@/components/widgets/PSSRRecentActivitiesWidget';
import { PSSRKeyActivitiesWidget } from '@/components/widgets/PSSRKeyActivitiesWidget';
import { PSSRPendingTasksWidget } from '@/components/widgets/PSSRPendingTasksWidget';
import { PSSRLinkedPSSRsWidget } from '@/components/widgets/PSSRLinkedPSSRsWidget';
import { SortableWidget } from '@/components/widgets/SortableWidget';
import { WidgetCustomizationToolbar, WidgetSettings } from '@/components/widgets/WidgetCustomizationToolbar';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface PSSRDashboardProps {
  pssrId: string;
  onBack: () => void;
  onNavigateToCategory?: (categoryName: string) => void;
}

const DEFAULT_WIDGET_SETTINGS: WidgetSettings[] = [
  { id: 'widget-1', name: 'PSSR Information', visible: true, size: 'medium' },
  { id: 'widget-2', name: 'PSSR Scope', visible: true, size: 'medium' },
  { id: 'widget-3', name: 'Item Statistics', visible: true, size: 'medium' },
  { id: 'widget-4', name: 'Checklist Items', visible: true, size: 'large' },
  { id: 'widget-5', name: 'Recent Activities', visible: true, size: 'medium' },
  { id: 'widget-6', name: 'Key Activities', visible: true, size: 'medium' },
  { id: 'widget-7', name: 'Pending Tasks', visible: true, size: 'medium' },
  { id: 'widget-8', name: 'Linked PSSRs', visible: true, size: 'medium' },
];

const PSSRDashboard: React.FC<PSSRDashboardProps> = ({ 
  pssrId, 
  onBack, 
  onNavigateToCategory 
}) => {
  const location = useLocation();
  const { buildBreadcrumbsFromPath, updateMetadata } = useBreadcrumb();
  const { toast } = useToast();

  // Widget settings state - persisted in localStorage
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings[]>(() => {
    const saved = localStorage.getItem(`pssr-widget-settings-${pssrId}`);
    return saved ? JSON.parse(saved) : DEFAULT_WIDGET_SETTINGS;
  });

  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Widget order state - persisted in localStorage
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`pssr-widget-order-${pssrId}`);
    if (saved) {
      return JSON.parse(saved);
    }
    return DEFAULT_WIDGET_SETTINGS.map(w => w.id);
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`pssr-widget-settings-${pssrId}`, JSON.stringify(widgetSettings));
  }, [widgetSettings, pssrId]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Persist to localStorage
        localStorage.setItem(`pssr-widget-order-${pssrId}`, JSON.stringify(newOrder));
        
        toast({
          title: 'Layout Updated',
          description: 'Widget layout has been saved.'
        });
        
        return newOrder;
      });
    }
  };

  const handleVisibilityChange = (widgetId: string, visible: boolean) => {
    setWidgetSettings(prev =>
      prev.map(w => w.id === widgetId ? { ...w, visible } : w)
    );
    toast({
      title: visible ? 'Widget Shown' : 'Widget Hidden',
      description: `${widgetSettings.find(w => w.id === widgetId)?.name} has been ${visible ? 'shown' : 'hidden'}.`
    });
  };

  const handleSizeChange = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    setWidgetSettings(prev =>
      prev.map(w => w.id === widgetId ? { ...w, size } : w)
    );
    toast({
      title: 'Widget Size Changed',
      description: `${widgetSettings.find(w => w.id === widgetId)?.name} is now ${size}.`
    });
  };

  const handleResetLayout = () => {
    setResetDialogOpen(true);
  };

  const confirmResetLayout = () => {
    setWidgetSettings(DEFAULT_WIDGET_SETTINGS);
    setWidgetOrder(DEFAULT_WIDGET_SETTINGS.map(w => w.id));
    localStorage.removeItem(`pssr-widget-settings-${pssrId}`);
    localStorage.removeItem(`pssr-widget-order-${pssrId}`);
    toast({
      title: 'Layout Reset',
      description: 'Widget layout has been restored to default settings.'
    });
    setResetDialogOpen(false);
  };

  const getWidgetColSpan = (size: 'small' | 'medium' | 'large', widgetId: string) => {
    // Widget 4 (Progress) gets special treatment
    if (widgetId === 'widget-4') {
      if (size === 'large') return 'lg:col-span-2 xl:col-span-3';
      if (size === 'medium') return 'lg:col-span-2';
      return 'lg:col-span-1';
    }
    
    // Other widgets
    if (size === 'large') return 'lg:col-span-2';
    return 'lg:col-span-1';
  };

  // Mock comprehensive PSSR data
  const pssrData = {
    id: pssrId,
    title: 'NRNGL Plant Start-up Commissioning',
    asset: 'NRNGL Plant',
    reason: 'Start-up or Commissioning of a new Asset',
    projectId: 'DP300',
    projectName: 'Phase 3 Expansion Project',
    status: 'Under Review',
    progress: 75,
    created: '2024-01-15',
    dueDate: '2024-02-15',
    initiator: 'Ahmed Al-Rashid',
    tier: 'Tier 1',
    scope: 'Pre-start-up safety review for the commissioning of new natural gas processing units including safety systems, process controls, and emergency shutdown procedures.',
    scopeImages: [
      '/lovable-uploads/96910863-cffb-404b-b5f0-149d393a07df.png',
      '/lovable-uploads/a389c47e-ef05-4852-85d3-e4be66d1eb1e.png'
    ],
    
    // Statistics
    statistics: {
      totalItems: 112,
      draftItems: 8,
      underReviewItems: 29,
      approvedItems: 75
    },

    // Progress by category
    categoryProgress: [
      { name: 'Hardware Integrity', completed: 18, total: 25, percentage: 72 },
      { name: 'Process Safety', completed: 22, total: 30, percentage: 73 },
      { name: 'Documentation', completed: 15, total: 18, percentage: 83 },
      { name: 'Organization', completed: 12, total: 15, percentage: 80 },
      { name: 'Health & Safety', completed: 20, total: 24, percentage: 83 }
    ],

    // Key activities
    keyActivities: [
      {
        name: 'PSSR Kick-off',
        status: 'Completed' as const,
        date: '2024-01-18',
        attendees: 12,
        type: 'kickoff'
      },
      {
        name: 'PSSR Walkdown',
        status: 'Scheduled' as const,
        date: '2024-02-05',
        attendees: 8,
        type: 'walkdown'
      },
      {
        name: 'Sign-off Meeting',
        status: 'Not Scheduled' as const,
        type: 'signoff'
      }
    ],

    // Reviewers and approvers
    reviewers: [
      {
        id: '1',
        name: 'Dr. Sarah Wilson',
        role: 'Process Engineering TA',
        avatar: '/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png',
        pendingTasks: 0,
        isOnline: true
      },
      {
        id: '2',
        name: 'John Smith',
        role: 'Technical Safety TA',
        avatar: '/lovable-uploads/b229716e-e39e-41cb-91d3-2c30dd517fa8.png',
        pendingTasks: 3,
        isOnline: true
      }
    ],

    approvers: [
      {
        id: '3',
        name: 'Maria Garcia',
        role: 'Mechanical Static TA',
        avatar: '/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png',
        pendingTasks: 2,
        isOnline: false
      },
      {
        id: '4',
        name: 'Omar Hassan',
        role: 'Deputy Plant Director',
        avatar: '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png',
        pendingTasks: 1,
        isOnline: true
      }
    ],

    // Linked PSSRs
    linkedPSSRs: [
      {
        id: 'PSSR-2024-002',
        title: 'Utility Systems Review',
        status: 'Completed',
        progress: 100,
        relationship: 'Prerequisite'
      },
      {
        id: 'PSSR-2024-003',
        title: 'Emergency Systems Verification',
        status: 'In Progress',
        progress: 45,
        relationship: 'Dependent'
      }
    ],

    // Recent activities
    recentActivities: [
      {
        id: 'act-1',
        type: 'approval' as const,
        user: {
          name: 'Dr. Sarah Wilson',
          avatar: '/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png'
        },
        description: 'Approved checklist item "Emergency Shutdown System Verification"',
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        category: 'Process Safety'
      },
      {
        id: 'act-2',
        type: 'comment' as const,
        user: {
          name: 'John Smith',
          avatar: '/lovable-uploads/b229716e-e39e-41cb-91d3-2c30dd517fa8.png'
        },
        description: 'Added comment on "Pressure Relief Device Testing" requesting additional documentation',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        category: 'Hardware Integrity'
      },
      {
        id: 'act-3',
        type: 'upload' as const,
        user: {
          name: 'Maria Garcia',
          avatar: '/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png'
        },
        description: 'Uploaded inspection report for "Piping Integrity Check"',
        timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
        category: 'Documentation'
      },
      {
        id: 'act-4',
        type: 'update' as const,
        user: {
          name: 'Ahmed Al-Rashid',
          avatar: '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png'
        },
        description: 'Updated status of "Control System Functional Test" to Under Review',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        category: 'Organization'
      },
      {
        id: 'act-5',
        type: 'assignment' as const,
        user: {
          name: 'Omar Hassan',
          avatar: '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png'
        },
        description: 'Assigned "Fire & Gas Detection System Review" to Engineering Team',
        timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        category: 'Health & Safety'
      }
    ]
  };

  // Update metadata with Project ID only for breadcrumb display
  useEffect(() => {
    updateMetadata(`/safe-startup/${pssrId}`, pssrData.projectId);
  }, [pssrId, pssrData.projectId, updateMetadata]);

  // Build breadcrumbs from current path and customize PSSR link to call onBack
  const breadcrumbs = buildBreadcrumbsFromPath();
  
  // Override the PSSR breadcrumb onClick to navigate back to the list
  const customizedBreadcrumbs = breadcrumbs.map((crumb) => {
    if (crumb.path === '/safe-startup') {
      return {
        ...crumb,
        onClick: onBack
      };
    }
    return crumb;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'under review':
      case 'in progress': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
      case 'scheduled': 
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed': 
        return <span className="inline-flex">✓</span>;
      case 'under review':
      case 'in progress': 
        return <span className="inline-flex">⏱</span>;
      case 'pending':
      case 'scheduled': 
        return <span className="inline-flex">⚠</span>;
      default: 
        return <span className="inline-flex">⚠</span>;
    }
  };

  return (
    <div className="min-h-screen flex w-full relative overflow-hidden">
      {/* Background matching home page */}
      <div className="absolute inset-0 bg-background overflow-hidden">
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div 
            className="absolute inset-0 animate-gradient-shift-morph"
            style={{
              background: 'radial-gradient(at 20% 30%, hsl(var(--primary) / 0.15) 0%, transparent 50%), radial-gradient(at 80% 20%, hsl(var(--accent) / 0.1) 0%, transparent 50%), radial-gradient(at 40% 80%, hsl(var(--primary) / 0.12) 0%, transparent 50%)',
              filter: 'blur(80px)',
            }}
          />
        </div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.03]" 
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* ORSH Sidebar */}
      <OrshSidebar 
        currentPage="safe-startup"
        onNavigate={(section) => {
          if (section === 'home') onBack();
        }}
      />
      
      <div className="flex-1 relative z-10">
        {/* Modern Header */}
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
          <div className="px-8 py-4">
            {/* Breadcrumb Navigation with History */}
            <BreadcrumbNavigation 
              currentPageLabel={pssrData.projectId}
              customBreadcrumbs={customizedBreadcrumbs}
              className="mb-4"
            />

            {/* Header Content */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                    <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-foreground">{pssrData.id}</h1>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1.5 ${getStatusColor(pssrData.status)}`}
                      >
                        {getStatusIcon(pssrData.status)}
                        {pssrData.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{pssrData.title}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{pssrData.progress}% Complete</div>
                  <div className="text-xs text-muted-foreground">12 days remaining</div>
                </div>
                <Progress value={pssrData.progress} className="w-32 h-2" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Widget Grid with Drag and Drop */}
        <main className="px-8 py-6">
          <WidgetCustomizationToolbar
            widgets={widgetSettings}
            onVisibilityChange={handleVisibilityChange}
            onSizeChange={handleSizeChange}
            onResetLayout={handleResetLayout}
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={widgetOrder.filter(id => 
              widgetSettings.find(w => w.id === id)?.visible
            )} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
                {widgetOrder.filter(id => 
                  widgetSettings.find(w => w.id === id)?.visible
                ).map((widgetId) => {
                  const widgetSetting = widgetSettings.find(w => w.id === widgetId);
                  if (!widgetSetting?.visible) return null;

                  const widgetMap: Record<string, JSX.Element> = {
                    'widget-1': (
                      <div className={getWidgetColSpan(widgetSetting.size, widgetId)}>
                        <PSSRInformationWidget
                          pssrId={pssrData.id}
                          asset={pssrData.asset}
                          projectId={pssrData.projectId}
                          projectName={pssrData.projectName}
                          reason={pssrData.reason}
                          dateInitiated={pssrData.created}
                          pssrLead={pssrData.initiator}
                          tier={pssrData.tier}
                        />
                      </div>
                    ),
                    'widget-2': (
                      <div className={getWidgetColSpan(widgetSetting.size, widgetId)}>
                        <PSSRScopeWidget
                          description={pssrData.scope}
                          images={pssrData.scopeImages}
                        />
                      </div>
                    ),
                    'widget-3': (
                      <div className={getWidgetColSpan(widgetSetting.size, widgetId)}>
                        <PSSRItemStatisticsWidget
                          totalItems={pssrData.statistics.totalItems}
                          draftItems={pssrData.statistics.draftItems}
                          underReviewItems={pssrData.statistics.underReviewItems}
                          approvedItems={pssrData.statistics.approvedItems}
                        />
                      </div>
                    ),
                    'widget-4': (
                      <div className={getWidgetColSpan(widgetSetting.size, widgetId)}>
                        <PSSRProgressWidget
                          overallProgress={pssrData.progress}
                          categoryProgress={pssrData.categoryProgress}
                          onCategoryClick={onNavigateToCategory}
                        />
                      </div>
                    ),
                    'widget-5': (
                      <div className={getWidgetColSpan(widgetSetting.size, widgetId)}>
                        <PSSRRecentActivitiesWidget
                          activities={pssrData.recentActivities}
                          maxItems={8}
                        />
                      </div>
                    ),
                    'widget-6': (
                      <div className={getWidgetColSpan(widgetSetting.size, widgetId)}>
                        <PSSRKeyActivitiesWidget
                          activities={pssrData.keyActivities}
                          onActivityClick={(type) => console.log('Activity clicked:', type)}
                        />
                      </div>
                    ),
                    'widget-7': (
                      <div className={getWidgetColSpan(widgetSetting.size, widgetId)}>
                        <PSSRPendingTasksWidget
                          reviewers={pssrData.reviewers}
                          approvers={pssrData.approvers}
                        />
                      </div>
                    ),
                    'widget-8': (
                      <div className={getWidgetColSpan(widgetSetting.size, widgetId)}>
                        <PSSRLinkedPSSRsWidget
                          linkedPSSRs={pssrData.linkedPSSRs}
                          onPSSRClick={(id) => console.log('PSSR clicked:', id)}
                        />
                      </div>
                    ),
                  };

                  return (
                    <SortableWidget key={widgetId} id={widgetId}>
                      {({ attributes, listeners }) => (
                        <div className="h-full relative group">
                          <div
                            {...attributes}
                            {...listeners}
                            className="absolute -top-2 -left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-primary/10 hover:bg-primary/20 rounded-lg p-2 backdrop-blur-sm"
                          >
                            <GripVertical className="h-5 w-5 text-primary" />
                          </div>
                          {widgetMap[widgetId]}
                        </div>
                      )}
                    </SortableWidget>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </main>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Widget Layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all widgets to their default positions, sizes, and visibility settings. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetLayout}>
              Reset Layout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PSSRDashboard;
