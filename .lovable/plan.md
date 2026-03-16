

## Plan: Increase Document Viewer Overlay Height

### Change

**File**: `src/components/document-collaboration/DocumentViewerOverlay.tsx` (line 66)

Increase `!h-[97vh]` → `!h-[98vh]` to use nearly the full viewport height. Going beyond 98vh risks clipping on some browsers with URL bars.

### Comments Panel — Avatar Photos

No code change needed. The `CommentsSidebar` already renders `<AvatarImage>` with the user's `avatar_url` and falls back to initials via `<AvatarFallback>`. Photos will display automatically for users who have uploaded a profile picture. This is the correct modern pattern (Figma, Notion, Linear all do the same).

