

# Fix: Runtime Crash + Dual Icons + Agent Identity

## Changes

### 1. Edge function: `const` → `let` (supabase/functions/ai-chat/index.ts)

Line 10852: change `const anthropicTools` to `let anthropicTools`. One word change.

### 2. Edge function: Emit agent identity (supabase/functions/ai-chat/index.ts)

After line 10297 (the `console.log` for detected agent), add:
```typescript
emitStatus(`agent:${detectedAgent}`);
```

### 3. Frontend: Agent identity + dual icon fix (src/components/widgets/ORSHChatDialog.tsx)

**Message interface** (line 87): Add `agentName?: string` field.

**State** (after line 122): Add `activeAgent` state:
```typescript
const [activeAgent, setActiveAgent] = useState<string>('copilot');
```

**SSE parser** (line 591): Parse `agent:` prefix from status events:
```typescript
if (eventType === 'status' && parsed.status) {
  if (parsed.status.startsWith('agent:')) {
    setActiveAgent(parsed.status.replace('agent:', ''));
    continue;
  }
  setAgentStatus(parsed.status);
  continue;
}
```

**Assistant placeholder** (line 557): Tag with active agent:
```typescript
setMessages(prev => [...prev, { role: 'assistant', content: '', agentName: activeAgent }]);
```

Wait — `activeAgent` won't be set yet at line 557 since the SSE hasn't started. Instead, update the agent name on the assistant message when `agent:` status arrives:
```typescript
if (parsed.status.startsWith('agent:')) {
  const agent = parsed.status.replace('agent:', '');
  setActiveAgent(agent);
  // Tag the current assistant message
  setMessages(prev => {
    const updated = [...prev];
    const lastIdx = updated.length - 1;
    if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
      updated[lastIdx] = { ...updated[lastIdx], agentName: agent };
    }
    return updated;
  });
  continue;
}
```

**Dual icon fix** (line 1004): Skip rendering last empty assistant message during loading:
```typescript
{messages.map((message, index) => {
  // Skip empty assistant placeholder when loading indicator is active
  if (isLoading && index === messages.length - 1 
      && message.role === 'assistant' && !message.content) {
    return null;
  }
  return (
    <div key={index} ...>
```

**Agent icon helper**: Add a helper function before the return statement:
```typescript
const getAgentIcon = (agentName?: string) => {
  switch (agentName) {
    case 'document_agent': return { letter: 'S', gradient: 'from-blue-500 to-blue-700' };
    case 'pssr_ora_agent': return { letter: 'F', gradient: 'from-green-500 to-green-700' };
    case 'hannah': return { letter: 'H', gradient: 'from-purple-500 to-purple-700' };
    case 'ivan': return { letter: 'I', gradient: 'from-red-500 to-red-700' };
    default: return { letter: 'B', gradient: 'from-amber-500 to-orange-600' };
  }
};
```

**Assistant avatar** (lines 1006-1009): Replace hardcoded "B" with dynamic icon:
```typescript
{message.role === 'assistant' && (() => {
  const icon = getAgentIcon(message.agentName);
  return (
    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${icon.gradient} flex items-center justify-center flex-shrink-0`}>
      <span className="text-sm font-bold text-white">{icon.letter}</span>
    </div>
  );
})()}
```

**Loading indicator** (lines 1339-1354): Replace spacer with active agent icon + dynamic status text:
```typescript
{isLoading && (() => {
  const icon = getAgentIcon(activeAgent);
  const agentLabel = activeAgent === 'document_agent' ? 'Selma' 
    : activeAgent === 'pssr_ora_agent' ? 'Fred'
    : activeAgent === 'hannah' ? 'Hannah'
    : activeAgent === 'ivan' ? 'Ivan' : 'Co-Pilot';
  return (
    <div className="flex gap-4 items-start">
      <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${icon.gradient} flex items-center justify-center flex-shrink-0`}>
        <span className="text-sm font-bold text-white">{icon.letter}</span>
      </div>
      <div className="space-y-2">
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-muted-foreground ml-1 transition-opacity duration-300">
              {agentStatus || `${agentLabel} is thinking…`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
})()}
```

**Reset** (line 707): Reset `activeAgent` alongside `agentStatus`:
```typescript
setActiveAgent('copilot');
```

### 4. Deploy and validate

Redeploy `ai-chat` edge function. Test all four scenarios from the prompt.

## Files Changed
1. `supabase/functions/ai-chat/index.ts` — 2 small edits
2. `src/components/widgets/ORSHChatDialog.tsx` — interface update, state, SSE parsing, icon helper, avatar rendering, loading indicator, dual-icon guard

