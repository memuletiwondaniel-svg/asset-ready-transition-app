Remove the Executive Dashboard navigation item from the sidebar menu.

## Change
File: `src/components/sidebar/SidebarContent.tsx`
- Delete the `navExecutiveDashboard` entry from the `navigationItems` array (line 76).

This removes the menu item that links to `/executive-dashboard`. The route and page component will remain in the app for now — only the sidebar link is removed.