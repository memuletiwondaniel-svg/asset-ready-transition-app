

# Desktop Responsiveness Overhaul — Final Plan

## Sr Developer's Conflict Resolution: Accepted

The `content-max` wrapper at `xl:max-w-[1400px]` would silently override `ProjectManagementPage`'s own `max-w-[1600px]`. Fix: drop the `xl:` step entirely, keep only `2xl:`:

```css
.content-max { @apply w-full 2xl:max-w-[1600px] mx-auto; }
```

Pages handle their own `xl:` constraints. The layout wrapper only prevents ultrawide stretching at 1536px+. Zero cascade conflicts.

---

## 7 Files, All Changes Final

### 1. `src/index.css` — Extend global utilities
- `.mobile-padding`: add `lg:px-8 xl:px-10`
- `.mobile-gap`: add `lg:gap-6 xl:gap-8`
- `.dashboard-grid`: add `xl:grid-cols-4` and `xl:gap-6`
- `.text-responsive-xl`: add `xl:text-3xl`
- New `.content-max`: `@apply w-full 2xl:max-w-[1600px] mx-auto;` (no `xl:` step)

### 2. `src/components/OrshSidebar.tsx` — Scale sidebar
- Expanded: `w-48 xl:w-52 2xl:w-56`, collapsed stays `w-16`

### 3. `src/components/LandingPage.tsx` — Scale landing page
- Outer padding: add `lg:p-8 xl:p-10`
- Bob card: add `xl:max-w-4xl`, inner padding add `xl:p-20`, min-height add `xl:min-h-[320px]`
- Greeting heading: add `xl:text-4xl`
- Bob input: add `xl:max-w-2xl`
- Favorites: add `xl:gap-4`, icon size add `xl:w-12 xl:h-12`

### 4. `src/components/AdminToolsPage.tsx` — Scale admin tools
- Container: add `xl:max-w-7xl`
- All card/favorites grids: add `xl:grid-cols-4`
- Page heading: add `xl:text-3xl`

### 5. `src/components/admin-tools/agents/AgentRosterGrid.tsx` — Match 4-col
- Grid: add `xl:grid-cols-4`

### 6. `src/components/layouts/AuthenticatedLayout.tsx` — Content cap
- Wrap `<Outlet>` with `content-max` class (2xl-only constraint)

### 7. `src/pages/MyTasksPage.tsx` — Heading only
- Page heading: add `xl:text-3xl`

### NOT Changed (verified correct)
- `ExecutiveDashboardPage.tsx` — Recharts auto-scales, grids are data-dense
- `ProjectManagementPage.tsx` — already has `max-w-[1600px]`
- Mobile/tablet layouts, component logic, auth, themes

### Permanence
These are compiled Tailwind classes in the JS bundle — not cached state. The previous cache-busting fixes (meta tags, hard reload on logout, Cache API clearing) ensure no stale bundles survive login cycles.

