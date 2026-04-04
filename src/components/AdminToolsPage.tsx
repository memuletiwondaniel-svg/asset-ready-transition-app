import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Settings, CheckCircle, Home, Search, X, Activity, Sliders, Building2, LayoutTemplate, Key, Loader2, Upload, Plug, Shield, FileSearch, Timer, ShieldAlert, Database, Archive, BookOpen, KeyRound, Webhook, HeartPulse, UserMinus, ClipboardCheck, Rocket, Flag, FileText, Compass, AlertTriangle, Container, MapPin, GitBranch, Files, Brain, ChevronDown, Star, FlaskConical } from 'lucide-react';
import bobAvatar from '@/assets/agents/bob.jpg';
import selmaAvatar from '@/assets/agents/selma.jpg';
import fredAvatar from '@/assets/agents/fred.jpg';
import ivanAvatar from '@/assets/agents/ivan.jpg';
import hannahAvatar from '@/assets/agents/hannah.jpg';
import alexAvatar from '@/assets/agents/alex.jpg';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { useUserScopedFavorites } from '@/hooks/useUserScopedFavorites';

import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeToggle } from './admin/ThemeToggle';
import LanguageSelector from './admin/LanguageSelector';
import UserProfileDropdown from './admin/UserProfileDropdown';
import { NotificationCenter } from './NotificationCenter';
import { createSidebarNavigator } from '@/utils/sidebarNavigation';

// Lazy load heavy subview components
const EnhancedUserManagement = lazy(() => import("@/components/user-management/EnhancedUserManagement"));

const ORAConfigurationManagement = lazy(() => import("./ora/ORAConfigurationManagement").then(m => ({ default: m.ORAConfigurationManagement })));
const ManageHandover = lazy(() => import("./handover/ManageHandover").then(m => ({ default: m.ManageHandover })));
const AdminHeader = lazy(() => import("./admin/AdminHeader"));
const AdminActivityLog = lazy(() => import("./AdminActivityLog"));
const BulkUserUpload = lazy(() => import("./admin-tools/BulkUserUpload").then(m => ({ default: m.BulkUserUpload })));
const IntegrationHub = lazy(() => import("./admin-tools/IntegrationHub"));
const SSOConfiguration = lazy(() => import("./admin-tools/SSOConfiguration").then(m => ({ default: m.SSOConfiguration })));
const RolePermissionsManager = lazy(() => import("./admin-tools/RolePermissionsManager"));
const AuditLogViewer = lazy(() => import("./admin-tools/AuditLogViewer"));
const SessionTimeoutConfig = lazy(() => import("./admin-tools/SessionTimeoutConfig"));
const BruteForceConfig = lazy(() => import("./admin-tools/BruteForceConfig"));
const DataExport = lazy(() => import("./admin-tools/DataExport"));
const AuditLogRetention = lazy(() => import("./admin-tools/AuditLogRetention"));
const DisasterRecoveryRunbook = lazy(() => import("./admin-tools/DisasterRecoveryRunbook"));
const ApiKeyManagement = lazy(() => import("./admin-tools/ApiKeyManagement"));
const WebhookSecurity = lazy(() => import("./admin-tools/WebhookSecurity"));
const IntegrationHealth = lazy(() => import("./admin-tools/IntegrationHealth"));
const UserOffboarding = lazy(() => import("./admin-tools/UserOffboarding"));
const PermissionReview = lazy(() => import("./admin-tools/PermissionReview"));
const DeploymentLog = lazy(() => import("./admin-tools/DeploymentLog"));
const TenantFeatureFlags = lazy(() => import("./admin-tools/TenantFeatureFlags"));
const EnterpriseSecurityDocument = lazy(() => import("./admin-tools/EnterpriseSecurityDocument"));
const PlatformGuideDocument = lazy(() => import("./admin-tools/PlatformGuideDocument"));
const StrategicNorthstarDocument = lazy(() => import("./admin-tools/StrategicNorthstarDocument"));
const IncidentResponseRunbook = lazy(() => import("./admin-tools/IncidentResponseRunbook"));
const DeploymentConfigs = lazy(() => import("./admin-tools/DeploymentConfigs"));
const CustomerJourneyMaps = lazy(() => import("./admin-tools/CustomerJourneyMaps"));
const ProcessFlowMaps = lazy(() => import("./admin-tools/ProcessFlowMaps"));
const DocumentManagementSystem = lazy(() => import("./admin-tools/DocumentManagementSystem"));
const AIAgentStrategyDocument = lazy(() => import("./admin-tools/AIAgentStrategyDocument"));
const AIAgentHub = lazy(() => import("@/pages/admin/AIAgentHub"));

const TenantSetupWizardLazy = lazy(() => import("./tenant-setup/TenantSetupWizard").then(m => ({ default: m.TenantSetupWizard })));

// Loading fallback component
const ViewLoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

interface AdminToolsPageProps {
  onBack: () => void;
}
const AdminToolsPageContent: React.FC<AdminToolsPageProps> = ({
  onBack
}) => {
  const {
    language,
    setLanguage,
    translations: t
  } = useLanguage();
  const {
    buildBreadcrumbsFromPath
  } = useBreadcrumb();
  const breadcrumbs = buildBreadcrumbsFromPath();
  const navigate = useNavigate();
  const location = useLocation();

  // State management - consolidated for cleaner code
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'activity-log' | 'ora-configuration' | 'handover-management' | 'bulk-upload' | 'integration-hub' | 'sso' | 'roles-permissions' | 'audit-logs' | 'session-timeout' | 'brute-force' | 'data-export' | 'audit-retention' | 'disaster-recovery' | 'api-keys' | 'webhook-security' | 'integration-health' | 'user-offboarding' | 'permission-review' | 'deployment-log' | 'feature-flags' | 'security-document' | 'platform-guide' | 'northstar-document' | 'incident-response' | 'deployment-configs' | 'journey-maps' | 'process-flows' | 'document-management' | 'ai-agent-strategy' | 'ai-agents-hub' | 'tenant-setup'>(() => {
    // Check if navigated with a specific activeView from favorites
    const state = location.state as any;
    return state?.activeView || 'dashboard';
  });

  // Reset to dashboard when sidebar navigation triggers a same-route click (without activeView)
  useEffect(() => {
    const state = location.state as any;
    if (state?.navKey) {
      setActiveView(state.activeView || 'dashboard');
    }
  }, [(location.state as any)?.navKey]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantSetupOpen, setTenantSetupOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set([
    'USER MANAGEMENT', 'LIVING DOCUMENTATION', 'AI AGENTS', 'INTEGRATIONS', 'SYSTEM', 'OPERATIONS & CONFIGURATION'
  ]));

  // Admin favorites - user-scoped and persisted
  const { favorites: adminFavorites, toggleFavorite: toggleAdminFavoriteRaw } = useUserScopedFavorites('orsh-admin-favorites');
  const toggleAdminFavorite = useCallback((itemId: string, e: React.MouseEvent) => {
    toggleAdminFavoriteRaw(itemId, e);
  }, [toggleAdminFavoriteRaw]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    position: string;
    avatar_url: string;
  } | null>(null);
  const [userStats, setUserStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    inactive: 0
  });
  const [projectStats, setProjectStats] = useState({
    total: 0
  });

  const handleSidebarNavigate = createSidebarNavigator(navigate, {
    'admin-tools': () => setActiveView('dashboard'),
    'user-management': () => setActiveView('users'),
    'users': () => setActiveView('users'),
  });

  // Helper functions for fetching stats
  const fetchUserStats = async () => {
    const [usersTotalResult, usersPendingResult, usersActiveResult, usersInactiveResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'inactive')
    ]);
    setUserStats({
      total: usersTotalResult.count || 0,
      pending: usersPendingResult.count || 0,
      active: usersActiveResult.count || 0,
      inactive: usersInactiveResult.count || 0
    });
  };

  const fetchProjectStats = async () => {
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    setProjectStats({ total: count || 0 });
  };

  // Single useEffect for initial data fetch + real-time subscriptions
  useEffect(() => {
    const fetchAllInitialData = async () => {
      try {
        // Fetch user profile and stats in parallel
        const [authResult] = await Promise.all([
          supabase.auth.getUser(),
          fetchUserStats(),
          fetchProjectStats()
        ]);

        // Set user profile
        if (authResult.data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, position, avatar_url')
            .eq('user_id', authResult.data.user.id)
            .single();
          if (profile) setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchAllInitialData();

    // Set up real-time subscriptions
    const userChannel = supabase.channel('user-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchUserStats)
      .subscribe();
    
    const projectChannel = supabase.channel('project-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjectStats)
      .subscribe();
    
    return () => {
      supabase.removeChannel(userChannel);
      supabase.removeChannel(projectChannel);
    };
  }, []);

  // Section definitions for the sectioned layout
  const sections = useMemo(() => [
    {
      label: 'USER MANAGEMENT',
      columns: 2 as const,
      items: [
        { id: 'users', title: 'Users', description: 'Manage user accounts, invite team members', icon: Users, gradient: 'from-blue-500 to-blue-600', onClick: () => setActiveView('users') },
        { id: 'roles-permissions', title: 'Roles & Permissions', description: 'Access control, permission groups', icon: Shield, gradient: 'from-rose-500 to-pink-600', onClick: () => setActiveView('roles-permissions') },
        { id: 'user-offboarding', title: 'User Offboarding', description: 'Deactivate users, revoke access', icon: UserMinus, gradient: 'from-red-500 to-rose-600', onClick: () => setActiveView('user-offboarding') },
        { id: 'permission-review', title: 'Permission Reviews', description: 'Periodic access certification', icon: ClipboardCheck, gradient: 'from-indigo-500 to-violet-600', onClick: () => setActiveView('permission-review') },
        { id: 'bulk-upload', title: 'Bulk User Upload', description: 'Import users via CSV', icon: Upload, gradient: 'from-teal-500 to-emerald-600', onClick: () => setActiveView('bulk-upload') },
        { id: 'sso', title: 'Single Sign-On', description: 'SAML 2.0, Azure AD, Okta', icon: Shield, gradient: 'from-indigo-500 to-purple-600', onClick: () => setActiveView('sso') },
      ],
    },
    {
      label: 'OPERATIONS & CONFIGURATION',
      columns: 3 as const,
      items: [
        { id: 'projects', title: 'Projects', description: 'Manage projects, phases, teams', icon: Building2, gradient: 'from-purple-500 to-purple-600', onClick: () => navigate('/project-management') },
        { id: 'handover-management', title: 'VCRs & PSSRs', description: 'Certificates, safety reviews', icon: Key, gradient: 'from-blue-500 to-cyan-500', onClick: () => setActiveView('handover-management') },
        { id: 'ora-configuration', title: 'ORA Plan', description: 'Operational readiness activities', icon: LayoutTemplate, gradient: 'from-amber-500 to-amber-600', onClick: () => setActiveView('ora-configuration') },
        { id: 'document-management', title: 'Document Management', description: 'Types, categories, lifecycle', icon: Files, gradient: 'from-sky-500 to-blue-600', onClick: () => setActiveView('document-management') },
        { id: 'tenant-setup', title: 'Tenant Setup Wizard', description: 'Configure new organisation', icon: Compass, gradient: 'from-teal-500 to-cyan-600', onClick: () => setTenantSetupOpen(true) },
      ],
    },
    {
      label: 'AI AGENTS',
      columns: 3 as const,
      items: [
        { id: 'ai-agents-hub', title: 'AI Agents Hub', description: 'Overview, profiles, relationships', icon: Brain, gradient: 'from-violet-500 to-purple-600', badge: '6 agents' as const, onClick: () => navigate('/admin-tools', { state: { activeView: 'ai-agents-hub', navKey: Date.now() } }) },
        { id: 'agent-bob', title: 'Bob', description: 'CoPilot & Router', icon: Brain, gradient: 'from-amber-500 to-orange-600', avatarSrc: bobAvatar, onClick: () => navigate('/admin-tools', { state: { activeView: 'ai-agents-hub', agentCode: 'bob', navKey: Date.now() } }) },
        { id: 'agent-selma', title: 'Selma', description: 'Documentation & Information Readiness', icon: FileSearch, gradient: 'from-cyan-500 to-blue-600', avatarSrc: selmaAvatar, onClick: () => navigate('/admin-tools', { state: { activeView: 'ai-agents-hub', agentCode: 'selma', navKey: Date.now() } }) },
        { id: 'agent-fred', title: 'Fred', description: 'System & Hardware Readiness', icon: CheckCircle, gradient: 'from-red-500 to-rose-600', avatarSrc: fredAvatar, onClick: () => navigate('/admin-tools', { state: { activeView: 'ai-agents-hub', agentCode: 'fred', navKey: Date.now() } }) },
        { id: 'agent-ivan', title: 'Ivan', description: 'Technical Authority, Process, Ops & Safety', icon: Shield, gradient: 'from-slate-600 to-blue-800', avatarSrc: ivanAvatar, onClick: () => navigate('/admin-tools', { state: { activeView: 'ai-agents-hub', agentCode: 'ivan', navKey: Date.now() } }) },
        { id: 'agent-hannah', title: 'Hannah', description: 'Training & People Readiness', icon: Users, gradient: 'from-violet-500 to-purple-600', badge: 'planned' as const, avatarSrc: hannahAvatar, onClick: () => navigate('/admin-tools', { state: { activeView: 'ai-agents-hub', agentCode: 'hannah', navKey: Date.now() } }) },
        { id: 'agent-alex', title: 'Alex', description: 'Maintenance System Readiness', icon: Settings, gradient: 'from-cyan-600 to-slate-600', badge: 'planned' as const, avatarSrc: alexAvatar, onClick: () => navigate('/admin-tools', { state: { activeView: 'ai-agents-hub', agentCode: 'alex', navKey: Date.now() } }) },
      ],
    },
    {
      label: 'INTEGRATIONS',
      columns: 3 as const,
      items: [
        { id: 'integration-hub', title: 'Integration Hub', description: 'Connect ORSH to external platforms and systems', icon: Plug, gradient: 'from-emerald-500 to-teal-600', badge: 'configured' as const, onClick: () => setActiveView('integration-hub') },
        { id: 'api-keys', title: 'API Key Management', description: 'Generate, scope, rotate API keys', icon: KeyRound, gradient: 'from-violet-500 to-purple-600', onClick: () => setActiveView('api-keys') },
        { id: 'webhook-security', title: 'Webhook Security', description: 'HMAC signature verification', icon: Webhook, gradient: 'from-sky-500 to-blue-600', onClick: () => setActiveView('webhook-security') },
        { id: 'integration-health', title: 'Integration Health', description: 'API success rates, latency monitoring', icon: HeartPulse, gradient: 'from-green-500 to-emerald-600', onClick: () => setActiveView('integration-health') },
      ],
    },
    {
      label: 'SYSTEM',
      columns: 3 as const,
      items: [
        { id: 'audit-logs', title: 'Audit Log', description: 'Security events, user actions', icon: FileSearch, gradient: 'from-slate-600 to-zinc-700', onClick: () => setActiveView('audit-logs') },
        { id: 'activity-log', title: 'Activity Log', description: 'Recent system activity', icon: Activity, gradient: 'from-cyan-500 to-cyan-600', onClick: () => setActiveView('activity-log') },
        { id: 'session-timeout', title: 'Session Timeout', description: 'Auto-logout, idle lock policies', icon: Timer, gradient: 'from-indigo-500 to-violet-600', onClick: () => setActiveView('session-timeout') },
        { id: 'brute-force', title: 'Brute-Force Protection', description: 'Account lockout thresholds', icon: ShieldAlert, gradient: 'from-red-500 to-rose-600', onClick: () => setActiveView('brute-force') },
        { id: 'data-export', title: 'Data Export', description: 'CSV/JSON backup downloads', icon: Database, gradient: 'from-teal-500 to-emerald-600', onClick: () => setActiveView('data-export') },
        { id: 'audit-retention', title: 'Audit Log Retention', description: 'Retention period, purge config', icon: Archive, gradient: 'from-orange-500 to-amber-600', onClick: () => setActiveView('audit-retention') },
        { id: 'disaster-recovery', title: 'Disaster Recovery', description: 'Backup, restore procedures', icon: BookOpen, gradient: 'from-cyan-600 to-blue-700', onClick: () => setActiveView('disaster-recovery') },
        { id: 'incident-response', title: 'Incident Response', description: 'Severity classification, SLAs', icon: AlertTriangle, gradient: 'from-red-600 to-rose-700', onClick: () => setActiveView('incident-response') },
        { id: 'feature-flags', title: 'Feature Flags', description: 'Per-tenant module toggles', icon: Flag, gradient: 'from-amber-500 to-orange-600', onClick: () => setActiveView('feature-flags') },
        { id: 'deployment-configs', title: 'Deployment Configs', description: 'Docker, CI/CD pipelines', icon: Container, gradient: 'from-cyan-600 to-blue-700', onClick: () => setActiveView('deployment-configs') },
      ],
    },
    {
      label: 'LIVING DOCUMENTATION',
      columns: 3 as const,
      items: [
        { id: 'northstar-document', title: 'Strategic North Star', description: 'Vision, mission, product strategy', icon: Compass, gradient: 'from-amber-600 to-orange-700', badge: 'auto-update' as const, onClick: () => setActiveView('northstar-document') },
        { id: 'platform-guide', title: 'Platform Guide', description: 'How to use ORSH, agent intros', icon: BookOpen, gradient: 'from-blue-600 to-indigo-700', badge: 'auto-update' as const, onClick: () => setActiveView('platform-guide') },
        { id: 'ai-agent-strategy', title: 'AI Agent Strategy', description: 'Agent roadmap, tool registry', icon: Brain, gradient: 'from-violet-600 to-purple-700', badge: 'auto-update' as const, onClick: () => setActiveView('ai-agent-strategy') },
        { id: 'security-document', title: 'Security & Compliance', description: 'Security posture, SOC 2 progress', icon: FileText, gradient: 'from-slate-600 to-zinc-700', badge: 'auto-update' as const, onClick: () => setActiveView('security-document') },
        { id: 'journey-maps', title: 'Customer Journey Maps', description: 'Persona journeys, onboarding flows', icon: MapPin, gradient: 'from-pink-600 to-rose-700', onClick: () => setActiveView('journey-maps') },
        { id: 'deployment-log', title: 'Deployment Log', description: 'Version history, release notes', icon: Rocket, gradient: 'from-emerald-500 to-teal-600', badge: 'auto-update' as const, onClick: () => setActiveView('deployment-log') },
        { id: 'process-flows', title: 'Process Flow Maps', description: 'Workflows, approval chains', icon: GitBranch, gradient: 'from-emerald-600 to-teal-700', onClick: () => setActiveView('process-flows') },
        { id: 'auto-update-controls', title: 'Auto-Update Controls', description: 'Living doc triggers, update queue', icon: Settings, gradient: 'from-sky-500 to-blue-600', onClick: () => toast.info('Auto-Update Controls coming soon') },
      ],
    },
  ], [navigate, t]);

  // Build a flat map of all items for favorites lookup
  const allItemsMap = useMemo(() => {
    const map = new Map<string, typeof sections[0]['items'][0]>();
    sections.forEach(s => s.items.forEach(item => map.set(item.id, item)));
    return map;
  }, [sections]);

  // Favorite items derived from sections
  const favoriteItems = useMemo(() => 
    adminFavorites.map(id => allItemsMap.get(id)).filter(Boolean) as typeof sections[0]['items'][0][],
  [adminFavorites, allItemsMap]);

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase().trim();
    return sections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
        ),
      }))
      .filter(section => section.items.length > 0);
  }, [searchQuery, sections]);

  const totalFilteredItems = useMemo(() => 
    filteredSections.reduce((sum, s) => sum + s.items.length, 0),
  [filteredSections]);

  // Generate breadcrumbs based on current view
  const getBreadcrumbs = () => {
    const crumbs = [{
      label: 'Home',
      icon: Home,
      onClick: onBack
    }];
    switch (activeView) {
      case 'dashboard':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: undefined
        });
        break;
      case 'users':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: () => setActiveView('dashboard')
        });
        crumbs.push({
          label: 'User Management',
          icon: Users,
          onClick: undefined
        });
        break;
      case 'activity-log':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: () => setActiveView('dashboard')
        });
        crumbs.push({
          label: 'Activity Log',
          icon: Activity,
          onClick: undefined
        });
        break;
      case 'handover-management':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: () => setActiveView('dashboard')
        });
        crumbs.push({
          label: 'VCRs and PSSRs',
          icon: Key,
          onClick: undefined
        });
        break;
    }
    return crumbs;
  };

  // Handle conditional views AFTER all hooks - wrapped in Suspense for lazy loading
  if (activeView === 'users') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <EnhancedUserManagement onBack={() => setActiveView('dashboard')} onBulkUpload={() => setActiveView('bulk-upload')} selectedLanguage={language} translations={t} />
        </Suspense>
      </div>;
  }
  if (activeView === 'activity-log') {
    return <div className="flex-1 overflow-y-auto animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <AdminActivityLog onBack={() => setActiveView('dashboard')} selectedLanguage={language} />
        </Suspense>
      </div>;
  }
  if (activeView === 'ora-configuration') {
    return <div className="flex-1 overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <ORAConfigurationManagement onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'handover-management') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in min-h-0">
        <Suspense fallback={<ViewLoadingFallback />}>
          <ManageHandover onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'bulk-upload') {
    return <div className="flex-1 overflow-hidden animate-fade-in p-6">
        <Suspense fallback={<ViewLoadingFallback />}>
          <BulkUserUpload onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'integration-hub') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <IntegrationHub onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'sso') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <SSOConfiguration onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'roles-permissions') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <RolePermissionsManager onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'audit-logs') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <AuditLogViewer onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'session-timeout') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <SessionTimeoutConfig onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'brute-force') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <BruteForceConfig onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'data-export') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <DataExport onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'audit-retention') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <AuditLogRetention onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'disaster-recovery') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <DisasterRecoveryRunbook onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'api-keys') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <ApiKeyManagement onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'webhook-security') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <WebhookSecurity onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'integration-health') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <IntegrationHealth onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'user-offboarding') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <UserOffboarding onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'permission-review') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <PermissionReview onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'deployment-log') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <DeploymentLog onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'feature-flags') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <TenantFeatureFlags onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'security-document') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <EnterpriseSecurityDocument onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'platform-guide') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <PlatformGuideDocument onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'northstar-document') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <StrategicNorthstarDocument onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'incident-response') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <IncidentResponseRunbook onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'deployment-configs') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <DeploymentConfigs onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'journey-maps') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <CustomerJourneyMaps onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'process-flows') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <ProcessFlowMaps onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'document-management') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <DocumentManagementSystem onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'ai-agent-strategy') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <AIAgentStrategyDocument onBack={() => setActiveView('dashboard')} />
        </Suspense>
      </div>;
  }
  if (activeView === 'ai-agents-hub') {
    const state = location.state as any;
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <AIAgentHub
            embedded
            onBackToAdmin={() => setActiveView('dashboard')}
            initialAgentCode={state?.agentCode || null}
            initialTab={state?.initialTab || null}
          />
        </Suspense>
      </div>;
  }
  
  // Show skeleton while initial data is loading
  if (isInitialLoading) {
    return <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header Skeleton */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
          <div className="h-4 w-48 bg-muted animate-pulse rounded mb-3" />
          <div className="flex items-center justify-between mt-2 md:mt-3">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-muted animate-pulse shrink-0" />
              <div className="space-y-2">
                <div className="h-5 md:h-6 w-32 md:w-40 bg-muted animate-pulse rounded" />
                <div className="h-3 md:h-4 w-44 md:w-56 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 overflow-auto">
          <div className="container pt-6 md:pt-8 pb-20 md:pb-8 max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex items-center justify-end mb-6 md:mb-10">
              <div className="w-full sm:w-80 h-10 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader className="relative space-y-4 p-6">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                      <div className="flex flex-col items-end space-y-1">
                        <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
    </div>;
  }


  return <><div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
          <BreadcrumbNavigation currentPageLabel="Administration" favoritePath="/admin-tools" />
          <div className="flex items-center justify-between mt-2 md:mt-3">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-slate-600 to-gray-700 flex items-center justify-center shadow-lg shrink-0">
                <Sliders className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight truncate">
                  {t.administration}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {t.adminToolsSubtitle}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container pt-4 md:pt-6 pb-20 md:pb-8 max-w-6xl mx-auto px-4 md:px-6">
            {/* Search Bar */}
            <div className="flex items-center justify-end mb-6 md:mb-8">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="text" placeholder={t.searchAdminTools} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-10 h-9 text-sm bg-card border-border/50 rounded-lg" />
                {searchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>}
              </div>
            </div>

            {searchQuery && <p className="text-xs text-muted-foreground mb-4">
              Found {totalFilteredItems} {totalFilteredItems === 1 ? 'result' : 'results'}
            </p>}

            {/* Favorites Section */}
            {favoriteItems.length > 0 && !searchQuery && (
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-600/80 whitespace-nowrap select-none">
                    FAVORITES
                  </span>
                  <div className="flex-1 h-px bg-amber-300/30" />
                  <span className="text-[10px] text-amber-500/60 tabular-nums">{favoriteItems.length}</span>
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {favoriteItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={`fav-${item.id}`}
                        className="group bg-card border border-amber-200/50 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:shadow-amber-500/15 hover:-translate-y-1 hover:border-amber-300/60 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] relative h-[72px] flex items-center"
                        onClick={item.onClick}
                      >
                        <button
                          onClick={(e) => toggleAdminFavorite(item.id, e)}
                          className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted/50 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100"
                          aria-label="Remove from favorites"
                        >
                          <Star className="h-3.5 w-3.5 text-amber-400/60 fill-amber-400/60 hover:text-amber-500 hover:fill-amber-500 transition-all duration-200" />
                        </button>
                        <div className="flex items-start gap-3 pr-6 w-full">
                          {(item as any).avatarSrc ? (
                            <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-300 border-2 border-gradient bg-gradient-to-br ${item.gradient} p-[2px]`}>
                              <img src={(item as any).avatarSrc} alt={item.title} className="w-full h-full object-cover rounded-full" loading="lazy" />
                            </div>
                          ) : (
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                              <IconComponent className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                {item.title}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sections */}
            <div className="space-y-6">
              {filteredSections.map((section) => {
                const isOpen = !collapsedSections.has(section.label);
                const toggleSection = () => {
                  setCollapsedSections(prev => {
                    const next = new Set(prev);
                    if (next.has(section.label)) next.delete(section.label);
                    else next.add(section.label);
                    return next;
                  });
                };
                return (
                  <Collapsible key={section.label} open={isOpen} onOpenChange={toggleSection}>
                    <CollapsibleTrigger className="flex items-center gap-3 w-full group/header cursor-pointer mb-3">
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 whitespace-nowrap select-none group-hover/header:text-muted-foreground transition-colors">
                        {section.label}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums">{section.items.length}</span>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {section.items.map((item) => {
                          const IconComponent = item.icon;
                          const isFav = adminFavorites.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              className="group bg-card border border-border/40 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:border-border/80 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] relative h-[72px] flex items-center"
                              onClick={item.onClick}
                            >
                              <button
                                onClick={(e) => toggleAdminFavorite(item.id, e)}
                                className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted/50 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100"
                                aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                              >
                                <Star className={`h-3.5 w-3.5 transition-all duration-200 ${
                                  isFav 
                                    ? 'text-amber-400/80 fill-amber-400/80 hover:text-amber-500 hover:fill-amber-500' 
                                    : 'text-muted-foreground/40 hover:text-amber-400'
                                }`} />
                              </button>
                              <div className="flex items-start gap-3 pr-6 w-full">
                              {(item as any).avatarSrc ? (
                                <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br ${item.gradient} p-[2px]`}>
                                  <img src={(item as any).avatarSrc} alt={item.title} className="w-full h-full object-cover rounded-full" loading="lazy" />
                                </div>
                              ) : (
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                  <IconComponent className="h-4 w-4 text-white" />
                                </div>
                              )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                      {item.title}
                                    </h3>
                                  </div>
                                  <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed line-clamp-1">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>

            {/* No Results */}
            {totalFilteredItems === 0 && <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">{t.noResultsFound}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t.tryAdjustingSearch}</p>
                <Button variant="outline" onClick={() => setSearchQuery('')}>{t.clearSearch}</Button>
              </div>}
          </div>
        </div>
    </div>
    <Suspense fallback={null}>
      {tenantSetupOpen && <TenantSetupWizardLazy open={tenantSetupOpen} onOpenChange={setTenantSetupOpen} />}
    </Suspense>
    </>;
};
const AdminToolsPage: React.FC<AdminToolsPageProps> = props => {
  return <AdminToolsPageContent {...props} />;
};
export default AdminToolsPage;