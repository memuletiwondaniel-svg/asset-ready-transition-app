// Centralized sidebar navigation utility
// This ensures consistent routing across all pages that use OrshSidebar

export const SIDEBAR_ROUTES: Record<string, string> = {
  'home': '/home',
  'ask-orsh': '/ask-orsh', // Handled specially by sidebar (opens chat)
  'pssr': '/pssr',
  'my-tasks': '/my-tasks',
  'operation-readiness': '/operation-readiness',
  'or-maintenance': '/or-maintenance',
  'p2a-handover': '/p2a-handover',
  'projects': '/projects',
  'project-management': '/project-management',
  'admin-tools': '/admin-tools',
  'users': '/users',
  'user-management': '/users',
  'manage-checklist': '/manage-checklist',
};

/**
 * Get the correct route for a sidebar section
 */
export const getSidebarRoute = (section: string): string => {
  return SIDEBAR_ROUTES[section] || `/${section}`;
};

/**
 * Create a navigation handler for the sidebar
 * @param navigate - React Router navigate function
 * @param customHandlers - Optional custom handlers for specific sections (e.g., staying on current page)
 */
export const createSidebarNavigator = (
  navigate: (path: string) => void,
  customHandlers?: Record<string, () => void>
) => {
  return (section: string) => {
    // Check for custom handlers first (e.g., staying on current page)
    if (customHandlers && customHandlers[section]) {
      customHandlers[section]();
      return;
    }
    
    const route = getSidebarRoute(section);
    navigate(route);
  };
};
