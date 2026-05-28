import React, { useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { createSidebarNavigator } from '@/utils/sidebarNavigation';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDirectorRedirect } from '@/hooks/useDirectorRedirect';
import { Loader2 } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { hasSessionEpochMismatch, performHardReset } from '@/lib/app-reset';

/**
 * Persistent layout for authenticated pages.
 * The sidebar stays mounted across all navigation, preventing reloads.
 * Shows loading state while auth is being determined.
 */
export const AuthenticatedLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, session, loading } = useAuth();
  
  // Auto-redirect directors to their appropriate landing page
  // Returns isChecking to block render until redirect check completes
  const { isChecking } = useDirectorRedirect();

  useEffect(() => {
    if (hasSessionEpochMismatch()) {
      void performHardReset();
    }
  }, [location.pathname]);

  // Determine current page from route for sidebar highlighting
  const currentPage = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/operation-readiness')) return 'operation-readiness';
    
    if (path.startsWith('/or-maintenance')) return 'or-maintenance';
    if (path.startsWith('/competence-management')) return 'competence-management';
    if (path.startsWith('/pssr')) return 'pssr';
    if (path.startsWith('/my-tasks')) return 'my-tasks';
    if (path.startsWith('/executive-dashboard')) return 'executive-dashboard';
    if (path.startsWith('/projects') || path.startsWith('/project/')) return 'projects';
    if (path.startsWith('/project-management')) return 'project-management';
    if (path.startsWith('/admin/users')) return 'users';
    if (path.startsWith('/admin-tools')) return 'admin-tools';
    // Default: extract first segment
    return path.slice(1).split('/')[0] || 'home';
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut();
      await performHardReset();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigate = createSidebarNavigator(navigate);

  // Show loading state while auth is being determined or director check is running
  if (loading || isChecking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading ORSH...</p>
        </div>
      </div>
    );
  }

  // Redirect to landing page if not authenticated
  if (!session) {
    return <Navigate to="/" replace />;
  }

  const { language, setLanguage } = useLanguage();

  return (
    <div className="h-[100dvh] flex w-full overflow-hidden">
      {/* Sidebar — desktop aside is inside OrshSidebar (hidden on mobile); mobile uses Sheet trigger */}
      <OrshSidebar
        currentPage={currentPage}
        language={language}
        onLanguageChange={setLanguage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <AnimatedBackground className="flex-1 flex flex-col overflow-auto pb-16 md:pb-0">
        <div key={session.user.id} className="content-max flex-1 flex flex-col">
          <Outlet />
        </div>
      </AnimatedBackground>
    </div>
  );
};

export default AuthenticatedLayout;
