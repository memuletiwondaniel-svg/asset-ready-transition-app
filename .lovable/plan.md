

## Problem Analysis

The "Users" favorite card shows a **Sliders (sliding bars) icon** instead of the **Users (people) icon**. This happens because the favorite was saved to localStorage with the path `/admin-tools` (the actual browser route) **before** the virtual path fix (`/admin-tools/users`) was implemented. The `FAVORITE_ICON_MAP` correctly maps `/admin-tools` → `Sliders` and `/admin-tools/users` → `Users`, but the stale data in localStorage still uses the old path.

## Root Cause

The old favorite entry in localStorage is `{ path: "/admin-tools", label: "User Management" }` instead of the corrected `{ path: "/admin-tools/users", label: "User Management" }`. So the icon lookup falls back to the `/admin-tools` entry which uses `Sliders`.

## Plan

### 1. Add a label-based fallback icon lookup in `LandingPage.tsx`

Update `getFavoriteIcon()` and `getFavoriteColor()` to accept the label as a second parameter. If no exact path match is found, search the map for a matching label or use known label-to-icon mappings. This handles stale localStorage data gracefully.

### 2. Add a localStorage migration in `useFavoritePages.ts`

On initialization, migrate known stale paths to their correct virtual paths:
- `/admin-tools` with label containing "User" → `/admin-tools/users`
- Similar mappings for other admin sub-pages that may have been saved incorrectly

This is a one-time migration that fixes existing stale data so the correct icon/path is used going forward.

### 3. Files to modify

- **`src/components/LandingPage.tsx`**: Add label-based fallback in `getFavoriteIcon()` and `getFavoriteColor()`, plus a `LABEL_ICON_MAP` for known labels like "User Management" → `Users`
- **`src/hooks/useFavoritePages.ts`**: Add migration logic in the initial state loader to fix stale `/admin-tools` entries based on their labels

