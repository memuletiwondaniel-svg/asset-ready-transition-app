import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useWidgetConfigs } from '@/hooks/useWidgetConfigs';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { usePSSRRecords } from '@/hooks/usePSSRRecords';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ClipboardList, AlertTriangle, CheckCircle, Clock, Settings, Home, FileText, FolderOpen } from 'lucide-react';
import { GlossaryTerm } from '@/components/ui/GlossaryTerm';
import { PSSRQuickStatsBar } from './widgets/PSSRQuickStatsBar';

import { PSSRReviewsWidget } from './widgets/PSSRReviewsWidget';
import PSSRFilters from './PSSRFilters';
import DraggablePSSRCard from './DraggablePSSRCard';
import PSSRTableView from './PSSRTableView';
import PSSRKanbanBoard from './PSSRKanbanBoard';
import PSSRTimelineView from './PSSRTimelineView';
import PSSRActivityFeed from './PSSRActivityFeed';
import PSSRDateRangeFilter, { DateRangeFilter } from './PSSRDateRangeFilter';
import PSSRAdvancedSearch from './PSSRAdvancedSearch';
import CreatePSSRIntroModal from './CreatePSSRIntroModal';
import CreatePSSRWizard from './pssr/CreatePSSRWizard';
import { PSSRDetailOverlay } from './pssr/PSSRDetailOverlay';

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbEllipsis } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface PSSRSummaryPageProps {
  onBack: () => void;
}
interface PSSR {
  id: string;
  projectId: string;
  projectName: string;
  asset: string;
  status: string;
  priority: string;
  progress: number;
  created: string;
  pssrLead: string;
  pssrLeadAvatar: string;
  teamStatus: string;
  pendingApprovals: number;
  completedDate: string | null;
  riskLevel: string;
  nextReview: string | null;
  teamMembers: number;
  lastActivity: string;
  location: string;
  pssrReason?: string;
}
const PSSRSummaryPage: React.FC<PSSRSummaryPageProps> = ({
  onBack
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { translations: t } = useLanguage();
  
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin'; // Change to 'user' to test role-based access
  
  // Breadcrumb context
  const { buildBreadcrumbsFromPath } = useBreadcrumb();

  const {
    widgets,
    loading: widgetsLoading,
    updateWidgetPosition,
    toggleWidgetVisibility,
    updateWidgetSettings,
    reorderWidgets
  } = useWidgetConfigs();
  const [activeView, setActiveView] = useState<'list' | 'create' | 'category-items' | 'manage-checklist'>('list');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showCreateIntro, setShowCreateIntro] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPSSR, setSelectedPSSR] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pssrOrder, setPssrOrder] = useState<string[]>([]);
  const [pinnedPSSRs, setPinnedPSSRs] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [dateRangeFilters, setDateRangeFilters] = useState<DateRangeFilter>({});
  const [showWidgetManagement, setShowWidgetManagement] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);

  // Fetch current user profile
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    position: string;
    avatar_url: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, position, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          let avatarUrl = profile.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            const { data: { publicUrl } } = supabase.storage
              .from('user-avatars')
              .getPublicUrl(avatarUrl);
            avatarUrl = publicUrl;
          }
          setUserProfile({
            full_name: profile.full_name || 'User',
            position: profile.position || 'Team Member',
            avatar_url: avatarUrl || ''
          });
        }
      }
    };
    fetchUserProfile();
  }, []);

  // Reset to list view when navigating to /pssr (even from the same route)
  // This handles the case when user clicks PSSR in sidebar while viewing a PSSR detail
  useEffect(() => {
    if (location.pathname === '/pssr') {
      setActiveView('list');
      setSelectedPSSR(null);
      setSelectedCategory(null);
    }
  }, [location.key]); // location.key changes on each navigation, even to the same route

  // Self-healing: create missing review tasks for PSSRs stuck in PENDING_LEAD_REVIEW
  const queryClient = useQueryClient();
  const selfHealRanRef = useRef(false);
  useEffect(() => {
    if (selfHealRanRef.current) return;
    selfHealRanRef.current = true;

    const healOrphanedTasks = async () => {
      try {
        // Fetch all PSSRs in PENDING_LEAD_REVIEW with a lead assigned
        const { data: pendingPssrs, error: pssrError } = await supabase
          .from('pssrs')
          .select('id, pssr_id, title, pssr_lead_id, user_id')
          .eq('status', 'PENDING_LEAD_REVIEW')
          .not('pssr_lead_id', 'is', null);

        if (pssrError || !pendingPssrs?.length) return;

        let tasksCreated = 0;

        for (const pssr of pendingPssrs) {
          // Check if a pending review task already exists for this PSSR
          const { data: existingTask } = await supabase
            .from('user_tasks')
            .select('id')
            .eq('user_id', pssr.pssr_lead_id)
            .eq('type', 'review')
            .eq('status', 'pending')
            .filter('metadata->>pssr_id', 'eq', pssr.id)
            .filter('metadata->>action', 'eq', 'review_draft_pssr')
            .maybeSingle();

          if (!existingTask) {
            // Get creator name for the task description
            const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', pssr.user_id)
              .maybeSingle();

            const creatorName = creatorProfile?.full_name || 'A team member';

            const { error: insertError } = await supabase
              .from('user_tasks')
              .insert({
                user_id: pssr.pssr_lead_id,
                title: `Review Draft PSSR: ${pssr.title || pssr.pssr_id}`,
                description: `${creatorName} has submitted a new PSSR for your review. Please review the PSSR items, approvers, and scope, then approve, edit, or reject the draft.`,
                priority: 'High',
                type: 'review',
                status: 'pending',
                metadata: {
                  source: 'pssr_workflow',
                  pssr_id: pssr.id,
                  pssr_code: pssr.pssr_id,
                  action: 'review_draft_pssr',
                  created_by: pssr.user_id,
                  auto_healed: true,
                },
              });

            if (!insertError) {
              tasksCreated++;
              console.log(`[Self-heal] Created missing review task for PSSR ${pssr.pssr_id} → lead ${pssr.pssr_lead_id}`);
            } else {
              console.error(`[Self-heal] Failed to create task for PSSR ${pssr.pssr_id}:`, insertError);
            }
          }
        }

        if (tasksCreated > 0) {
          queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
          console.log(`[Self-heal] Created ${tasksCreated} missing PSSR review task(s)`);
        }
      } catch (err) {
        console.error('[Self-heal] Error during orphaned PSSR task check:', err);
      }
    };

    healOrphanedTasks();
  }, [queryClient]);

  // Derive widget states from persisted configs
  const widgetVisibility = useMemo(() => {
    const stats = widgets.find(w => w.widget_type === 'pssr-statistics');
    const quick = widgets.find(w => w.widget_type === 'pssr-quick-actions');
    const recent = widgets.find(w => w.widget_type === 'pssr-recent-activities');
    const reviews = widgets.find(w => w.widget_type === 'pssr-reviews');
    return {
      statistics: stats?.is_visible ?? true,
      quickActions: quick?.is_visible ?? true,
      recentActivities: recent?.is_visible ?? true,
      reviews: reviews?.is_visible ?? true
    };
  }, [widgets]);
  const widgetExpanded = useMemo(() => {
    const stats = widgets.find(w => w.widget_type === 'pssr-statistics');
    const quick = widgets.find(w => w.widget_type === 'pssr-quick-actions');
    const recent = widgets.find(w => w.widget_type === 'pssr-recent-activities');
    const reviews = widgets.find(w => w.widget_type === 'pssr-reviews');
    return {
      statistics: stats?.settings?.expanded ?? false,
      quickActions: quick?.settings?.expanded ?? false,
      recentActivities: recent?.settings?.expanded ?? false,
      reviews: reviews?.settings?.expanded ?? true
    };
  }, [widgets]);
  const widgetOrder = useMemo(() => {
    const sorted = [...widgets].filter(w => ['pssr-statistics', 'pssr-quick-actions', 'pssr-recent-activities', 'pssr-reviews'].includes(w.widget_type)).sort((a, b) => a.position - b.position).map(w => {
      if (w.widget_type === 'pssr-statistics') return 'statistics';
      if (w.widget_type === 'pssr-quick-actions') return 'quickActions';
      if (w.widget_type === 'pssr-recent-activities') return 'recentActivities';
      if (w.widget_type === 'pssr-reviews') return 'reviews';
      return '';
    }).filter(Boolean);
    const defaultOrder: Array<'statistics' | 'quickActions' | 'recentActivities' | 'reviews'> = ['statistics', 'quickActions', 'recentActivities', 'reviews'];
    return sorted.length > 0 ? sorted as Array<'statistics' | 'quickActions' | 'recentActivities' | 'reviews'> : defaultOrder;
  }, [widgets]);

  // Local, optimistic order state for immediate visual reordering
  const [widgetOrderLocal, setWidgetOrderLocal] = useState<Array<'statistics' | 'quickActions' | 'recentActivities' | 'reviews'>>(widgetOrder);
  useEffect(() => {
    setWidgetOrderLocal(widgetOrder);
  }, [widgetOrder]);
  const widgetSensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleWidgetDragStart = (event: DragStartEvent) => {
    setActiveWidgetId(event.active.id as string);
  };
  const handleWidgetDragEnd = async (event: DragEndEvent) => {
    setActiveWidgetId(null);
    const {
      active,
      over
    } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgetOrderLocal.indexOf(active.id as any);
    const newIndex = widgetOrderLocal.indexOf(over.id as any);
    const newOrder = arrayMove(widgetOrderLocal, oldIndex, newIndex);

    // Optimistically update UI
    setWidgetOrderLocal(newOrder);

    // Update positions in Supabase
    const typeMap: Record<string, string> = {
      statistics: 'pssr-statistics',
      quickActions: 'pssr-quick-actions',
      recentActivities: 'pssr-recent-activities',
      reviews: 'pssr-reviews'
    };
    const reorderedConfigs = newOrder.map((widgetKey, index) => {
      const widget = widgets.find(w => w.widget_type === typeMap[widgetKey]);
      return widget ? {
        ...widget,
        position: index
      } : null;
    }).filter(Boolean);
    if (reorderedConfigs.length > 0) {
      await reorderWidgets(reorderedConfigs as any);
    }
  };
  const handleToggleWidgetVisibility = async (widgetKey: 'statistics' | 'quickActions' | 'recentActivities' | 'reviews') => {
    const typeMap: Record<string, string> = {
      statistics: 'pssr-statistics',
      quickActions: 'pssr-quick-actions',
      recentActivities: 'pssr-recent-activities',
      reviews: 'pssr-reviews'
    };
    const widget = widgets.find(w => w.widget_type === typeMap[widgetKey]);
    if (widget) {
      await toggleWidgetVisibility(widget.id);
    }
  };
  const handleToggleWidgetExpanded = async (widgetKey: 'statistics' | 'quickActions' | 'recentActivities' | 'reviews') => {
    const typeMap: Record<string, string> = {
      statistics: 'pssr-statistics',
      quickActions: 'pssr-quick-actions',
      recentActivities: 'pssr-recent-activities',
      reviews: 'pssr-reviews'
    };
    const widget = widgets.find(w => w.widget_type === typeMap[widgetKey]);
    if (widget) {
      const newExpanded = !(widget.settings?.expanded ?? false);
      await updateWidgetSettings(widget.id, {
        ...widget.settings,
        expanded: newExpanded
      });
    }
  };
  const [filters, setFilters] = useState({
    plant: [] as string[],
    status: [] as string[],
    lead: [] as string[],
    dateFrom: '',
    dateTo: '',
    statFilter: 'all' as 'all' | 'under-review' | 'draft' | 'completed'
  });

  // Fetch PSSR data from database
  const { data: pssrRecords, isLoading: pssrLoading } = usePSSRRecords();
  
  const pssrList: PSSR[] = useMemo(() => {
    if (!pssrRecords) return [];
    return pssrRecords.map(record => ({
      id: record.id,
      projectId: record.pssr_id,
      projectName: record.title || record.asset,
      asset: record.station_name || record.field_name || record.cs_location || record.plant || '',
      status: (() => {
        const s = (record.status || '').toUpperCase().replace(/[\s_]+/g, '_');
        if (s === 'DRAFT') return 'Draft';
        if (s === 'PENDING_LEAD_REVIEW') return 'Pending Lead Review';
        if (s === 'UNDER_REVIEW') return 'Under Review';
        if (s === 'COMPLETED') return 'Completed';
        return record.status;
      })(),
      priority: 'Medium',
      progress: record.progress,
      created: record.created_at,
      pssrLead: record.pssr_lead_name || 'Unassigned',
      pssrLeadAvatar: record.pssr_lead_avatar || '',
      teamStatus: 'grey',
      pendingApprovals: 0,
      completedDate: record.status === 'COMPLETED' ? record.updated_at : null,
      riskLevel: 'Low',
      nextReview: null,
      teamMembers: 0,
      lastActivity: record.updated_at,
      location: [record.plant, record.field_name, record.station_name || record.cs_location].filter(Boolean).join(' > '),
      scope: record.scope || '',
      pssrReason: record.reason || '',
    }));
  }, [pssrRecords]);

  // Initialize PSSR order
  React.useEffect(() => {
    if (pssrOrder.length === 0) {
      setPssrOrder(pssrList.map(pssr => pssr.id));
    }
  }, [pssrOrder.length]);

  // Drag and drop sensors
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) {
      return;
    }
    setPssrOrder(items => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Get unique values for filter options
  const uniquePlants = [...new Set(pssrList.map(pssr => pssr.asset))];
  const uniqueStatuses = [...new Set(pssrList.map(pssr => pssr.status))];
  const uniqueLeads = [...new Set(pssrList.map(pssr => pssr.pssrLead))];

  // Dashboard statistics
  const stats = useMemo(() => {
    const total = pssrList.length;
    const underReview = pssrList.filter(p => p.status === 'Under Review').length;
    const draft = pssrList.filter(p => p.status === 'Draft').length;
    const completed = pssrList.filter(p => p.completedDate !== null).length;
    return {
      total,
      underReview,
      draft,
      completed
    };
  }, [pssrList]);

  // Filtered PSSRs with date range support
  const filteredPSSRs = useMemo(() => {
    const filtered = pssrList.filter(pssr => {
      const searchQuery = searchTerm.toLowerCase().trim();
      const matchesSearch = searchQuery === '' || pssr.id.toLowerCase().includes(searchQuery) || pssr.projectId && pssr.projectId.toLowerCase().includes(searchQuery) || pssr.projectName && pssr.projectName.toLowerCase().includes(searchQuery) || pssr.asset.toLowerCase().includes(searchQuery) || pssr.pssrLead.toLowerCase().includes(searchQuery) || pssr.status.toLowerCase().includes(searchQuery);
      const matchesPlant = filters.plant.length === 0 || filters.plant.includes(pssr.asset);
      const matchesStatus = filters.status.length === 0 || filters.status.includes(pssr.status);
      const matchesLead = filters.lead.length === 0 || filters.lead.includes(pssr.pssrLead);

      // Stat filter
      let matchesStatFilter = true;
      if (filters.statFilter !== 'all') {
        switch (filters.statFilter) {
          case 'under-review':
            matchesStatFilter = pssr.status === 'Under Review';
            break;
          case 'draft':
            matchesStatFilter = pssr.status === 'Draft';
            break;
          case 'completed':
            matchesStatFilter = pssr.completedDate !== null;
            break;
        }
      }

      // Date range filtering
      let matchesDateRange = true;
      if (dateRangeFilters.created) {
        const createdDate = parseISO(pssr.created);
        if (dateRangeFilters.created.from && dateRangeFilters.created.to) {
          matchesDateRange = matchesDateRange && isWithinInterval(createdDate, {
            start: startOfDay(dateRangeFilters.created.from),
            end: endOfDay(dateRangeFilters.created.to)
          });
        } else if (dateRangeFilters.created.from) {
          matchesDateRange = matchesDateRange && createdDate >= startOfDay(dateRangeFilters.created.from);
        }
      }
      if (dateRangeFilters.nextReview && pssr.nextReview) {
        const reviewDate = parseISO(pssr.nextReview);
        if (dateRangeFilters.nextReview.from && dateRangeFilters.nextReview.to) {
          matchesDateRange = matchesDateRange && isWithinInterval(reviewDate, {
            start: startOfDay(dateRangeFilters.nextReview.from),
            end: endOfDay(dateRangeFilters.nextReview.to)
          });
        } else if (dateRangeFilters.nextReview.from) {
          matchesDateRange = matchesDateRange && reviewDate >= startOfDay(dateRangeFilters.nextReview.from);
        }
      }
      if (dateRangeFilters.completed && pssr.completedDate) {
        const completedDate = parseISO(pssr.completedDate);
        if (dateRangeFilters.completed.from && dateRangeFilters.completed.to) {
          matchesDateRange = matchesDateRange && isWithinInterval(completedDate, {
            start: startOfDay(dateRangeFilters.completed.from),
            end: endOfDay(dateRangeFilters.completed.to)
          });
        } else if (dateRangeFilters.completed.from) {
          matchesDateRange = matchesDateRange && completedDate >= startOfDay(dateRangeFilters.completed.from);
        }
      }
      return matchesSearch && matchesPlant && matchesStatus && matchesLead && matchesStatFilter && matchesDateRange;
    });
    return filtered.sort((a, b) => {
      const aPinned = pinnedPSSRs.includes(a.id);
      const bPinned = pinnedPSSRs.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (pssrOrder.length > 0) {
        const aIndex = pssrOrder.indexOf(a.id);
        const bIndex = pssrOrder.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
      }
      return 0;
    });
  }, [searchTerm, filters, pssrList, pssrOrder, pinnedPSSRs, dateRangeFilters]);
  const handleStatClick = (filterKey: 'all' | 'under-review' | 'draft' | 'completed') => {
    setFilters(prev => ({
      ...prev,
      statFilter: filterKey
    }));
    toast.success(filterKey === 'all' ? 'Showing all PSSRs' : `Filtered by: ${filterKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`);
  };
  const toggleFilter = (category: 'plant' | 'status' | 'lead', value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value) ? prev[category].filter(item => item !== value) : [...prev[category], value]
    }));
  };
  const clearAllFilters = () => {
    setFilters({
      plant: [],
      status: [],
      lead: [],
      dateFrom: '',
      dateTo: '',
      statFilter: 'all'
    });
    setDateRangeFilters({});
  };
  const handleDateChange = (dateType: 'dateFrom' | 'dateTo', value: string) => {
    setFilters(prev => ({
      ...prev,
      [dateType]: value
    }));
  };
  const [draftEditId, setDraftEditId] = useState<string | null>(null);
  const [overlayPSSR, setOverlayPSSR] = useState<{ id: string; displayId: string; title: string; status: string } | null>(null);

  const handleViewDetails = (pssrId: string) => {
    // Check if the PSSR is a draft — if so, open the wizard to continue editing
    const pssr = pssrList.find(p => p.id === pssrId);
    if (pssr && pssr.status === 'Draft') {
      setDraftEditId(pssrId);
      setActiveView('create');
      return;
    }
    // For all other statuses, open the detail overlay
    const record = pssrRecords?.find(r => r.id === pssrId);
    setOverlayPSSR({
      id: pssrId,
      displayId: record?.pssr_id || pssr?.projectId || pssrId,
      title: pssr?.projectName || '',
      status: record?.status || pssr?.status || '',
    });
  };
  const handleNavigateToCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setActiveView('category-items');
  };
  const handleTogglePin = (pssrId: string) => {
    setPinnedPSSRs(prev => prev.includes(pssrId) ? prev.filter(id => id !== pssrId) : [...prev, pssrId]);
  };
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Quick action handlers
  const handleEditPSSR = (pssrId: string) => {
    toast.info(`Edit PSSR ${pssrId}`);
    // In production, navigate to edit view
  };
  const handleDuplicatePSSR = (pssrId: string) => {
    toast.success(`PSSR ${pssrId} duplicated successfully`);
    // In production, duplicate the PSSR
  };
  const handleArchivePSSR = (pssrId: string) => {
    toast.success(`PSSR ${pssrId} archived`);
  };

  // queryClient already declared above for self-healing
  const handleDeletePSSR = async (pssrId: string) => {
    try {
      // Delete related data first, then the PSSR itself
      await supabase.from('pssr_checklist_responses').delete().eq('pssr_id', pssrId);
      await supabase.from('pssr_approvers').delete().eq('pssr_id', pssrId);
      await supabase.from('sof_approvers').delete().eq('pssr_id', pssrId);
      const { error } = await supabase.from('pssrs').delete().eq('id', pssrId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['pssr-records'] });
      toast.success('Draft PSSR deleted successfully');
    } catch (err: any) {
      toast.error('Failed to delete PSSR: ' + (err.message || 'Unknown error'));
    }
  };

  // Generate breadcrumbs based on current view
  const getBreadcrumbs = () => {
    const crumbs = [{
      label: 'Home',
      icon: Home,
      onClick: onBack
    }];
    switch (activeView) {
      case 'list':
        crumbs.push({
          label: 'PSSR',
          icon: undefined,
          onClick: undefined
        });
        break;
      case 'create':
        crumbs.push({
          label: 'PSSR',
          icon: undefined,
          onClick: () => setActiveView('list')
        });
        crumbs.push({
          label: 'Create PSSR',
          icon: Plus,
          onClick: undefined
        });
        break;
      case 'category-items':
        crumbs.push({
          label: 'PSSR',
          icon: undefined,
          onClick: () => setActiveView('list')
        });
        if (selectedPSSR) {
          crumbs.push({
            label: selectedPSSR,
            icon: FileText,
            onClick: () => setActiveView('list')
          });
        }
        if (selectedCategory) {
          crumbs.push({
            label: selectedCategory,
            icon: FolderOpen,
            onClick: undefined
          });
        }
        break;
      case 'manage-checklist':
        crumbs.push({
          label: 'PSSR',
          icon: undefined,
          onClick: () => setActiveView('list')
        });
        crumbs.push({
          label: 'Manage Checklists',
          icon: Settings,
          onClick: undefined
        });
        break;
    }
    return crumbs;
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'Under Review':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'Pending Lead Review':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'Draft':
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-destructive text-destructive-foreground';
      case 'High':
        return 'bg-warning text-warning-foreground';
      case 'Medium':
        return 'bg-primary text-primary-foreground';
      case 'Low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const getTeamStatusColor = (teamStatus: string) => {
    switch (teamStatus) {
      case 'green':
        return 'bg-emerald-500';
      case 'amber':
        return 'bg-warning';
      case 'red':
        return 'bg-destructive';
      case 'grey':
      case 'gray':
        return 'bg-muted-foreground/40';
      default:
        return 'bg-muted-foreground/40';
    }
  };
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'Medium':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'Low':
        return 'text-success bg-success/10 border-success/20';
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  return <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header - matching VCR page layout */}
        <header className="sticky top-0 z-50">
          <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
            <BreadcrumbNavigation 
              currentPageLabel="PSSR" 
              customBreadcrumbs={[
                { label: 'Home', path: '/', onClick: () => navigate('/') }
              ]}
            />
            
            <div className="flex items-center mt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    <GlossaryTerm term="PSSR">{t.pssrTitle || 'Pre-Startup Safety Review (PSSR)'}</GlossaryTerm>
                  </h1>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.pssrSubtitle || 'Manage Process Safety Risk and ensure Safe Start-up'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

      <main className="flex-1 overflow-y-auto max-w-[1400px] w-full mx-auto px-6 py-8 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* PSSR Reviews Widget */}
        {widgetVisibility.reviews && (
          <PSSRReviewsWidget 
            pssrs={pssrList} 
            filteredPSSRs={filteredPSSRs} 
            searchTerm={searchTerm} 
            onSearchChange={handleSearchChange} 
            onSelectPSSR={handleViewDetails} 
            viewMode={viewMode} 
            onViewModeChange={mode => setViewMode(mode)} 
            filters={filters} 
            onToggleFilter={toggleFilter} 
            onDateChange={handleDateChange} 
            onClearFilters={clearAllFilters} 
            uniquePlants={uniquePlants} 
            uniqueStatuses={uniqueStatuses} 
            uniqueLeads={uniqueLeads} 
            onViewDetails={handleViewDetails} 
            getPriorityColor={getPriorityColor} 
            getStatusIcon={getStatusIcon} 
            getTeamStatusColor={getTeamStatusColor} 
            getRiskLevelColor={getRiskLevelColor} 
            pinnedPSSRs={pinnedPSSRs} 
            onTogglePin={handleTogglePin} 
            onStatusChange={(pssrId, newStatus) => {
              toast.success(`PSSR ${pssrId} moved to ${newStatus}`);
            }} 
            onPSSROrderChange={setPssrOrder} 
            pssrOrder={pssrOrder} 
            isExpanded={widgetExpanded.reviews} 
            isVisible={widgetVisibility.reviews} 
            onToggleExpand={() => handleToggleWidgetExpanded('reviews')} 
            onToggleVisibility={() => handleToggleWidgetVisibility('reviews')}
            stats={stats}
            activeStatFilter={filters.statFilter}
            onStatFilterClick={handleStatClick}
            onCreateNew={() => setShowCreateIntro(true)}
            onDeletePSSR={handleDeletePSSR}
          />
        )}
      </main>
      
      {/* Create PSSR Intro Modal */}
      <CreatePSSRIntroModal 
        isOpen={showCreateIntro} 
        onClose={() => setShowCreateIntro(false)} 
        onContinue={() => {
          setShowCreateIntro(false);
          setActiveView('create');
        }} 
      />
      
      {/* Create PSSR Wizard */}
      <CreatePSSRWizard
        open={activeView === 'create'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveView('list');
            setDraftEditId(null);
            setSelectedPSSR(null);
          }
        }}
        draftPssrId={draftEditId || undefined}
        onSuccess={() => {
          setActiveView('list');
          setDraftEditId(null);
          setSelectedPSSR(null);
        }}
      />

      {/* PSSR Detail Overlay for Under Review / Completed */}
      {overlayPSSR && (
        <PSSRDetailOverlay
          open={!!overlayPSSR}
          onOpenChange={(open) => !open && setOverlayPSSR(null)}
          pssrId={overlayPSSR.id}
          pssrDisplayId={overlayPSSR.displayId}
          pssrTitle={overlayPSSR.title}
          status={overlayPSSR.status}
        />
      )}
    </div>;
};
export default PSSRSummaryPage;