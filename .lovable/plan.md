

## Problem

Three issues visible in the screenshot:

1. **Headers not bold**: "Here's what this likely means" contains an ASCII apostrophe (`'`) but the regex character class only includes curly/smart quotes (`''"`), so the header is never converted to a `##` markdown header — it renders as plain text.

2. **List items not indented/bulleted**: The `ul` and `ol` ReactMarkdown components have no explicit overrides — they rely on bracket-notation CSS which may not produce visible bullets and proper indentation.

3. **Section divider too faint**: `border-border/20` (20% opacity) is nearly invisible.

## Changes to `src/components/widgets/ORSHChatDialog.tsx`

### 1. Fix header regex to include ASCII apostrophe

Line 933 — add `'` (ASCII apostrophe) to the character class:
```
/^([A-Z][A-Za-z\s'''""]+(?:from the metadata)?):?\s*$/gm
```
Also add "Here's what this likely means" and "Here's what this likely means" to the `sectionIcons` map with a suitable icon (e.g., `🔍`).

### 2. Force bold on headers with `font-extrabold` + inline style

Replace `font-bold` with `font-extrabold` on both `h2` and `h3` component overrides, and add `style={{ fontWeight: 800 }}` as a failsafe to guarantee boldness regardless of any CSS specificity conflicts:

```tsx
h2: ({ children }) => (
  <h2 className="mt-5 mb-2 border-t border-border/40 pt-3 text-base font-extrabold tracking-tight text-foreground flex items-center gap-2" style={{ fontWeight: 800 }}>
    {children}
  </h2>
),
h3: ({ children }) => (
  <h3 className="mt-4 mb-1.5 text-[15px] font-bold text-foreground" style={{ fontWeight: 700 }}>
    {children}
  </h3>
),
```

### 3. Add explicit `ul`, `ol`, `li` component overrides for proper bullets and indentation

```tsx
ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1 text-sm">{children}</ul>,
ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1 text-sm">{children}</ol>,
li: ({ children }) => <li className="pl-1 marker:text-foreground">{processChildren(children)}</li>,
```

### 4. Make section divider more visible

Change `border-border/20` → `border-border/40` on the `h2` component (already shown above).

Also update the follow-up section border from `border-border/20` to `border-border/40`.

