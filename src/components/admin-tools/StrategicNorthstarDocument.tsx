import React, { useRef } from 'react';
import { ArrowLeft, Compass, Target, TrendingUp, Globe, Layers, Cpu, BarChart3, Blocks, FileText, Rocket, Building2, Shield, BrainCircuit, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import DocumentDownloadButton from './DocumentDownloadButton';

interface StrategicNorthstarDocumentProps {
  onBack: () => void;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; id: string; children: React.ReactNode }> = ({ icon, title, id, children }) => (
  <section id={id} className="scroll-mt-6">
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
    </div>
    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
      {children}
    </div>
  </section>
);

const StatusTable: React.FC<{ rows: { label: string; value: string; status: 'active' | 'configured' | 'info' | 'planned' | 'roadmap' }[] }> = ({ rows }) => (
  <div className="rounded-lg border border-border overflow-hidden">
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
            <td className="px-4 py-2.5 font-medium text-foreground">{row.label}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{row.value}</td>
            <td className="px-4 py-2.5 text-right">
              <Badge variant="outline" className={
                row.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                row.status === 'configured' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                row.status === 'planned' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                row.status === 'roadmap' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                'bg-muted text-muted-foreground'
              }>
                {row.status === 'active' ? '✅ Live' : row.status === 'configured' ? '✅ Configured' : row.status === 'planned' ? '🔶 Planned' : row.status === 'roadmap' ? '🟣 Roadmap' : 'ℹ️ Info'}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StrategicNorthstarDocument: React.FC<StrategicNorthstarDocumentProps> = ({ onBack }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const tocItems = [
    { id: 'executive-summary', label: 'Executive Summary' },
    { id: 'investor-pitch', label: '60-Second Investor Pitch' },
    { id: 'board-brief', label: 'Board-Level Strategic Brief' },
    { id: 'target-market', label: 'Target Market & Industry Context' },
    { id: 'evolution-roadmap', label: 'Platform Evolution Roadmap' },
    { id: 'ai-strategy', label: 'AI & Intelligence Strategy' },
    { id: 'acquisition-positioning', label: 'Acquisition-Positioning Narrative' },
    { id: 'technical-differentiation', label: 'Technical Differentiation' },
    { id: 'module-alignment', label: 'Current Module Alignment' },
    { id: 'march-2026-milestones', label: 'March 2026 — Key Milestones' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Strategic North Star" favoritePath="/admin-tools/northstar-document" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Compass className="h-5 w-5 text-amber-600" />
                ORSH Strategic North Star
              </h1>
              <p className="text-sm text-muted-foreground">Living document — ORSH → ORIP evolution & strategic positioning</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground/70" />
                <span className="text-xs text-muted-foreground/70">Last updated: April 2026 — Hannah removed. Agent family: Bob, Selma, Fred, Ivan, Zain, Alex.</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DocumentDownloadButton contentRef={contentRef} fileName="ORSH-Strategic-North-Star" />
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              v3.0 — March 2026
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={contentRef}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">

          {/* Executive Summary Card */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-3">The ORIP Vision</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                <strong className="text-foreground">ORSH</strong> (Operations Readiness & Start-up Hub) is today's execution platform — managing workflows, 
                action tracking, cross-discipline governance, and project-to-asset handover for capital-intensive industries.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                <strong className="text-foreground">ORIP</strong> (Operational Readiness Intelligence Platform) is where ORSH evolves — embedding a 
                <strong className="text-foreground"> quantified intelligence engine</strong> that converts execution data into a weighted Operational 
                Readiness Index, Startup Confidence Score, and predictive startup risk modeling.
              </p>
              <div className="bg-background/60 border border-border rounded-lg p-4 mt-4">
                <p className="text-sm font-semibold text-foreground text-center">
                  We are defining a new category: <span className="text-amber-600">Quantified Operational Readiness</span> — where execution control and startup intelligence converge.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Table of Contents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Table of Contents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {tocItems.map((item, i) => (
                  <a key={item.id} href={`#${item.id}`} className="text-sm text-primary hover:underline py-1 flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                    {item.label}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 1. Executive Summary */}
          <Section id="executive-summary" icon={<Target className="h-5 w-5 text-amber-600" />} title="1. Executive Summary">
            <p>
              ORSH is a multi-tenant, enterprise-grade platform for managing operational readiness workflows across oil & gas, LNG, and mining megaprojects. 
              Today it serves as a <strong className="text-foreground">system of record</strong> for OR&A schedules, deliverables, cross-discipline governance, 
              system/subsystem readiness tracking, action closeout, and multi-organization collaboration.
            </p>
            <p>
              The strategic trajectory is to evolve ORSH into <strong className="text-foreground">ORIP</strong> — an Operational Readiness 
              <em> Intelligence</em> Platform that layers quantified readiness scoring, predictive analytics, and startup risk modeling on top of 
              the existing execution engine.
            </p>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-sm space-y-2">
                <p className="font-medium text-foreground">ORIP doesn't just track readiness.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>It <strong className="text-foreground">governs</strong> it — structured workflows, approval chains, cross-discipline accountability</li>
                  <li>It <strong className="text-foreground">measures</strong> it — weighted Operational Readiness Index across all dimensions</li>
                  <li>It <strong className="text-foreground">predicts</strong> it — startup confidence scoring and risk trajectory forecasting</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 2. 60-Second Investor Pitch */}
          <Section id="investor-pitch" icon={<Rocket className="h-5 w-5 text-amber-600" />} title="2. 60-Second Investor Pitch">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 text-sm space-y-4 leading-relaxed">
                <p>
                  ORIP is a <strong className="text-foreground">sovereign-deployable</strong> Operational Readiness Execution & Intelligence Platform 
                  built for capital-intensive industries such as oil & gas, LNG, and mining.
                </p>
                <p>
                  On multi-billion-dollar projects at operators like <strong className="text-foreground">ADNOC, Saudi Aramco, and QatarEnergy</strong>, 
                  startup delays can cost <strong className="text-foreground">tens of millions per month</strong>. Yet readiness is still managed through 
                  fragmented workflows, disconnected commissioning tools, and subjective reporting.
                </p>
                <p>
                  ORIP replaces that fragmentation with a <strong className="text-foreground">single system of record</strong> for operational readiness — 
                  managing workflows, action tracking, cross-discipline governance, and project-to-asset handover.
                </p>
                <p>
                  But unlike traditional readiness tools, ORIP embeds a <strong className="text-foreground">quantified intelligence engine</strong> at its core. 
                  It converts execution data into a <strong className="text-foreground">weighted Operational Readiness Index</strong>, 
                  <strong className="text-foreground"> Startup Confidence Score</strong>, and <strong className="text-foreground">predictive startup risk modeling</strong>.
                </p>
                <div className="bg-background/60 border border-border rounded-lg p-4">
                  <p className="font-semibold text-foreground text-center">
                    In short, ORIP doesn't just track readiness.<br />
                    It <span className="text-amber-600">governs</span> it, <span className="text-amber-600">measures</span> it, and <span className="text-amber-600">predicts</span> it.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 3. Board-Level Strategic Brief */}
          <Section id="board-brief" icon={<Building2 className="h-5 w-5 text-amber-600" />} title="3. Board-Level Strategic Brief">
            <p className="font-medium text-foreground">Strategic Context</p>
            <p>
              Large capital projects generate vast execution data across engineering, commissioning, operations, and contractors. 
              However, leadership lacks a unified, auditable measure of true operational readiness.
            </p>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-foreground mb-2">What Executives Currently Receive:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Extensive but disconnected readiness reports</li>
                  <li>Conflicting discipline updates</li>
                  <li>Manual action trackers</li>
                  <li>Subjective "confidence" statements</li>
                </ul>
                <p className="mt-3 font-medium text-destructive">There is no single quantified indicator of startup readiness or capital risk exposure.</p>
              </CardContent>
            </Card>

            <p className="font-medium text-foreground mt-4">What ORIP Delivers</p>
            <StatusTable rows={[
              { label: 'System of Record', value: 'OR&A schedules, deliverables, cross-discipline workflows and approvals', status: 'active' },
              { label: 'Readiness Tracking', value: 'System and subsystem readiness tracking across all disciplines', status: 'active' },
              { label: 'Action Governance', value: 'Action tracking and closeout with full audit trail', status: 'active' },
              { label: 'Multi-Org Collaboration', value: 'Cross-organization workflows with enterprise-grade auditability', status: 'active' },
              { label: 'Readiness Index (ORI)', value: 'Dimension-based Operational Readiness Index with confidence factors and risk penalty logic', status: 'active' },
              { label: 'Startup Confidence Score', value: 'SCS = ORI × Schedule Adherence × Critical Path Stability — executive decision metric', status: 'active' },
              { label: 'Risk Penalty Engine', value: 'Severity-weighted risk deductions (Minor to Startup-blocking) — prevents inflated readiness reporting', status: 'active' },
              { label: 'Executive Dashboard', value: 'Strategic decision view with ORI/SCS banner, dimension breakdown, Top 5 blockers, predictive trends', status: 'active' },
              { label: 'Predictive Analytics', value: 'Startup probability forecasting and readiness trajectory analysis', status: 'planned' },
            ]} />

            <p className="font-medium text-foreground mt-4">Executive Impact</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Converts fragmented readiness reporting into <strong className="text-foreground">quantified decision metrics</strong></li>
              <li>Improves <strong className="text-foreground">startup predictability</strong></li>
              <li>Reduces <strong className="text-foreground">capital risk exposure</strong></li>
              <li>Enhances <strong className="text-foreground">governance transparency</strong></li>
              <li>Enables <strong className="text-foreground">cross-project benchmarking</strong></li>
            </ul>

            <Card className="border-amber-500/20 bg-amber-500/5 mt-4">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-foreground">Strategic Importance</p>
                <p>
                  Startup timing directly affects revenue realization, safety exposure, and shareholder value. 
                  ORIP elevates operational readiness from administrative coordination to a <strong className="text-foreground">measurable, 
                  predictive discipline</strong> aligned with capital risk management.
                </p>
                <p className="mt-2 font-medium text-muted-foreground italic">
                  ORIP does not replace ERP or commissioning tools. It unifies and elevates them into executive-grade startup intelligence.
                </p>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 4. Target Market */}
          <Section id="target-market" icon={<Globe className="h-5 w-5 text-amber-600" />} title="4. Target Market & Industry Context">
            <p>ORIP targets <strong className="text-foreground">capital-intensive industries</strong> where startup delays carry outsized financial and safety consequences.</p>
            
            <StatusTable rows={[
              { label: 'Oil & Gas (Upstream)', value: 'ADNOC, Saudi Aramco, QatarEnergy, CNOOC, Petrobras', status: 'info' },
              { label: 'LNG', value: 'QatarEnergy LNG, Cheniere, NextDecade, Venture Global', status: 'info' },
              { label: 'Mining & Metals', value: 'BHP, Rio Tinto, Vale, Glencore', status: 'info' },
              { label: 'Petrochemicals', value: 'SABIC, Dow, BASF, LyondellBasell', status: 'info' },
              { label: 'Power & Utilities', value: 'Nuclear new-build, large-scale renewable facilities', status: 'info' },
            ]} />

            <Card className="bg-muted/30 mt-4">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-foreground">Cost-of-Delay Framing</p>
                <p className="mt-2">
                  On a <strong className="text-foreground">$10B LNG project</strong>, a single month of startup delay can cost 
                  <strong className="text-foreground"> $30–50M+</strong> in deferred revenue, extended contractor mobilization, 
                  insurance exposure, and regulatory penalties. Yet the tools used to manage readiness — spreadsheets, disconnected 
                  commissioning databases, and manual reports — are fundamentally inadequate for the scale and complexity of these programs.
                </p>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 5. Platform Evolution Roadmap */}
          <Section id="evolution-roadmap" icon={<TrendingUp className="h-5 w-5 text-amber-600" />} title="5. Platform Evolution Roadmap">
            <p>ORSH evolves into ORIP through a phased roadmap that builds intelligence capabilities on top of the existing execution platform.</p>
            
            <div className="space-y-4 mt-4">
              {/* Phase 0: Current */}
              <Card className="border-emerald-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Current</Badge>
                    <p className="font-bold text-foreground">ORSH — Operations Readiness & Start-up Hub</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Execution platform: ORA plans, P2A handover, PSSR, certificates, ORM, training, task management, multi-tenant governance</p>
                </CardContent>
              </Card>

              {/* Phase 1 */}
              <Card className="border-emerald-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Phase 1 — Active — Advanced</Badge>
                    <p className="font-bold text-foreground">Readiness Scoring Engine (ORIP Core)</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Dimension-based Operational Readiness Index (ORI) using VCR Item Categories as configurable readiness dimensions (Design Integrity, Technical Integrity, Operating Integrity, Management Systems, Health & Safety). Full ORIP formula with confidence factors (0.7–1.0), risk penalty engine (capped at 15%), and Startup Confidence Score (SCS = ORI × Schedule Adherence × Critical Path Stability).</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-500/5 rounded p-2"><strong className="text-foreground">ORI Formula:</strong> Σ(Dimension Weight × DS_i) − Risk Penalty</div>
                    <div className="bg-emerald-500/5 rounded p-2"><strong className="text-foreground">SCS:</strong> ORI × Schedule Adherence × Critical Path Stability</div>
                    <div className="bg-emerald-500/5 rounded p-2"><strong className="text-foreground">Confidence:</strong> Verified=1.0, Self-reported=0.8, Forecasted=0.7</div>
                    <div className="bg-emerald-500/5 rounded p-2"><strong className="text-foreground">Risk Severity:</strong> Minor(0.5), Moderate(1.0), Major(2.0), Startup-blocking(3.0)</div>
                  </div>
                  <Card className="bg-amber-500/5 border-amber-500/20 mt-3">
                    <CardContent className="pt-3 pb-3 text-xs text-muted-foreground">
                      <strong className="text-foreground">Note:</strong> Document Intelligence build sequence (Phases 1-9) running in parallel with ORIP scoring engine development. Selma's document readiness data will feed directly into the Design Integrity (DI2) dimension of the ORI score.
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              {/* Phase 2 */}
              <Card className="border-amber-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Phase 2</Badge>
                    <p className="font-bold text-foreground">Predictive Analytics & Confidence Scoring</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Readiness trajectory forecasting • Monte Carlo simulation for startup probability • What-if scenario modeling • Readiness decay risk detection • Lagging discipline identification</p>
                </CardContent>
              </Card>

              {/* Phase 3 */}
              <Card className="border-blue-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Phase 3</Badge>
                    <p className="font-bold text-foreground">Portfolio Benchmarking & Cross-Project Intelligence</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Cross-project readiness benchmarking • Industry-level KPIs • Organizational maturity scoring • Portfolio risk dashboard • Capital risk heatmap</p>
                </CardContent>
              </Card>

              {/* Phase 4 */}
              <Card className="border-purple-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Phase 4</Badge>
                    <p className="font-bold text-foreground">AI-Driven Risk Modeling</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Machine learning on historical readiness data • Anomaly detection for at-risk activities • Natural language risk summaries • Autonomous alerting</p>
                </CardContent>
              </Card>
            </div>
          </Section>

          <Separator />

          {/* 6. AI & Intelligence Strategy */}
          <Section id="ai-strategy" icon={<BrainCircuit className="h-5 w-5 text-amber-600" />} title="6. AI & Intelligence Strategy">
            <p>
              ORSH embeds a <strong className="text-foreground">multi-agent AI architecture</strong> that evolves from a decision-support copilot 
              into an autonomous operational intelligence engine — a core differentiator for the ORIP vision.
            </p>
            
            <StatusTable rows={[
              { label: 'Bob CoPilot (Router)', value: 'Central AI agent running on Claude Sonnet 4.5 (Anthropic) with intent detection, user context learning, and specialist dispatch', status: 'active' },
              { label: 'Selma (Document Specialist)', value: '13-tool agent for DMS gap analysis, quality scoring, numbering config, and ORA linkage — confirmed live with excellent performance', status: 'active' },
              { label: 'Fred (Commissioning & Hardware Readiness)', value: '14-tool specialist for GoCompletions integration, ITR/punch list tracking, hardware readiness assessments', status: 'active' },
              { label: 'Ivan (Technical Authority)', value: '17-tool agent for HAZOP, STQ, MOC, override registers, cumulative risk assessment, PSSR/VCR review, Design Safety Reviews, Safe-to-Start verdict. Cross-agent aggregation from Selma, Fred, Zain.', status: 'active' },
              { label: 'Autonomous Training Loop', value: 'v5.0 — daily cron-driven feedback analysis, auto-apply prompt improvements, self-healing edge cases', status: 'active' },
              { label: 'User Context Persistence', value: 'Per-user preference learning stored in ai_user_context — personalizes responses over time', status: 'active' },
              { label: 'Zain — Training Intelligence (Phase 2)', value: 'Domain-specific agent for training plan intelligence — claude-haiku planned', status: 'planned' },
              { label: 'Alex — CMMS & Maintenance (Phase 2)', value: 'Maintenance management intelligence — claude-haiku planned', status: 'planned' },
              
              { label: 'Predictive ORI Agent', value: 'ML-driven readiness trajectory forecasting and risk anomaly detection', status: 'roadmap' },
            ]} />

            <p className="font-medium text-foreground mt-4">AI Evolution Phases</p>
            <div className="space-y-3 mt-2">
              <Card className="border-emerald-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Current</Badge>
                    <p className="font-bold text-foreground text-sm">Phase 1 — Rule-Based Specialist Agents</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Intent routing, tool-based queries, feedback collection, autonomous prompt refinement</p>
                </CardContent>
              </Card>
              <Card className="border-amber-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Phase 2</Badge>
                    <p className="font-bold text-foreground text-sm">Cross-Domain Intelligence</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Multi-agent collaboration, cross-module insights (e.g., document gaps → ORA impacts → training needs)</p>
                </CardContent>
              </Card>
              <Card className="border-purple-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Phase 3</Badge>
                    <p className="font-bold text-foreground text-sm">Predictive & Prescriptive AI</p>
                  </div>
                  <p className="text-xs text-muted-foreground">ML on historical readiness data, startup probability forecasting, autonomous alerting, natural language risk summaries</p>
                </CardContent>
              </Card>
            </div>
          </Section>

          <Separator />

          {/* 7. Acquisition-Positioning Narrative */}
          <Section id="acquisition-positioning" icon={<Layers className="h-5 w-5 text-amber-600" />} title="7. Acquisition-Positioning Narrative">
            <p>
              ORIP is architected as a modular, enterprise-grade Operational Readiness Execution & Intelligence Engine designed to 
              integrate into existing industrial ecosystems.
            </p>
            
            <p className="font-medium text-foreground mt-4">Competitive Gap Analysis</p>
            <p>
              While leading providers focus on project execution, asset lifecycle management, and commissioning tracking, 
              a structural gap remains:
            </p>
            <Card className="border-destructive/20 bg-destructive/5 mt-2">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-foreground text-center">
                  There is no standardized, quantified, governance-aligned system for operational readiness that combines 
                  execution control with predictive startup modeling.
                </p>
              </CardContent>
            </Card>

            <StatusTable rows={[
              { label: 'AVEVA', value: 'Engineering & asset lifecycle — no readiness scoring or startup intelligence', status: 'info' },
              { label: 'Hexagon AB', value: 'Asset information management — no cross-discipline readiness governance', status: 'info' },
              { label: 'Emerson Electric', value: 'DCS / automation — no operational readiness workflow engine', status: 'info' },
              { label: 'Honeywell', value: 'Process control / MES — no startup probability analytics', status: 'info' },
              { label: 'Schneider Electric', value: 'SCADA / energy management — no quantified readiness framework', status: 'info' },
            ]} />

            <p className="font-medium text-foreground mt-4">ORIP Fills That Gap</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>A configurable <strong className="text-foreground">readiness ontology framework</strong></li>
              <li>Workflow-driven <strong className="text-foreground">operational governance</strong></li>
              <li>A weighted <strong className="text-foreground">readiness scoring engine</strong></li>
              <li><strong className="text-foreground">Startup probability analytics</strong></li>
              <li>Cross-project <strong className="text-foreground">portfolio benchmarking</strong></li>
              <li><strong className="text-foreground">Sovereign and on-prem deployment</strong> readiness</li>
              <li><strong className="text-foreground">API-first</strong> integration capability</li>
            </ul>

            <Card className="bg-muted/30 mt-4">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-foreground">Strategic Value for Acquirers</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>A differentiated <strong className="text-foreground">executive-facing intelligence layer</strong></li>
                  <li>A <strong className="text-foreground">capital risk modeling</strong> enhancement</li>
                  <li>A modular engine <strong className="text-foreground">embeddable into existing digital platforms</strong></li>
                  <li>A defensible <strong className="text-foreground">vertical AI capability</strong> in startup risk management</li>
                </ul>
                <p className="mt-3 font-medium text-amber-600">
                  ORIP creates a new product category: Operational Readiness Execution & Intelligence.
                </p>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 8. Technical Differentiation */}
          <Section id="technical-differentiation" icon={<Cpu className="h-5 w-5 text-amber-600" />} title="8. Technical Differentiation">
            <p>ORIP's technical architecture is purpose-built for operational readiness intelligence in regulated, sovereign-sensitive environments.</p>
            
            <StatusTable rows={[
              { label: 'Configurable Readiness Ontology', value: 'VCR Item Categories serve as tenant-configurable readiness dimensions with custom weights, confidence factors, and risk multipliers', status: 'active' },
              { label: 'Dimension-Based Scoring Engine', value: 'ORI = Σ(Dimension Weight × DS_i) − Risk Penalty; DS_i = Completion% × Confidence Factor; Risk Penalty capped at 15%', status: 'active' },
              { label: 'Startup Confidence Score (SCS)', value: 'SCS = ORI × Schedule Adherence Index × Critical Path Stability Index — VP-level decision metric', status: 'active' },
              { label: 'Confidence Factor System', value: 'Verified/audited=1.0, Self-reported=0.8, Forecasted=0.7 — discourages inflated reporting', status: 'active' },
              { label: 'Risk Penalty Engine', value: 'Severity multipliers: Minor(0.5), Moderate(1.0), Major(2.0), Startup-blocking(3.0)', status: 'active' },
              { label: 'Executive Dashboard', value: 'Strategic decision view: ORI banner, SCS, dimension breakdown with trends, Top 5 blockers, predictive trend chart', status: 'active' },
              { label: 'Startup Probability Analytics', value: 'Monte Carlo simulation and trajectory forecasting', status: 'roadmap' },
              { label: 'API-First Integration', value: 'RESTful APIs with scoped keys, rate limiting, webhook support', status: 'active' },
              { label: 'Sovereign Deployment', value: 'Docker, Kubernetes, on-prem; Middle East regions (AWS me-south-1, me-central-1)', status: 'active' },
              { label: 'Multi-Tenant Isolation', value: 'Row-level security, tenant-stamped data, subdomain resolution', status: 'active' },
              { label: 'Enterprise Auditability', value: 'Database-triggered audit trails, retention policies, compliance reporting', status: 'active' },
              { label: 'Open-Source Stack', value: 'React, TypeScript, Vite, PostgreSQL — zero vendor lock-in', status: 'active' },
              { label: 'RLS Performance Hardening', value: '416 policies optimized with subquery pattern; permissive policy consolidation — zero advisor warnings', status: 'active' },
              { label: 'Credential Security', value: 'Leaked password protection, OTP hardened to 10min expiry, bcrypt hashing', status: 'active' },
            ]} />
          </Section>

          <Separator />

          {/* 9. Current Module Alignment */}
          <Section id="module-alignment" icon={<Blocks className="h-5 w-5 text-amber-600" />} title="9. Current Module Alignment">
            <p>
              Each existing ORSH module maps directly to a strategic function in the ORIP intelligence framework. 
              The execution layer is the foundation upon which readiness scoring and predictive analytics are built.
            </p>

            <StatusTable rows={[
              { label: 'ORA Plan', value: 'Operational Readiness Assessment — activity planning, PDCA lifecycle, schedule management → Readiness Index data source', status: 'active' },
              { label: 'P2A Handover', value: 'Project-to-Asset handover with VCRs, systems, subsystems, ITP → System readiness scoring input', status: 'active' },
              { label: 'PSSR', value: 'Pre-Startup Safety Reviews with checklists and multi-level approvals → Safety readiness dimension', status: 'active' },
              { label: 'ORM', value: 'Operations Readiness Manpower — deliverable tracking, resource planning → Resource readiness dimension', status: 'active' },
              { label: 'Training', value: 'Training plan management with cost tracking, materials, approvals → Competency readiness dimension', status: 'active' },
              { label: 'Certificates', value: 'Statement of Fitness (SoF), PAC, FAC issuance → Formal readiness gate', status: 'active' },
              { label: 'Task Manager', value: 'Unified task inbox with auto-generated tasks from all modules → Action closeout velocity metric', status: 'active' },
              { label: 'Admin Tools', value: '28+ management tools (users, roles, security, audit, config) → Governance & compliance layer', status: 'active' },
              { label: 'DMS', value: 'Document Intelligence build sequence defined — 9 phases from data model through project knowledge reading. Phase 1 (data model) ready to execute. Selma (Document AI Agent) confirmed live with 13 tools and excellent performance on document readiness analysis.', status: 'active' },
              { label: 'AI CoPilot (Bob)', value: 'Multi-agent AI running on Claude Sonnet 4.5 (Anthropic). Bob CoPilot, Selma (Document Agent), Fred (Commissioning) and Ivan (Technical Authority) all live. Autonomous training loop v5.0 active. Phase 2 agents (Zain, Alex) in build queue.', status: 'active' },
            ]} />

            <Card className="bg-amber-500/5 border-amber-500/20 mt-4">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-foreground">From Execution to Intelligence</p>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs text-center mt-2">
                  <div>ORSH Modules (Execution Data)</div>
                  <div className="text-amber-600 my-1">↓</div>
                  <div>Readiness Scoring Engine (Weighted Index)</div>
                  <div className="text-amber-600 my-1">↓</div>
                  <div>Predictive Analytics (Confidence Score)</div>
                  <div className="text-amber-600 my-1">↓</div>
                  <div>Executive Intelligence (Risk Modeling & Benchmarking)</div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 10. March 2026 Milestones */}
          <Section id="march-2026-milestones" icon={<Rocket className="h-5 w-5 text-amber-600" />} title="10. March 2026 — Key Milestones Achieved">
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="pt-4 text-sm">
                <p className="font-bold text-foreground mb-3">CLAUDE MIGRATION COMPLETE</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>All active ORSH AI agents migrated from Lovable AI Gateway to <strong className="text-foreground">Anthropic API</strong></li>
                  <li>Model: <strong className="text-foreground">claude-sonnet-4-5</strong> for Bob CoPilot, Selma (Document Intelligence), Fred (Commissioning) and Ivan (Technical Authority)</li>
                  <li>The Lovable AI Gateway dependency eliminated — full Anthropic API control</li>
                  <li><strong className="text-foreground">Selma (Document Agent) confirmed live:</strong> delivered document intelligence analysis showing 988 documents tracked, quality score 45/100, 3 prioritised action items, identified RLMU compliance gap blocking operational handover</li>
                  <li><strong className="text-foreground">Security hardening:</strong> 6 critical issues resolved, enterprise-grade security posture confirmed</li>
                  <li><strong className="text-foreground">Document Intelligence strategy formalised:</strong> 9-phase build sequence for Selma covering wizard redesign, Assai sync, autonomous MDR fetching, and project knowledge intelligence (BOD/BDEP reading via pgvector)</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          {/* Footer */}
          <Card className="bg-muted/30 mt-6">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">ORSH Strategic North Star</strong> — Living Document
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: 24 March 2026 — ORM Agent removed. Agent family confirmed: Bob, Selma, Fred, Hannah, Ivan, Zain, Alex.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default StrategicNorthstarDocument;
