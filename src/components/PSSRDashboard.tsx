import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { AlertTriangle, GripVertical } from 'lucide-react';
import { PSSRInfoScopeWidget } from '@/components/widgets/PSSRInfoScopeWidget';
import { PSSRChecklistProgressWidget, CategoryProgress } from '@/components/widgets/PSSRChecklistProgressWidget';
import { PSSRReviewersApprovalsWidget } from '@/components/widgets/PSSRReviewersApprovalsWidget';
import { OverviewStatsWidget } from '@/components/widgets/OverviewStatsWidget';
import { EditPSSRModal } from '@/components/widgets/EditPSSRModal';
import { ScheduleActivityModal } from '@/components/widgets/ScheduleActivityModal';
import { CategoryItemsOverlay } from '@/components/pssr/CategoryItemsOverlay';
import { FullChecklistOverlay } from '@/components/pssr/FullChecklistOverlay';
import { SortableWidget } from '@/components/widgets/SortableWidget';
import { WidgetSettings } from '@/components/widgets/WidgetCustomizationToolbar';
import BackgroundSlideshow from '@/components/BackgroundSlideshow';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePSSRCategoryProgress, CategoryItem } from '@/hooks/usePSSRCategoryProgress';
import { PSSRItemDetailModal } from '@/components/pssr/PSSRItemDetailModal';
import { PendingItem } from '@/components/widgets/ApproverPendingItemsOverlay';

interface PSSRDashboardProps {
  pssrId: string;
  onBack: () => void;
  onNavigateToCategory?: (categoryName: string) => void;
}

const DEFAULT_WIDGET_SETTINGS: WidgetSettings[] = [
  { id: 'widget-1', name: 'PSSR Info & Scope', visible: true, size: 'large' },
  { id: 'widget-2', name: 'Progress', visible: true, size: 'large' },
  { id: 'widget-4', name: 'Approval', visible: true, size: 'medium' },
  { id: 'widget-6', name: 'Overview', visible: true, size: 'medium' },
];

const PSSRDashboard: React.FC<PSSRDashboardProps> = ({ 
  pssrId, 
  onBack, 
  onNavigateToCategory 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { buildBreadcrumbsFromPath, updateMetadata } = useBreadcrumb();
  const { toast } = useToast();

  // Fetch real category progress from database
  const { data: categoryProgress, isLoading: isLoadingProgress } = usePSSRCategoryProgress(pssrId);

  // Widget settings state - persisted in localStorage
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings[]>(() => {
    const saved = localStorage.getItem(`pssr-widget-settings-${pssrId}`);
    return saved ? JSON.parse(saved) : DEFAULT_WIDGET_SETTINGS;
  });

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Activity modal state
  const [activityModal, setActivityModal] = useState<{
    isOpen: boolean;
    activityName: string;
    activityType: string;
    existingDate?: string;
    existingAttendees?: number;
  }>({ isOpen: false, activityName: '', activityType: '' });

  // Category items overlay state
  const [categoryOverlay, setCategoryOverlay] = useState<{
    isOpen: boolean;
    categoryName: string | null;
    stats: { completed: number; total: number; percentage: number } | null;
  }>({ isOpen: false, categoryName: null, stats: null });

  // Checklist overlay state (legacy)
  const [checklistOverlay, setChecklistOverlay] = useState<{
    type: 'filtered' | 'full';
    filterType?: 'status' | 'category';
    filterValue?: string;
    isOpen: boolean;
  }>({ type: 'full', isOpen: false });

  // Pending item detail modal state
  const [selectedPendingItem, setSelectedPendingItem] = useState<CategoryItem | null>(null);
  const [isPendingItemModalOpen, setIsPendingItemModalOpen] = useState(false);

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
    // Widget 1 (Info & Scope) always spans full width
    if (widgetId === 'widget-1') {
      return 'lg:col-span-3';
    }
    
    // Widget 2 (Checklist Progress) spans 2 columns
    if (widgetId === 'widget-2') {
      return 'lg:col-span-2';
    }
    
    // Other widgets based on size
    if (size === 'large') return 'lg:col-span-2';
    return 'lg:col-span-1';
  };

  // Mock comprehensive PSSR data
  const pssrData = {
    id: pssrId,
    title: 'DP300 HM Additional Compressors',
    asset: 'NRNGL Plant',
    reason: 'Start-up or Commissioning of a new Asset',
    projectId: 'DP300',
    projectName: 'HM Additional Compressors',
    status: 'Under Review',
    progress: 75,
    created: '2024-01-15',
    dueDate: '2024-02-15',
    initiator: 'Ahmed Al-Rashid',
    tier: 'Tier 1',
    scope: 'Pre-start-up safety review for the commissioning of new natural gas processing units including safety systems, process controls, and emergency shutdown procedures.',
    scopeImages: [
      '/lovable-uploads/a389c47e-ef05-4852-85d3-e4be66d1eb1e.png'
    ],
    
    // Statistics - calculated from category progress
    statistics: {
      totalItems: categoryProgress?.reduce((sum, c) => sum + c.total, 0) || 112,
      draftItems: 8,
      underReviewItems: 29,
      approvedItems: categoryProgress?.reduce((sum, c) => sum + c.completed, 0) || 75
    },

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

    // Reviewers (TA2s who review checklist items)
    reviewers: [
      {
        id: 'aa4e1de2-a2df-4e5f-9005-b9ea497f35e0',
        name: 'Andrew Banford',
        role: 'Tech Safety TA2',
        avatar: 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/5a651906-a022-4084-af11-afe35a03cef1/1757605596327.jpg',
        pendingTasks: 0,
        isOnline: true
      },
      {
        id: 'adf6a6f1-fdf2-4aaf-b8ec-ab8b1fd0503c',
        name: 'Christian Johnsen',
        role: 'TA2 Process - P&E',
        avatar: undefined,
        pendingTasks: 18,
        isOnline: true
      }
    ],

    // PSSR Approvers (Project Leadership)
    approvers: [
      {
        id: '7d5a90f1-2771-4754-93eb-4499592bf638',
        name: 'Lyle Koch',
        role: 'CS Deputy Director',
        avatar: 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/4f911475-2022-4a0c-bfea-1a4263677c03/1757589686150.png',
        pendingTasks: 2,
        isOnline: true
      },
      {
        id: '80a438d0-c363-4efc-bb73-98c4dfa80bdb',
        name: 'Wim Moelker',
        role: 'Project Manager',
        avatar: 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/9ff2d8e8-f2a0-4c29-9b60-5ab225beb0f6/1767656008476.jpeg',
        pendingTasks: 1,
        isOnline: false
      }
    ],

    // SoF Approvers (Directors and Senior Leadership)
    sofApprovers: [
      {
        id: '9701c5ba-9d9e-46e7-9431-0613cd9c7260',
        name: 'Marije Hoedemaker',
        role: 'P&E Director',
        avatar: 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/bd8dd7af-6bd4-4ca5-99ca-20bd53e38b4e/1757797433321.png',
        pendingTasks: 1,
        isOnline: false
      },
      {
        id: 'c89c4b90-d52c-44d5-adc6-a3e51ccb0fcb',
        name: 'Paul Van Den Hemel',
        role: 'P&M Director',
        avatar: 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/0dae95bb-6cdb-491d-ac4c-4c0cd7b2e8b2/1757605571147.jpg',
        pendingTasks: 0,
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
    ]
  };

  // Create pending items mapping for each reviewer/approver
  const pendingItemsByApprover: Record<string, PendingItem[]> = {
    // Christian Johnsen (adf6a6f1-...) has 18 items (3 pending, 15 completed)
    'adf6a6f1-fdf2-4aaf-b8ec-ab8b1fd0503c': [
      // Pending items (3)
      {
        id: 'item-1',
        uniqueId: 'PS-001',
        category: 'Process Safety',
        description: 'Verify pressure relief valves are correctly sized and tested',
        status: 'pending',
        topic: 'Relief Systems'
      },
      {
        id: 'item-2',
        uniqueId: 'PS-003',
        category: 'Process Safety',
        description: 'Confirm process alarms are configured per P&IDs',
        status: 'in_progress',
        topic: 'Alarm Management'
      },
      {
        id: 'item-3',
        uniqueId: 'TI-012',
        category: 'Technical Integrity',
        description: 'Review corrosion monitoring program implementation',
        status: 'pending',
        topic: 'Corrosion'
      },
      // Completed items (15)
      {
        id: 'item-cj-4',
        uniqueId: 'PS-002',
        category: 'Process Safety',
        description: 'Verify interlock logic matches approved design',
        status: 'completed',
        topic: 'Interlocks'
      },
      {
        id: 'item-cj-5',
        uniqueId: 'PS-004',
        category: 'Process Safety',
        description: 'Confirm safety instrumented systems are tested and documented',
        status: 'completed',
        topic: 'SIS'
      },
      {
        id: 'item-cj-6',
        uniqueId: 'PS-005',
        category: 'Process Safety',
        description: 'Review HAZOP action items closure status',
        status: 'completed',
        topic: 'HAZOP'
      },
      {
        id: 'item-cj-7',
        uniqueId: 'TI-001',
        category: 'Technical Integrity',
        description: 'Verify piping stress analysis completed and approved',
        status: 'completed',
        topic: 'Piping'
      },
      {
        id: 'item-cj-8',
        uniqueId: 'TI-002',
        category: 'Technical Integrity',
        description: 'Confirm vessel inspection reports are available',
        status: 'completed',
        topic: 'Vessels'
      },
      {
        id: 'item-cj-9',
        uniqueId: 'TI-003',
        category: 'Technical Integrity',
        description: 'Review rotating equipment vibration baselines',
        status: 'completed',
        topic: 'Rotating Equipment'
      },
      {
        id: 'item-cj-10',
        uniqueId: 'TI-004',
        category: 'Technical Integrity',
        description: 'Verify electrical equipment installation per specifications',
        status: 'completed',
        topic: 'Electrical'
      },
      {
        id: 'item-cj-11',
        uniqueId: 'TI-005',
        category: 'Technical Integrity',
        description: 'Confirm instrument calibration records are complete',
        status: 'completed',
        topic: 'Instrumentation'
      },
      {
        id: 'item-cj-12',
        uniqueId: 'DOC-001',
        category: 'Documentation',
        description: 'Verify P&IDs are updated to as-built condition',
        status: 'completed',
        topic: 'Drawings'
      },
      {
        id: 'item-cj-13',
        uniqueId: 'DOC-002',
        category: 'Documentation',
        description: 'Confirm operating procedures are reviewed and approved',
        status: 'completed',
        topic: 'Procedures'
      },
      {
        id: 'item-cj-14',
        uniqueId: 'DOC-003',
        category: 'Documentation',
        description: 'Review equipment datasheets for accuracy',
        status: 'completed',
        topic: 'Datasheets'
      },
      {
        id: 'item-cj-15',
        uniqueId: 'ORG-001',
        category: 'Organization',
        description: 'Verify operations staffing plan is finalized',
        status: 'completed',
        topic: 'Staffing'
      },
      {
        id: 'item-cj-16',
        uniqueId: 'HSE-001',
        category: 'HSE & Environment',
        description: 'Confirm environmental permits are in place',
        status: 'completed',
        topic: 'Permits'
      },
      {
        id: 'item-cj-17',
        uniqueId: 'HSE-002',
        category: 'HSE & Environment',
        description: 'Verify fire protection systems are tested',
        status: 'completed',
        topic: 'Fire Safety'
      },
      {
        id: 'item-cj-18',
        uniqueId: 'MR-001',
        category: 'Maintenance Readiness',
        description: 'Confirm spare parts inventory is stocked',
        status: 'completed',
        topic: 'Spare Parts'
      }
    ],
    // Lyle Koch has 2 pending items
    '7d5a90f1-2771-4754-93eb-4499592bf638': [
      {
        id: 'item-4',
        uniqueId: 'DOC-005',
        category: 'Documentation',
        description: 'Approve operational procedures for startup sequence',
        status: 'pending',
        topic: 'Communication'
      },
      {
        id: 'item-5',
        uniqueId: 'ORG-002',
        category: 'Organization',
        description: 'Confirm training records are complete for all operators',
        status: 'pending',
        topic: 'CMMS'
      }
    ],
    // Wim Moelker has 1 pending item
    '80a438d0-c363-4efc-bb73-98c4dfa80bdb': [
      {
        id: 'item-6',
        uniqueId: 'HSE-007',
        category: 'HSE & Environment',
        description: 'Verify emergency response procedures are documented',
        status: 'pending',
        topic: 'Environmental Monitoring'
      }
    ],
    // Marije Hoedemaker has 1 pending item
    '9701c5ba-9d9e-46e7-9431-0613cd9c7260': [
      {
        id: 'item-7',
        uniqueId: 'MR-004',
        category: 'Maintenance Readiness',
        description: 'Confirm maintenance schedule is finalized for new equipment',
        status: 'pending',
        topic: 'Flange Management'
      }
    ]
  };

  // Handler for clicking on a pending item in the overlay
  const handlePendingItemClick = (itemId: string) => {
    // Find the item across all pending items
    const allItems = Object.values(pendingItemsByApprover).flat();
    const item = allItems.find(i => i.id === itemId);
    if (item) {
      // Convert PendingItem to CategoryItem for the detail modal
      setSelectedPendingItem({
        id: item.id,
        unique_id: item.uniqueId || '',
        question: item.description,
        response_id: null,
        response: null,
        status: item.status,
        category: item.category,
        narrative: item.topic ? `Topic: ${item.topic}` : null,
        justification: null,
        deviation_reason: null,
        potential_risk: null,
        mitigations: null,
        follow_up_action: null,
        action_owner: null,
        submitted_at: null,
        approved_at: null,
        approver_name: null,
        approval_comments: null,
        attachments: null,
        approval_status: null,
      });
      setIsPendingItemModalOpen(true);
    }
  };

  // Mock category data for when real data is empty
  const mockCategoryProgress = [
    { id: '1', name: 'Technical Integrity', ref_id: 'TI', completed: 18, total: 24, percentage: 75, display_order: 1 },
    { id: '2', name: 'Process Safety', ref_id: 'PS', completed: 22, total: 28, percentage: 79, display_order: 2 },
    { id: '3', name: 'Organization', ref_id: 'ORG', completed: 14, total: 18, percentage: 78, display_order: 3 },
    { id: '4', name: 'Documentation', ref_id: 'DOC', completed: 12, total: 20, percentage: 60, display_order: 4 },
    { id: '5', name: 'HSE & Environment', ref_id: 'HSE', completed: 9, total: 12, percentage: 75, display_order: 5 },
    { id: '6', name: 'Maintenance Readiness', ref_id: 'MR', completed: 8, total: 10, percentage: 80, display_order: 6 },
  ];

  // Use mock data if real data is empty or not available
  const effectiveCategoryProgress = categoryProgress && categoryProgress.length > 0 
    ? categoryProgress 
    : mockCategoryProgress;

  // Calculate overall progress from category data
  const overallProgress = useMemo(() => {
    const data = effectiveCategoryProgress;
    if (!data || data.length === 0) return pssrData.progress;
    const totalItems = data.reduce((sum, c) => sum + c.total, 0);
    const completedItems = data.reduce((sum, c) => sum + c.completed, 0);
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }, [effectiveCategoryProgress, pssrData.progress]);

  // Overlay handlers
  const handleStatClick = (filter: string) => {
    setChecklistOverlay({
      type: 'filtered',
      filterType: 'status',
      filterValue: filter,
      isOpen: true
    });
  };

  const handleNavigateToProject = () => {
    navigate('/project/76901c6c-927d-4266-aaea-bc036888f274');
  };

  const handleCategoryClick = (categoryName: string) => {
    // Find category stats from effective data (includes mock)
    const category = effectiveCategoryProgress.find(c => c.name === categoryName);
    setCategoryOverlay({
      isOpen: true,
      categoryName,
      stats: category ? {
        completed: category.completed,
        total: category.total,
        percentage: category.percentage,
      } : null,
    });
  };

  const handleCategoryItemClick = (item: CategoryItem) => {
    // Navigate to item detail or open item modal
    console.log('Category item clicked:', item);
    // TODO: Implement item detail modal
    toast({
      title: item.unique_id,
      description: item.question.substring(0, 100) + '...',
    });
  };

  const handleViewAllChecklist = () => {
    setChecklistOverlay({
      type: 'full',
      isOpen: true
    });
  };

  const handleActivityClick = (activityType: string) => {
    const activity = pssrData.keyActivities.find(a => a.type === activityType || a.name === activityType);
    if (activity) {
      setActivityModal({
        isOpen: true,
        activityName: activity.name,
        activityType: activity.type || activity.name,
        existingDate: activity.date,
        existingAttendees: activity.attendees
      });
    }
  };

  const getFilterTitle = () => {
    if (checklistOverlay.filterType === 'status') {
      const titles: Record<string, string> = {
        'draft': 'Draft Items',
        'under_review': 'Items Under Review',
        'approved': 'Approved Items',
        'actions': 'Open Actions'
      };
      return titles[checklistOverlay.filterValue || ''] || 'Checklist Items';
    }
    return checklistOverlay.filterValue || 'Checklist Items';
  };

  // Update metadata with Project ID only for breadcrumb display
  useEffect(() => {
    updateMetadata(`/pssr/${pssrId}`, pssrData.projectId);
  }, [pssrId, pssrData.projectId, updateMetadata]);

  // Build breadcrumbs from current path and customize PSSR link to call onBack
  const breadcrumbs = buildBreadcrumbsFromPath();
  
  // Override the PSSR breadcrumb onClick to navigate back to the list
  const customizedBreadcrumbs = breadcrumbs.map((crumb) => {
    if (crumb.path === '/pssr') {
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

  // Transform category progress data for the widget
  const widgetCategoryProgress: CategoryProgress[] = effectiveCategoryProgress.map(c => ({
    name: c.name,
    completed: c.completed,
    total: c.total,
    percentage: c.percentage,
  }));

  return (
    <div className="min-h-screen flex-1 relative overflow-hidden">
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
      
      <div className="flex-1 relative z-10 w-full">
        {/* Modern Header */}
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            {/* Breadcrumb Navigation with History */}
            <BreadcrumbNavigation 
              currentPageLabel={pssrData.projectId}
              customBreadcrumbs={customizedBreadcrumbs}
              className="mb-3 sm:mb-4 ml-10 lg:ml-0"
            />

            {/* Header Content */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 ml-10 lg:ml-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg sm:text-xl font-bold text-foreground">{pssrData.id}</h1>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 sm:gap-1.5 text-xs ${getStatusColor(pssrData.status)}`}
                      >
                        {getStatusIcon(pssrData.status)}
                        <span className="hidden xs:inline">{pssrData.status}</span>
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">{pssrData.title}</p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </header>

        {/* Main Content - Widget Grid with Drag and Drop */}
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={widgetOrder.filter(id => 
              widgetSettings.find(w => w.id === id)?.visible
            )} strategy={rectSortingStrategy}>
              {/* Single Grid with CSS Grid Areas for Specific Positioning */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 auto-rows-fr">
                {widgetOrder.filter(id => 
                  widgetSettings.find(w => w.id === id)?.visible
                ).map((widgetId) => {
                  const widgetSetting = widgetSettings.find(w => w.id === widgetId);
                  if (!widgetSetting?.visible) return null;

                  const widgetMap: Record<string, JSX.Element> = {
                    'widget-1': (
                      <PSSRInfoScopeWidget
                        pssrId={pssrData.id}
                        asset={pssrData.asset}
                        projectId={pssrData.projectId}
                        projectName={pssrData.projectName}
                        reason={pssrData.reason}
                        dateInitiated={pssrData.created}
                        pssrLead={pssrData.initiator}
                        tier={pssrData.tier}
                        description={pssrData.scope}
                        images={pssrData.scopeImages}
                        linkedPSSRs={pssrData.linkedPSSRs}
                        onEdit={() => setEditModalOpen(true)}
                        onNavigateToProject={handleNavigateToProject}
                        onPSSRClick={(id) => console.log('PSSR clicked:', id)}
                      />
                    ),
                    'widget-2': (
                      <PSSRChecklistProgressWidget
                        totalItems={pssrData.statistics.totalItems}
                        draftItems={pssrData.statistics.draftItems}
                        underReviewItems={pssrData.statistics.underReviewItems}
                        approvedItems={pssrData.statistics.approvedItems}
                        overallProgress={overallProgress}
                        categoryProgress={widgetCategoryProgress}
                        onCategoryClick={handleCategoryClick}
                        onStatClick={handleStatClick}
                        onViewAll={handleViewAllChecklist}
                      />
                    ),
                    'widget-4': (
                      <PSSRReviewersApprovalsWidget
                        reviewers={pssrData.reviewers}
                        approvers={pssrData.approvers}
                        sofApprovers={pssrData.sofApprovers}
                        onSendReminder={(personId) => console.log('Send reminder to:', personId)}
                        onPersonClick={(personId) => console.log('Person clicked:', personId)}
                        pssrId={pssrId}
                        pssrReason={pssrData.reason}
                        plantName={pssrData.asset}
                        facilityName={pssrData.asset}
                        projectName={pssrData.projectName}
                        pendingItemsByApprover={pendingItemsByApprover}
                        onPendingItemClick={handlePendingItemClick}
                      />
                    ),
                    'widget-6': (
                      <OverviewStatsWidget
                        linkedPSSRs={pssrData.linkedPSSRs}
                        onPSSRClick={(id) => console.log('PSSR clicked:', id)}
                        keyActivities={pssrData.keyActivities}
                        onActivityClick={handleActivityClick}
                      />
                    ),
                  };

                  // Guard against undefined widgets (e.g., from old localStorage)
                  const widget = widgetMap[widgetId];
                  if (!widget) return null;

                  const colSpanClass = widgetId === 'widget-1' ? 'lg:col-span-3' : 
                                       widgetId === 'widget-2' ? 'lg:col-span-2' : '';

                  return (
                    <SortableWidget key={widgetId} id={widgetId}>
                      {({ attributes, listeners }) => (
                        <div className={`h-full ${colSpanClass}`}>
                          {React.cloneElement(widget, {
                            dragAttributes: attributes,
                            dragListeners: listeners,
                          })}
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

      {/* Edit PSSR Modal */}
      <EditPSSRModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        pssrData={pssrData}
        onSave={(updatedData) => {
          console.log('PSSR data updated:', updatedData);
          setEditModalOpen(false);
        }}
      />

      {/* Schedule Activity Modal */}
      <ScheduleActivityModal
        open={activityModal.isOpen}
        onOpenChange={(open) => setActivityModal(prev => ({ ...prev, isOpen: open }))}
        activityName={activityModal.activityName}
        activityType={activityModal.activityType}
        existingDate={activityModal.existingDate}
        existingAttendees={activityModal.existingAttendees}
      />

      {/* Category Items Overlay */}
      <CategoryItemsOverlay
        open={categoryOverlay.isOpen}
        onOpenChange={(open) => setCategoryOverlay(prev => ({ ...prev, isOpen: open }))}
        pssrId={pssrId}
        categoryName={categoryOverlay.categoryName}
        categoryStats={categoryOverlay.stats || undefined}
        onItemClick={handleCategoryItemClick}
      />

      {/* Full Checklist Overlay */}
      <FullChecklistOverlay
        open={checklistOverlay.isOpen}
        onOpenChange={(open) => setChecklistOverlay(prev => ({ ...prev, isOpen: open }))}
        pssrId={pssrId}
        initialFilter={checklistOverlay.filterType && checklistOverlay.filterValue ? {
          type: checklistOverlay.filterType,
          value: checklistOverlay.filterValue
        } : undefined}
      />

      {/* Pending Item Detail Modal */}
      <PSSRItemDetailModal
        open={isPendingItemModalOpen}
        onOpenChange={setIsPendingItemModalOpen}
        item={selectedPendingItem}
        pssrId={pssrId || ''}
      />
    </div>
  );
};

export default PSSRDashboard;
