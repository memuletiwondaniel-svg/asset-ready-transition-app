// Centralized sidebar navigation utility
// This ensures consistent routing across all pages that use OrshSidebar

export const SIDEBAR_ROUTES: Record<string, string> = {
  'home': '/home',
  'ask-orsh': '/ask-orsh', // Handled specially by sidebar (opens chat)
  'pssr': '/pssr',
  'my-tasks': '/my-tasks',
  'operation-readiness': '/operation-readiness',
  'or-maintenance': '/or-maintenance',
  'competence-management': '/competence-management',

  'projects': '/projects',
  'project-management': '/project-management',
  'admin-tools': '/admin-tools',
  'users': '/admin/users',
  'user-management': '/admin/users',
};

/**
 * Get the correct route for a sidebar section
 */
export const getSidebarRoute = (section: string): string => {
  return SIDEBAR_ROUTES[section] || `/${section}`;
};

/**
 * Create a navigation handler for the sidebar
 */
export const createSidebarNavigator = (
  navigate: (path: string, options?: any) => void,
  customHandlers?: Record<string, () => void>,
  onSameRouteNavigate?: () => void,
  currentPath?: string
) => {
  return (section: string) => {
    if (customHandlers && customHandlers[section]) {
      customHandlers[section]();
      return;
    }

    const route = getSidebarRoute(section);

    if (currentPath && route === currentPath && onSameRouteNavigate) {
      onSameRouteNavigate();
    }

    navigate(route, { state: { navKey: Date.now() } });
  };
};
