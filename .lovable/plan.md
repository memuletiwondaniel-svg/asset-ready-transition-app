

# Plan: Create ORSH Strategic North Star Document

## Overview
Create a new live document — **"ORSH Strategic North Star"** — accessible from Admin Tools alongside the existing Security and Platform Guide documents. This document will articulate the ORIP (Operational Readiness Intelligence Platform) vision, strategic positioning, and evolution roadmap.

## New File
**`src/components/admin-tools/StrategicNorthstarDocument.tsx`**

A scroll-based document following the exact same pattern as `EnterpriseSecurityDocument.tsx` — using the shared `Section`, `StatusTable`, TOC sidebar, and `onBack` prop conventions.

### Sections (8 total):
1. **Executive Summary** — ORSH today → ORIP tomorrow; the "quantified operational readiness" category definition
2. **60-Second Investor Pitch** — Verbatim-aligned pitch: sovereign-deployable, single system of record, weighted readiness index, startup confidence score
3. **Board-Level Strategic Brief** — Strategic context (fragmented reporting), what ORIP delivers (system of record + intelligence engine), executive impact metrics
4. **Target Market & Industry Context** — Capital-intensive industries (O&G, LNG, mining); operators like ADNOC, Aramco, QatarEnergy; cost-of-delay framing
5. **Platform Evolution Roadmap** — Visual timeline: ORSH (current) → ORIP phases — readiness scoring engine, predictive analytics, portfolio benchmarking, AI-driven risk modeling
6. **Acquisition-Positioning Narrative** — Gap analysis vs AVEVA, Hexagon, Emerson, Honeywell, Schneider; ORIP as embeddable intelligence layer; defensible vertical AI capability
7. **Technical Differentiation** — Configurable readiness ontology, weighted scoring engine, startup probability analytics, API-first integration, sovereign deployment
8. **Current Module Alignment** — StatusTable mapping each existing ORSH module (ORA, P2A, PSSR, ORM, Training, Certificates) to its ORIP strategic function

## Edits to Existing File
**`src/components/AdminToolsPage.tsx`**

- Add `'northstar-document'` to the `activeView` union type
- Add lazy import for `StrategicNorthstarDocument`
- Add dashboard card (icon: `Compass` from lucide, gradient: `from-amber-600 to-orange-700`, title: "Strategic North Star")
- Add render block for the new view

