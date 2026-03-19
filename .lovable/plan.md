

# Plan: AI Agent Strategy & Training Living Document

## Overview

Create a new living document in Admin Tools — **"AI Agent Strategy & Training"** — that documents the ORSH AI agent architecture, development phases, training strategy, gaps, and a continuous improvement framework. This follows the exact same pattern as the existing living documents (Security Doc, Platform Guide, Strategic North Star).

## What Gets Built

### 1. New Component: `AIAgentStrategyDocument.tsx`

A living document component in `src/components/admin-tools/` following the established pattern (Section, InfoTable, FlowDiagram helpers, back button, breadcrumbs). Sections include:

**Architecture Overview**
- Multi-agent routing pattern (Bob CoPilot → specialist agents)
- Current agents: Document Agent, PSSR/ORA tools, general platform knowledge
- System diagram showing message flow

**Current Agent Capabilities**
- Table of all registered tools (get_document_readiness_summary, get_pssr_items, etc.)
- What each tool queries, what it returns, current limitations
- Domain knowledge embedded in system prompt

**Development Phases**
- Phase 1 (Current): Rule-based tools with SQL queries, static system prompt
- Phase 2 (Next): Contextual memory, learning from user corrections, feedback loops
- Phase 3 (Future): Predictive analytics, cross-agent collaboration, autonomous recommendations
- Phase 4 (Vision): Self-improving prompts, dynamic tool generation, multi-tenant knowledge isolation

**Gaps & Known Limitations**
- Table listing current gaps (no persistent memory, no feedback loop, no confidence scoring, no A/B testing of prompts, limited error recovery)
- Priority ranking and mitigation strategy for each

**Continuous Training Strategy**
- **Prompt Engineering Pipeline**: Version-controlled system prompts, A/B testing framework
- **Knowledge Base Expansion**: How to add new domain tables, new tools, new routing patterns
- **Feedback Collection**: User thumbs-up/down on responses, correction capture, edge case logging
- **Evaluation Framework**: Test suite of expected Q&A pairs, regression testing on prompt changes
- **Daily Training Loop**: Automated daily review of failed/low-confidence responses, prompt refinement cycle

**Training Methodology**
- How to add new specialist agents (step-by-step)
- How to expand existing agent knowledge (new tables, new business rules)
- How to tune response quality (prompt iteration, few-shot examples)
- How to measure agent performance (response accuracy, user satisfaction)

**Security & Guardrails**
- Injection protection patterns
- Identity protection rules
- Data access boundaries (RLS-aware queries)

### 2. Wire into AdminToolsPage

- Add `ai-agent-strategy` to the `activeView` union type
- Add lazy import for `AIAgentStrategyDocument`
- Add card entry in `adminTools` array with Brain icon, gradient, description
- Add view rendering block matching existing pattern

## Files Modified

1. **`src/components/admin-tools/AIAgentStrategyDocument.tsx`** — New file (~600 lines), following PlatformGuideDocument pattern
2. **`src/components/AdminToolsPage.tsx`** — Add lazy import, activeView case, card entry, and view render block

## No Database Changes

This is a purely frontend living document — no migrations needed.

