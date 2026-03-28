

## Problems

1. **Follow-up chip text rendered as bold section header**: When a user clicks a follow-up chip like "Show only approved documents", it becomes a user message. The markdown rendering applies the section header regex to ALL messages (including user messages), matching text that starts with a capital letter and is 8-60 chars — converting it to `## 📌 Show only approved documents` with bold icon formatting.

2. **"Read and summarise" uses raw doc number**: The `DocActionButtons` component sends `Read and summarise 6529-CPEC-C017-...` — a meaningless string to users. It should use the document title instead.

## Changes

### 1. `src/components/widgets/ORSHChatDialog.tsx` — Skip header normalization for user messages

Wrap the section header regex processing (lines 935-958) in a condition: only apply when `message.role === 'assistant'`. User messages should render as plain text without any header/icon transformation.

### 2. `src/components/bob/StructuredResponse.tsx` — Use document title in "Read and summarise"

Update `DocActionButtons` to accept `title` prop alongside `docNumber`. Change the `onRead` call from:
```
`Read and summarise ${docNumber}`
```
to:
```
`Read and summarise ${title || docNumber}`
```

Update all `DocActionButtons` usages (3 places in the file) to pass the `doc.title` prop from the document row data, which is already available in every render context.

