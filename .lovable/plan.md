

# AI Agents Hub — Reorganization Plan

## Overview

Reorganize the current "AI AGENTS" section in Admin Tools from a flat grid of cards into a world-class agent-centric experience with an Overview page, individual agent profiles with AI-generated avatars, self-introductions, and deep-dive management views.

## Architecture

```text
Admin Tools → AI AGENTS section
  ├── Overview (new)          — All agents map, how they interact
  ├── Bob (CoPilot)           — Profile + config
  ├── Selma (Documents)       — Profile + Analytics/Validation/Training
  ├── Fred (PSSR/ORA Safety)  — Profile + config
  ├── Hannah (P2A Handover)   — Profile + config
  ├── Ivan (Process Tech)     — Profile + config
  ├── Zain (Training)         — Profile + config (planned)
  └── Alex (CMMS)             — Profile + config (planned)
```

## What Gets Built

### 1. AI Agent Hub Page (`src/pages/admin/AIAgentHub.tsx`)
A new routed page at `/admin/ai-agents` (and sub-routes `/admin/ai-agents/:agentCode`) that serves as the central agent management experience.

**Overview tab** — renders when no agent is selected:
- Hero section with "Meet the ORSH AI Team" heading
- Agent relationship diagram showing how agents collaborate (Bob routes → specialists, Selma ↔ Hannah for docs, etc.)
- Grid of all 7 agents as avatar cards with status indicators (active/planned)
- Quick stats: total interactions, active agents, tools count

**Agent Profile view** — renders when clicking an agent card:
- Large avatar + name + role title
- Animated typewriter-style self-introduction (first-person, e.g., "Hi, I'm Selma. I'm your Document Intelligence specialist...")
- "Areas of Specialization" section with capability chips
- "What I Don't Do" section (clear boundaries)
- "I Work Closely With" section showing linked agent avatars
- Status badge (Active / Planned / In Training)
- Deep-dive tabs: Analytics, Validation, Configuration, Feedback (varies per agent)

### 2. Agent Avatars
Generate 7 AI avatars using the AI image generation skill (Nano Banana 2 — `google/gemini-3.1-flash-image-preview`). Each avatar will be a professional, 3D-rendered style portrait matching the agent's personality:
- **Bob** — Friendly, approachable male, warm tones (the helpful CoPilot)
- **Selma** — Sharp, professional female, cool tones (Document Intelligence)
- **Fred** — Serious, safety-focused male (PSSR/ORA Safety)
- **Hannah** — Organized, detail-oriented female (P2A Handover)
- **Ivan** — Technical, authoritative male (Process Technical Authority)
- **Zain** — Young, energetic male (Training Intelligence)
- **Alex** — Precise, methodical male (CMMS & Maintenance)

Avatars stored in `src/assets/agents/` and imported as ES6 modules.

### 3. Agent Data Model
Leverage existing `ai_agent_registry` table (already has `agent_code`, `display_name`, `description`, `capabilities`, `limitations`, `domain_tags`, `status`). Add a static config file `src/data/agentProfiles.ts` for UI-specific data:
- Introduction text (first-person)
- Avatar import reference
- Specialization labels
- "Works with" agent codes
- Available deep-dive tabs per agent
- Gradient/color theme per agent

### 4. Admin Tools Integration
- Replace the current 5 flat cards in the "AI AGENTS" section with a single "AI Agents Hub" entry plus individual agent shortcuts
- New items: Overview, Bob, Selma, Fred, Hannah, Ivan, Zain, Alex (8 cards in a 4-column grid)
- Each card shows the agent's avatar, name, role subtitle, and status
- Clicking navigates to `/admin/ai-agents` or `/admin/ai-agents/:code`

### 5. Selma Deep-Dive Tabs
Existing pages (`SelmaAnalytics`, `SelmaValidation`) get embedded as tabs within Selma's agent profile rather than standalone routes. The standalone routes remain for backward compatibility but redirect into the hub.

### 6. Component Structure

```text
src/pages/admin/AIAgentHub.tsx          — Main hub page with routing
src/components/admin-tools/agents/
  ├── AgentOverview.tsx                 — Overview with relationship map
  ├── AgentProfileView.tsx              — Individual agent profile
  ├── AgentCard.tsx                     — Card for grid display
  ├── AgentIntroduction.tsx             — Typewriter self-intro component
  ├── AgentRelationshipMap.tsx          — Visual agent collaboration diagram
  ├── AgentSpecializations.tsx          — Capability/limitation chips
  └── AgentDeepDiveTabs.tsx             — Tab container for analytics/config
src/data/agentProfiles.ts               — Static agent UI metadata
src/assets/agents/                      — AI-generated avatar images
```

## UX Design Principles
- **Dark glass-morphism cards** with subtle gradients per agent's color theme
- **Smooth transitions** between overview and profile views (fade + scale)
- **Status indicators**: green pulse for active, amber for in-training, gray for planned
- **Typewriter animation** for first-person introductions on profile load
- **Hover effects** on agent cards revealing quick-stats tooltip
- **Responsive**: 4-col grid on desktop, 2-col on tablet, 1-col on mobile

## Implementation Order
1. Generate 7 agent avatar images and save to `src/assets/agents/`
2. Create `src/data/agentProfiles.ts` with all agent metadata
3. Build shared components (`AgentCard`, `AgentIntroduction`, `AgentSpecializations`)
4. Build `AgentOverview.tsx` with relationship map
5. Build `AgentProfileView.tsx` with deep-dive tabs
6. Build `AIAgentHub.tsx` main page with sub-routing
7. Update `AdminToolsPage.tsx` AI AGENTS section with new card layout
8. Add route in `App.tsx`
9. Wire Selma Analytics/Validation as embedded tabs

