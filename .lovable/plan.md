

## Problem

Follow-up chip buttons render their text as raw strings (line 1009: `{item}?`), not through ReactMarkdown. When the AI includes `**bold**` markers in follow-up suggestions, the `**` asterisks display literally in the chips.

## Fix

**File: `src/components/widgets/ORSHChatDialog.tsx`**

Strip all `**` markers from chip display text. On line 1009, change:

```tsx
{item}?
```

to:

```tsx
{item.replace(/\*\*/g, '')}?
```

Also strip from the message sent on click (line 1006), change:

```tsx
onClick={() => handleSend(item + '?')}
```

to:

```tsx
onClick={() => handleSend(item.replace(/\*\*/g, '') + '?')}
```

This is a permanent fix — it strips markdown bold syntax at the rendering layer so regardless of what the AI returns, chips always display clean text.

