# Plan: Resize and Reposition Bob AI Hero Panel

## Objective
Make the "Good Morning, Daniel" panel with the Bob Chat interface bigger, more centralized, slightly narrower, and taller - positioned more mid-screen rather than top of screen.

## File to Modify
`src/components/LandingPage.tsx`

## Changes

### 1. Update Parent Container (around line 585)
Add vertical centering to the flex container:
```tsx
// Change from:
<div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">

// To:
<div className="flex-1 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
```

### 2. Update Initial Spacer
Change the fixed height spacer to a flexible one:
```tsx
// Change from:
<div className="min-h-[4vh] md:min-h-[8vh]" />

// To:
<div className="flex-1 min-h-[10vh] md:min-h-[15vh]" />
```

### 3. Reduce Card Width (around line 590)
Add max-width constraint to the Card:
```tsx
// Change from:
<Card className="...existing classes...">

// To:
<Card className="w-full max-w-xl ...existing classes...">
```

### 4. Increase Card Height (around line 591)
Update padding and add minimum height to the inner div:
```tsx
// Change from:
<div className="p-8 md:p-12 space-y-6 md:space-y-8">

// To:
<div className="p-10 md:p-16 space-y-6 md:space-y-8 min-h-[200px] md:min-h-[280px]">
```

### 5. Add Bottom Spacer After Quick Actions Section
Add a flexible spacer after the Quick Actions section to help center the content:
```tsx
// After the Quick Actions section, add:
<div className="flex-1 min-h-[5vh]" />
```

## Expected Result
- Panel will be vertically centered on the screen (mid-screen position)
- Width reduced from ~672px to ~576px (max-w-xl instead of max-w-2xl)
- Height increased with more padding and minimum height constraints
- Content will be more prominent and visually centered in the viewport
