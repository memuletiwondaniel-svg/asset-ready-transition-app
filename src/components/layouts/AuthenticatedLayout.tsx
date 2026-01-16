import React, { useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { createSidebarNavigator } from '@/utils/sidebarNavigation';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

/**
 * Persistent layout for authenticated pages.
 * The sidebar stays mounted across all navigation, preventing reloads.
 */
export const AuthenticatedLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  // Determine current page from route for sidebar highlighting
  const currentPage = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/operation-readiness')) return 'operation-readiness';
    if (path.startsWith('/p2a-handover')) return 'p2a-handover';
    if (path.startsWith('/or-maintenance')) return 'or-maintenance';
    if (path.startsWith('/pssr')) return 'pssr';
    if (path.startsWith('/my-tasks')) return 'my-tasks';
    if (path.startsWith('/projects') || path.startsWith('/project/')) return 'projects';
    if (path.startsWith('/project-management')) return 'project-management';
    if (path.startsWith('/users')) return 'users';
    if (path.startsWith('/admin-tools')) return 'admin-tools';
    if (path.startsWith('/manage-checklist')) return 'manage-checklist';
    // Default: extract first segment
    return path.slice(1).split('/')[0] || 'home';
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    navigate('/auth');
  };

  const handleNavigate = createSidebarNavigator(navigate);

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <OrshSidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthenticatedLayout;
