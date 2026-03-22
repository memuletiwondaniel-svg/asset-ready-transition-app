import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, FolderOpen, Folder, Settings, ArrowLeft, ClipboardList, CheckCircle, Home, Search, X, Star, Activity, Sliders, Building2, LayoutTemplate, Key, Loader2, Upload, Plug, Shield, FileSearch, Timer, ShieldAlert, Database, Archive, BookOpen, KeyRound, Webhook, HeartPulse, UserMinus, ClipboardCheck, Rocket, Flag, FileText, Compass, AlertTriangle, Container, MapPin, GitBranch, Files, Brain } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

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
const APIManagement = lazy(() => import("./admin-tools/APIManagement"));
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
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'activity-log' | 'ora-configuration' | 'handover-management' | 'bulk-upload' | 'apis' | 'sso' | 'roles-permissions' | 'audit-logs' | 'session-timeout' | 'brute-force' | 'data-export' | 'audit-retention' | 'disaster-recovery' | 'api-keys' | 'webhook-security' | 'integration-health' | 'user-offboarding' | 'permission-review' | 'deployment-log' | 'feature-flags' | 'security-document' | 'platform-guide' | 'northstar-document' | 'incident-response' | 'deployment-configs' | 'journey-maps' | 'process-flows' | 'document-management' | 'ai-agent-strategy' | 'tenant-setup'>(() => {
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
  const [favoriteTools, setFavoriteTools] = useState<string[]>([]);
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

  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('orsh-favorite-admin-tools');
    if (stored) {
      try {
        setFavoriteTools(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing favorite tools:', e);
      }
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setFavoriteTools(prev => {
      const updated = prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId];
      localStorage.setItem('orsh-favorite-admin-tools', JSON.stringify(updated));
      return updated;
    });
  };
  const adminTools = [{
    id: 'users',
    title: t.manageUser,
    description: t.manageUserDesc,
    icon: Users,
    gradient: 'from-blue-500 to-blue-600',
    tooltip: t.manageUserDesc,
    stats: {
      total: userStats.total,
      label: t.users
    },
    height: 'md:row-span-2',
    onClick: () => setActiveView('users')
  }, {
    id: 'projects',
    title: t.manageProjects,
    description: t.manageProjectsDesc,
    icon: Building2,
    gradient: 'from-purple-500 to-purple-600',
    tooltip: t.manageProjectsDesc,
    stats: {
      total: projectStats.total,
      label: t.projects
    },
    height: 'md:row-span-2',
    onClick: () => navigate('/project-management')
  }, {
    id: 'handover-management',
    title: 'VCRs and PSSRs',
    description: 'Configure Verification Certificate of Readiness, Pre-Startup Safety Reviews, and Certificates (SoF, PACs and FACs)',
    icon: Key,
    gradient: 'from-blue-500 to-cyan-500',
    tooltip: t.manageHandoverDesc || 'Configure PAC, FAC, SoF certificates and OWL tracking',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('handover-management')
  }, {
    id: 'activity-log',
    title: t.activityLogTitle,
    description: t.activityLogDesc,
    icon: Activity,
    gradient: 'from-cyan-500 to-cyan-600',
    tooltip: t.activityLogDesc,
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('activity-log')
  }, {
    id: 'ora-configuration',
    title: t.oraPlans || 'ORA Plan',
    description: t.manageORAPlansDesc,
    icon: LayoutTemplate,
    gradient: 'from-amber-500 to-amber-600',
    tooltip: t.manageORAPlansDesc,
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('ora-configuration')
  }, {
    id: 'apis',
    title: 'APIs',
    description: 'Configure interfaces between ORSH and external applications such as SAP4HANA, Primavera P6, GoCompletions, Assai, SharePoint',
    icon: Plug,
    gradient: 'from-emerald-500 to-teal-600',
    tooltip: 'Manage Application Programming Interfaces (APIs) for integrating ORSH with external systems',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('apis')
  }, {
    id: 'sso',
    title: 'Single Sign-On',
    description: 'Configure SAML 2.0 SSO with your Identity Provider (Azure AD, Okta, OneLogin) for enterprise authentication',
    icon: Shield,
    gradient: 'from-indigo-500 to-purple-600',
    tooltip: 'Configure enterprise SSO authentication per tenant',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('sso')
  }, {
    id: 'roles-permissions',
    title: 'Roles & Permissions',
    description: 'Configure what each role can do — create projects, VCRs, PSSRs, approve documents, and more',
    icon: Shield,
    gradient: 'from-rose-500 to-pink-600',
    tooltip: 'Manage role-based access control (RBAC) across the platform',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('roles-permissions')
  }, {
    id: 'audit-logs',
    title: 'Security Audit Logs',
    description: 'Track all authentication events, admin actions, PSSR/SoF approvals, and permission changes',
    icon: FileSearch,
    gradient: 'from-slate-600 to-zinc-700',
    tooltip: 'View detailed audit trail for security and compliance',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('audit-logs')
  }, {
    id: 'session-timeout',
    title: 'Session Timeout',
    description: 'Configure auto-logout duration, warning timer, and inactivity timeout for all users',
    icon: Timer,
    gradient: 'from-indigo-500 to-violet-600',
    tooltip: 'Set session timeout and idle lock policies',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('session-timeout')
  }, {
    id: 'brute-force',
    title: 'Brute-Force Protection',
    description: 'Configure account lockout thresholds, lockout duration, and progressive lockout policies',
    icon: ShieldAlert,
    gradient: 'from-red-500 to-rose-600',
    tooltip: 'Protect accounts from brute-force login attacks',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('brute-force')
  }, {
    id: 'data-export',
    title: 'Data Export',
    description: 'Export critical tables (projects, users, audit logs) in CSV or JSON for backup and compliance',
    icon: Database,
    gradient: 'from-teal-500 to-emerald-600',
    tooltip: 'Download application data for offline backup',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('data-export')
  }, {
    id: 'audit-retention',
    title: 'Audit Log Retention',
    description: 'Configure retention period and purge old audit log entries automatically',
    icon: Archive,
    gradient: 'from-orange-500 to-amber-600',
    tooltip: 'Manage audit log lifecycle and storage',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('audit-retention')
  }, {
    id: 'disaster-recovery',
    title: 'Disaster Recovery Runbook',
    description: 'Step-by-step procedures for backup verification, database restore, and incident recovery',
    icon: BookOpen,
    gradient: 'from-cyan-600 to-blue-700',
    tooltip: 'View disaster recovery procedures and checklists',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('disaster-recovery')
  }, {
    id: 'api-keys',
    title: 'API Key Management',
    description: 'Generate, scope, rotate, and revoke API keys for external integrations with rate limiting and IP restrictions',
    icon: KeyRound,
    gradient: 'from-violet-500 to-purple-600',
    tooltip: 'Manage scoped API keys for SAP, Primavera, GoCompletions, and RPA bots',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('api-keys')
  }, {
    id: 'webhook-security',
    title: 'Webhook Security',
    description: 'Configure HMAC signature verification for incoming webhook payloads from external systems',
    icon: Webhook,
    gradient: 'from-sky-500 to-blue-600',
    tooltip: 'Verify webhook authenticity with HMAC signatures',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('webhook-security')
  }, {
    id: 'integration-health',
    title: 'Integration Health',
    description: 'Monitor API call success rates, response times, error rates, and usage patterns per integration',
    icon: HeartPulse,
    gradient: 'from-green-500 to-emerald-600',
    tooltip: 'Real-time health dashboard for all external API integrations',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('integration-health')
  }, {
    id: 'user-offboarding',
    title: 'User Offboarding',
    description: 'Securely deactivate departing users — cancel tasks, revoke API keys, remove roles, and flag stale accounts',
    icon: UserMinus,
    gradient: 'from-red-500 to-rose-600',
    tooltip: 'Manage user departure and stale account detection',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('user-offboarding')
  }, {
    id: 'permission-review',
    title: 'Permission Reviews',
    description: 'Schedule periodic access certification campaigns, review user permissions, and track high-privilege grants',
    icon: ClipboardCheck,
    gradient: 'from-indigo-500 to-violet-600',
    tooltip: 'Quarterly permission review campaigns and access certification',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('permission-review')
  }, {
    id: 'deployment-log',
    title: 'Deployment Log',
    description: 'Track releases with version labels, release notes, and a pre-publish verification checklist',
    icon: Rocket,
    gradient: 'from-emerald-500 to-teal-600',
    tooltip: 'Log deployments and verify changes before publishing to production',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('deployment-log')
  }, {
    id: 'feature-flags',
    title: 'Tenant Feature Flags',
    description: 'Enable or disable modules per company — ship features to one tenant first, then roll out to all',
    icon: Flag,
    gradient: 'from-amber-500 to-orange-600',
    tooltip: 'Per-tenant feature toggles for controlled rollouts',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('feature-flags')
  }, {
    id: 'security-document',
    title: 'Security & Compliance Doc',
    description: 'Live enterprise security document covering authentication, RBAC, multi-tenancy, audit, DR, and compliance posture',
    icon: FileText,
    gradient: 'from-slate-600 to-zinc-700',
    tooltip: 'View the living ORSH enterprise security and compliance document',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('security-document')
  }, {
    id: 'platform-guide',
    title: 'Platform Guide',
    description: 'Comprehensive guide explaining all ORSH workflows, codes, tables, roles, automations, and integrations',
    icon: BookOpen,
    gradient: 'from-blue-600 to-indigo-700',
    tooltip: 'View the living ORSH platform guide — how everything works',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('platform-guide')
  }, {
    id: 'northstar-document',
    title: 'Strategic North Star',
    description: 'ORSH → ORIP evolution roadmap, investor pitch, board-level strategic brief, and acquisition-positioning narrative',
    icon: Compass,
    gradient: 'from-amber-600 to-orange-700',
    tooltip: 'View the living ORSH Strategic North Star — vision, positioning, and ORIP roadmap',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('northstar-document')
  }, {
    id: 'incident-response',
    title: 'Incident Response Runbook',
    description: 'Interactive severity classification, escalation paths, response SLAs, and containment procedures',
    icon: AlertTriangle,
    gradient: 'from-red-600 to-rose-700',
    tooltip: 'Structured incident response with P1-P4 severity levels and built-in containment capabilities',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('incident-response')
  }, {
    id: 'deployment-configs',
    title: 'Deployment Configs',
    description: 'Docker Compose for single-tenant/air-gapped, GitHub Actions CI/CD pipeline, and environment templates',
    icon: Container,
    gradient: 'from-cyan-600 to-blue-700',
    tooltip: 'Download ready-to-use deployment configurations for self-hosted and CI/CD environments',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('deployment-configs')
  }, {
    id: 'journey-maps',
    title: 'Customer Journey Maps',
    description: 'Role-based journey maps with real user personas, goals, pain points, and platform interaction flows',
    icon: MapPin,
    gradient: 'from-pink-600 to-rose-700',
    tooltip: 'View enhanced customer journey maps for all configured roles with real profiles',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('journey-maps')
  }, {
    id: 'process-flows',
    title: 'Process Flow Maps',
    description: 'Complete process documentation covering all ORSH workflows, approval chains, and automation triggers',
    icon: GitBranch,
    gradient: 'from-emerald-600 to-teal-700',
    tooltip: 'View detailed process flow maps explaining every ORSH process',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('process-flows')
  }, {
    id: 'document-management',
    title: 'Document Management',
    description: 'Configure document types, categories, lifecycle phases, and the Project Lifecycle Information Plan',
    icon: Files,
    gradient: 'from-sky-500 to-blue-600',
    tooltip: 'Set up the Document Management System and Project Lifecycle Information Plan',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('document-management')
  }, {
    id: 'ai-agent-strategy',
    title: 'AI Agent Strategy & Training',
    description: 'Living document covering AI agent architecture, development phases, training strategy, gaps, and continuous improvement',
    icon: Brain,
    gradient: 'from-violet-600 to-purple-700',
    tooltip: 'View the AI agent strategy, training methodology, and continuous improvement framework',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('ai-agent-strategy')
  }, {
    id: 'tenant-setup',
    title: 'Tenant Setup Wizard',
    description: 'Guided 7-step wizard to configure plants, fields, hubs, commissions, roles, and invite users for a new organisation',
    icon: Compass,
    gradient: 'from-teal-500 to-cyan-600',
    tooltip: 'Launch the guided tenant setup wizard to configure your organisation',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setTenantSetupOpen(true)
  }];

  // Filter admin tools based on search query
  const filteredAdminTools = useMemo(() => {
    if (!searchQuery.trim()) return adminTools;
    const query = searchQuery.toLowerCase().trim();
    return adminTools.filter(tool => tool.title.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query) || tool.tooltip.toLowerCase().includes(query));
  }, [searchQuery, userStats.total, projectStats.total, t]);

  // Get favorite and non-favorite tools
  const favoriteToolsList = useMemo(() => {
    return filteredAdminTools.filter(tool => favoriteTools.includes(tool.id));
  }, [filteredAdminTools, favoriteTools]);
  const nonFavoriteToolsList = useMemo(() => {
    return filteredAdminTools.filter(tool => !favoriteTools.includes(tool.id));
  }, [filteredAdminTools, favoriteTools]);

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
  if (activeView === 'apis') {
    return <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <Suspense fallback={<ViewLoadingFallback />}>
          <APIManagement onBack={() => setActiveView('dashboard')} />
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
  
  // Show skeleton while initial data is loading
  if (isInitialLoading) {
    return <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header Skeleton */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
          <div className="h-4 w-48 bg-muted animate-pulse rounded mb-3" />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-40 bg-muted animate-pulse rounded" />
                <div className="h-4 w-56 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 overflow-auto">
          <div className="container pt-8 pb-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-end mb-10">
              <div className="w-96 h-10 bg-muted animate-pulse rounded-lg" />
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
  
  return <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
          <BreadcrumbNavigation currentPageLabel="Administration" favoritePath="/admin-tools" />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-gray-700 flex items-center justify-center shadow-lg">
                <Sliders className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {t.administration}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t.adminToolsSubtitle}
                </p>
              </div>
            </div>
            
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container pt-8 pb-8 max-w-7xl mx-auto">
            {/* Search Bar Section */}
            <div className="flex items-center justify-end mb-10">
            {/* Search Bar - Compact Design */}
            <div className="relative w-96">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg blur-xl" />
              <div className="relative bg-background border-2 border-border/50 rounded-lg shadow-sm hover:border-primary/30 transition-colors">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="text" placeholder={t.searchAdminTools} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-10 h-10 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />
                {searchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>}
              </div>
            </div>
          </div>
          
          {searchQuery && <p className="text-sm text-muted-foreground mb-6">
              {t.foundResults} {filteredAdminTools.length} {filteredAdminTools.length === 1 ? t.result : t.results}
            </p>}

          {/* Favorites Section */}
        <TooltipProvider>
          {favoriteToolsList.length > 0 && <div className="mb-12">
              <h2 className="text-sm font-medium text-foreground/70 mb-5 flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                {t.favoriteTools}
              </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteToolsList.map((tool) => {
                  const IconComponent = tool.icon;
                  const isFavorite = favoriteTools.includes(tool.id);
                  return <Card key={tool.id} interactive className="group relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 border-yellow-500/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden" onClick={tool.onClick}>
                      {/* Gradient Background Effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      
                    <CardHeader className="relative space-y-4 p-6">
                      {/* Icon and Stats Row */}
                      <div className="flex items-start justify-between">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg cursor-help`}>
                              <IconComponent className="h-6 w-6 text-white" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>{tool.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      
                        <div className="flex items-center gap-2">
                          {/* Stats Badge */}
                          {tool.stats.total !== undefined && <div className="flex flex-col items-end">
                              <span className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent transition-all duration-300">
                                {tool.stats.total}
                              </span>
                              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                {tool.stats.label || 'Total'}
                              </span>
                            </div>}
                          
                          {/* Favorite Star Button */}
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80" onClick={e => toggleFavorite(tool.id, e)}>
                            <Star className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Title & Description */}
                      <div className="space-y-1.5">
                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                          {tool.title}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {tool.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>;
                })}
            </div>
          </div>}

        {/* All Tools Section */}
        {nonFavoriteToolsList.length > 0 && <>
            {favoriteToolsList.length > 0 && <h2 className="text-sm font-medium text-foreground/70 mb-5">
                {t.allTools}
              </h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nonFavoriteToolsList.map((tool) => {
                  const IconComponent = tool.icon;
                  const isFavorite = favoriteTools.includes(tool.id);
                  return <Card key={tool.id} interactive className="group relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden" onClick={tool.onClick}>
                    {/* Gradient Background Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <CardHeader className="relative space-y-4 p-6">
                      {/* Icon and Stats Row */}
                      <div className="flex items-start justify-between">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg cursor-help`}>
                              <IconComponent className="h-6 w-6 text-white" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>{tool.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      
                        <div className="flex items-center gap-2">
                          {/* Stats Badge */}
                          {tool.stats.total !== undefined && <div className="flex flex-col items-end">
                              <span className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent transition-all duration-300">
                                {tool.stats.total}
                              </span>
                              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                {tool.stats.label || t.total}
                              </span>
                            </div>}
                          
                          {/* Favorite Star Button */}
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80" onClick={e => toggleFavorite(tool.id, e)}>
                            <Star className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
                          </Button>
                        </div>
                      </div>
                    
                    {/* Title & Description */}
                    <div className="space-y-1.5">
                      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                        {tool.title}
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {tool.description}
                      </CardDescription>
                    </div>
                    
                    {/* Hover Indicator */}
                    <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2">
                      <span>{t.manage}</span>
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </div>
                  </CardHeader>
                </Card>;
                })}
            </div>
          </>}

        {/* No Results */}
        {filteredAdminTools.length === 0 && <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t.noResultsFound}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t.tryAdjustingSearch}
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              {t.clearSearch}
            </Button>
            </div>}
        </TooltipProvider>
        </div>
      </div>
    </div>;
};
const AdminToolsPage: React.FC<AdminToolsPageProps> = props => {
  return <AdminToolsPageContent {...props} />;
};
export default AdminToolsPage;