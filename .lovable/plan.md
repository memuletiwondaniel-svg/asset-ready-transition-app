

## Problem

Section headers like "Here's what this likely means" and "What I recommend" render at `text-[13px]` -- smaller than the body text (`text-sm` = 14px). The `prose prose-sm` Tailwind typography classes further override custom heading styles, making headers visually indistinguishable from body text.

## Solution

Replace the current approach of fighting `prose` utility classes with **explicit ReactMarkdown component overrides** that use proper sizing hierarchy:

### Changes to `src/components/widgets/ORSHChatDialog.tsx`

1. **Remove `prose prose-sm dark:prose-invert`** from the container div -- these classes override custom heading styles and are the root cause of the conflict.

2. **Update `h2` component** to render with clear visual dominance:
   - Size: `text-base` (16px) instead of `text-[13px]`
   - Weight: `font-bold`
   - Layout: `flex items-center gap-2` to support emoji icons
   - Spacing: `mt-5 mb-2` with a subtle top border divider

3. **Update `h3` component**:
   - Size: `text-[15px]` 
   - Weight: `font-bold`
   - Spacing: `mt-4 mb-1.5`

4. **Keep body text at `text-sm` (14px)** so headers are visibly larger.

This ensures a clear typographic hierarchy: `h2 (16px bold) > h3 (15px bold) > body (14px normal)`, which is the standard pattern in enterprise SaaS apps like Notion, Linear, and Slack.

