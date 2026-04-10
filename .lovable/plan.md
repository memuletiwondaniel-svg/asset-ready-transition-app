

# Increase Training Upload Limit to 50MB

**File: `src/components/admin-tools/agents/AgentTrainingStudio.tsx`**

Single constant change — update the `MAX_FILE_SIZE` constant from `20 * 1024 * 1024` (20MB) to `50 * 1024 * 1024` (50MB), and update the two toast error messages from `'File too large (max 20MB)'` to `'File too large (max 50MB)'`.

This is safe because files upload to Supabase Storage (`agent-training-docs` bucket) which supports 50MB on the Pro plan. The 20MB was an arbitrary client-side guard.

