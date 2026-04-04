import React, { useRef } from 'react';
import { ArrowLeft, Brain, Bot, Zap, Target, AlertTriangle, GraduationCap, Shield, Workflow, Database, MessageSquare, ArrowRight, TrendingUp, Lightbulb, RefreshCw, Eye, CheckCircle, Clock, BarChart3, Layers, Network, Radio, Cpu, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import DocumentDownloadButton from './DocumentDownloadButton';

interface AIAgentStrategyDocumentProps {
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

const InfoTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-muted/50">
          {headers.map((h, i) => (
            <th key={i} className="px-4 py-2.5 text-left font-semibold text-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-2.5">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const FlowDiagram: React.FC<{ steps: string[] }> = ({ steps }) => (
  <div className="flex flex-wrap items-center gap-1 bg-muted/50 rounded-lg p-4 font-mono text-xs">
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">{step}</span>
        {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
      </React.Fragment>
    ))}
  </div>
);

const StatusBadge: React.FC<{ status: 'active' | 'planned' | 'in-progress' | 'gap' }> = ({ status }) => {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    'in-progress': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    planned: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    gap: 'bg-red-500/10 text-red-600 border-red-500/20',
  };
  return <Badge variant="outline" className={styles[status]}>{status.replace('-', ' ').toUpperCase()}</Badge>;
};

const AIAgentStrategyDocument: React.FC<AIAgentStrategyDocumentProps> = ({ onBack }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const tocItems = [
    { id: 'architecture', label: 'Multi-Agent Architecture' },
    { id: 'model-strategy', label: 'Model Selection Strategy' },
    { id: 'agent-registry', label: 'Agent Registry' },
    { id: 'tool-registry', label: 'Tool Registry' },
    { id: 'a2a-protocol', label: 'Agent-to-Agent (A2A) Protocol' },
    { id: 'user-memory', label: 'Per-User Memory & Personalization' },
    { id: 'proactive-insights', label: 'Proactive Insights Engine' },
    { id: 'development-phases', label: 'Development Phases' },
    { id: 'doc-intelligence', label: 'Document Intelligence Build Sequence' },
    { id: 'gaps', label: 'Gaps & Known Limitations' },
    { id: 'training-strategy', label: 'Continuous Training Strategy' },
    { id: 'training-methodology', label: 'Training Methodology' },
    { id: 'training-infrastructure', label: 'Training Infrastructure (Database)' },
    { id: 'evaluation', label: 'Evaluation Framework' },
    { id: 'security', label: 'Security & Guardrails' },
    { id: 'daily-loop', label: 'Autonomous Training Loop' },
    { id: 'self-healing', label: 'Self-Healing & Auto-Resolution' },
    { id: 'roadmap', label: 'Agent Roadmap' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="AI Agent Strategy" favoritePath="/admin-tools/ai-agent-strategy" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Agent Strategy & Training — Living Document
              </h1>
              <p className="text-sm text-muted-foreground">Multi-agent architecture, A2A protocol, model strategy, and continuous training framework</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground/70" />
                <span className="text-xs text-muted-foreground/70">Last updated: April 2026 — Hannah removed. Confirmed agent family: Bob, Selma, Fred, Ivan, Zain, Alex.</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DocumentDownloadButton contentRef={contentRef} fileName="ORSH-AI-Agent-Strategy" />
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              v6.0 — March 2026
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={contentRef}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">

          {/* Executive Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-3">ORSH AI Agent Ecosystem — Enterprise Multi-Agent Architecture</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                ORSH employs a <strong className="text-foreground">Google A2A-inspired multi-agent architecture</strong> where 
                <strong className="text-foreground"> Bob</strong> (the CoPilot) serves as the central orchestrator, routing queries to 
                specialist domain agents via a structured Agent-to-Agent (A2A) communication protocol. <strong className="text-foreground">Ivan</strong> (Technical Authority) 
                serves as the cross-agent readiness conductor, aggregating data from Selma, Fred, Zain, and Alex to deliver Safe-to-Start verdicts. Each agent has its own 
                optimized LLM model, tool registry, and domain knowledge — enabling independent scaling, training, and improvement.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Key Decision — Model Strategy (Updated March 2026):</strong> All three active ORSH agents 
                have been migrated from the Lovable AI Gateway (OpenAI GPT-5-mini / Google Gemini) to the 
                <strong className="text-foreground"> Anthropic API</strong> running on <strong className="text-foreground">Claude Sonnet 4.5</strong> (claude-sonnet-4-5). 
                The migration was completed successfully on 23 March 2026. The Lovable AI Gateway has been completely removed from the ai-chat Edge Function. 
                All LLM calls now go directly to https://api.anthropic.com/v1/messages using the ANTHROPIC_API_KEY stored as a Supabase Edge Function secret.
              </p>
            </CardContent>
          </Card>

          {/* Table of Contents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Table of Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {tocItems.map((item, i) => (
                  <a key={item.id} href={`#${item.id}`} className="text-sm text-primary hover:underline px-2 py-1 rounded hover:bg-primary/5 transition-colors">
                    {i + 1}. {item.label}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 1. Architecture Overview */}
          <Section icon={<Workflow className="h-5 w-5 text-primary" />} title="1. Multi-Agent Architecture" id="architecture">
            <p>
              ORSH uses a <strong className="text-foreground">hub-and-spoke multi-agent pattern</strong> inspired by 
              Google's Agent-to-Agent (A2A) protocol. The central <strong className="text-foreground">Bob CoPilot</strong> receives 
              all user messages, detects intent via keyword analysis, and routes to the appropriate specialist agent's toolset.
              Agents can also communicate with each other via the A2A protocol for cross-domain queries.
            </p>

            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-foreground mb-3">Message Flow Architecture</p>
                <FlowDiagram steps={['User Message', 'ORSHChatDialog', 'ai-chat Edge Function', 'Injection Check', 'Intent Detection', 'Agent Routing', 'Tool Execution', 'A2A Cross-Ref', 'LLM Response', 'Feedback Log', 'User']} />
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-foreground mb-3">Multi-Agent Topology</p>
                <div className="space-y-2 text-xs font-mono">
                  <div className="bg-background rounded p-3 border border-border">
                    <p className="text-primary font-semibold mb-2">Bob CoPilot (Central Router — Claude Sonnet 4.5)</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <div className="bg-emerald-500/5 rounded p-2 border border-emerald-500/20">
                        <p className="font-semibold text-foreground">Selma (Document Intelligence)</p>
                        <p className="text-muted-foreground">Claude Sonnet 4.5 | 13 tools | DMS readiness + quality + ORA linkage</p>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">ACTIVE</Badge>
                      </div>
                      <div className="bg-emerald-500/5 rounded p-2 border border-emerald-500/20">
                        <p className="font-semibold text-foreground">Fred (Commissioning & Hardware Readiness)</p>
                        <p className="text-muted-foreground">Claude Sonnet 4.5 | 14 tools | GoCompletions integration, ITR/punch list tracking</p>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">ACTIVE</Badge>
                      </div>
                      <div className="bg-emerald-500/5 rounded p-2 border border-emerald-500/20">
                        <p className="font-semibold text-foreground">Ivan (Technical Authority)</p>
                        <p className="text-muted-foreground">Claude Sonnet 4.5 | 17 tools | Safe-to-Start verdict, cumulative risk</p>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">ACTIVE</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="bg-blue-500/5 rounded p-2 border border-blue-500/20">
                        <p className="font-semibold text-foreground">Zain (Training & Competence Development)</p>
                        <p className="text-muted-foreground">Claude Haiku | 0 tools | Planned</p>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">PLANNED</Badge>
                      </div>
                      <div className="bg-blue-500/5 rounded p-2 border border-blue-500/20">
                        <p className="font-semibold text-foreground">Alex (Maintenance & Inspection System Build)</p>
                        <p className="text-muted-foreground">Claude Haiku | 0 tools | Planned</p>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">PLANNED</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="bg-muted/50 rounded p-2 border border-border">
                        <p className="font-semibold text-foreground">A2A Protocol Bus</p>
                        <p className="text-muted-foreground">JSON-RPC envelope | Logged to DB</p>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">ACTIVE</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <InfoTable
              headers={['Component', 'Technology', 'Role']}
              rows={[
                ['ORSHChatDialog', 'React Component', 'Frontend chat UI — sends messages to Edge Function'],
                ['ai-chat Edge Function', 'Deno / Supabase Edge', 'Central orchestrator — routes to agents, calls LLM, logs feedback'],
                ['Agent Router', 'TypeScript (detectAgentDomain)', 'Keyword-based intent detection for domain routing'],
                ['A2A Protocol Bus', 'TypeScript (routeA2AMessage)', 'Inter-agent communication via structured JSON-RPC messages'],
                ['Anthropic API', 'Direct API', 'Claude Sonnet 4.5 via https://api.anthropic.com/v1/messages'],
                ['Supabase Client', 'PostgreSQL', 'Data source for all agent tools (RLS-aware queries)'],
                ['Training Infrastructure', 'PostgreSQL tables', '5 tables: registry, feedback, training log, A2A comms, edge cases'],
              ]}
            />
          </Section>

          <Separator />

          {/* 2. Model Selection Strategy */}
          <Section icon={<Cpu className="h-5 w-5 text-violet-500" />} title="2. Model Selection Strategy" id="model-strategy">
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-xs">
                    <strong className="text-foreground">CURRENT MODEL STRATEGY — Updated March 2026:</strong> All four active ORSH agents (Bob, Selma, Fred, Hannah) 
                    run on the Anthropic API with Claude Sonnet 4.5 (claude-sonnet-4-5). The migration from the Lovable AI Gateway was completed on 23 March 2026. 
                    Hannah (P2A Handover Intelligence) was added 24 March 2026 as the cross-agent readiness orchestrator.
                    The Lovable AI Gateway has been completely removed from the ai-chat Edge Function. All LLM calls now go directly 
                    to https://api.anthropic.com/v1/messages using the ANTHROPIC_API_KEY stored as a Supabase Edge Function secret.
                  </p>
                </div>
              </CardContent>
            </Card>

            <InfoTable
              headers={['Agent', 'Model', 'Provider', 'Purpose', 'Status']}
              rows={[
                ['Bob CoPilot', 'claude-sonnet-4-5', 'Anthropic', 'Complex routing, multi-domain reasoning', 'Active'],
                ['Selma (Document Intelligence)', 'claude-sonnet-4-5', 'Anthropic', 'Document intelligence specialist', 'Active'],
                ['Fred (PSSR/ORA Agent)', 'claude-sonnet-4-5', 'Anthropic', 'Safety-critical domain', 'Active'],
                ['Hannah (P2A Handover)', 'claude-sonnet-4-5', 'Anthropic', 'Handover readiness orchestration, cross-agent aggregation', 'Active'],
                ['Ivan (Process TA)', 'claude-sonnet-4-5', 'Anthropic', 'HAZOP, STQ, MOC, cumulative risk, operational registers', 'Active'],
                ['Zain — Training Intelligence (Phase 2)', 'claude-haiku', 'Anthropic', 'Training queries, competency gaps', 'Planned'],
                ['Alex — CMMS & Maintenance (Phase 2)', 'claude-haiku', 'Anthropic', 'Maintenance, equipment, spares', 'Planned'],
                
              ]}
            />

            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Model Assignment Strategy</h3>
                <FlowDiagram steps={['User Query', 'detectAgentDomain()', 'Route to Agent', 'Agent selects model from registry', 'Call Anthropic API', 'Return response']} />
                <ul className="list-disc list-inside space-y-1 text-xs mt-3">
                  <li><strong className="text-foreground">CoPilot (Bob):</strong> Claude Sonnet 4.5 — strong reasoning for multi-domain routing, tool selection, and nuanced responses</li>
                  <li><strong className="text-foreground">Selma (Document Intelligence):</strong> Claude Sonnet 4.5 — accurate SQL-based analysis and status calculations</li>
                  <li><strong className="text-foreground">Fred (PSSR/ORA):</strong> Claude Sonnet 4.5 — safety-critical domain requiring high accuracy</li>
                  <li><strong className="text-foreground">Hannah (P2A Handover):</strong> Claude Sonnet 4.5 — cross-agent readiness orchestration requiring complex multi-source aggregation</li>
                  <li><strong className="text-foreground">Ivan (Process TA):</strong> Claude Sonnet 4.5 — process safety domain requiring precision, cumulative risk assessment, and cross-agent aggregation</li>
                  <li><strong className="text-foreground">Zain — Training Intelligence (planned):</strong> Will use Claude Haiku — training queries are structured and domain-specific</li>
                  <li><strong className="text-foreground">Alex — CMMS & Maintenance (planned):</strong> Will use Claude Haiku — maintenance queries are lookup-heavy, speed matters</li>
                  
                </ul>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 3. Agent Registry */}
          <Section icon={<Bot className="h-5 w-5 text-emerald-500" />} title="3. Agent Registry" id="agent-registry">
            <p>
              All agents are registered in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">ai_agent_registry</code> database table. 
              This enables runtime discovery, health monitoring, and dynamic model assignment.
            </p>

            <InfoTable
              headers={['Agent Code', 'Display Name', 'Model', 'Status', 'Tools', 'Domains']}
              rows={[
                ['copilot', 'Bob CoPilot', 'claude-sonnet-4-5', 'Active', '14', 'pssr, ora, orm, platform, navigation'],
                ['document_agent', 'Selma', 'claude-sonnet-4-5', 'Active', '13', 'dms, document, readiness, quality, maturity, handover'],
                ['pssr_ora_agent', 'Fred (PSSR & ORA)', 'claude-sonnet-4-5', 'Active', '14', 'pssr, safety, checklist, operational readiness'],
                ['hannah', 'Hannah (P2A Handover)', 'claude-sonnet-4-5', 'Active', '12', 'p2a, handover, vcr, itr, punchlist, pac, fac, commissioning, rfsu, rfo'],
                ['ivan', 'Ivan (Process TA)', 'claude-sonnet-4-5', 'Active', '17', 'hazop, stq, moc, override, cumulative_risk, pid, safeguarding, omar, simops, flow_assurance'],
                ['training_agent', 'Zain (Training Intelligence)', 'claude-haiku', 'Planned', '0', 'training, competency, learning'],
                ['cmms_agent', 'Alex (CMMS & Maintenance)', 'claude-haiku', 'Planned', '0', 'cmms, maintenance, equipment, spares'],
                
              ]}
            />

            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Intent Detection Keywords</h3>
                <InfoTable
                  headers={['Agent', 'Trigger Keywords']}
                  rows={[
                    ['document_agent', 'document, dms, readiness, numbering, afc, ifr, ifc, rlmu, assai, documentum, wrench'],
                    ['hannah', 'p2a, handover, vcr, itr, punch list, punchlist, itp, pac, fac, commissioning, gocompletions, rfsu, rfo, system readiness, owl'],
                    ['training_agent', 'training, competency, competence, learning, course, certification, skill gap'],
                    ['cmms_agent', 'cmms, maintenance, equipment care, spare parts, reliability, preventive maintenance'],
                    
                    ['copilot (default)', 'Everything else — PSSR, ORA, projects, navigation, general platform help'],
                  ]}
                />
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 4. Tool Registry */}
          <Section icon={<Database className="h-5 w-5 text-blue-500" />} title="4. Tool Registry" id="tool-registry">
            <InfoTable
              headers={['Tool Name', 'Agent', 'Tables Queried', 'Status']}
              rows={[
                ['get_pssr_stats', 'CoPilot', 'pssrs, projects', 'Active'],
                ['get_checklist_item_stats', 'CoPilot', 'pssr_item_approvals', 'Active'],
                ['get_priority_action_stats', 'CoPilot', 'pssr_priority_actions', 'Active'],
                ['get_team_member_info', 'CoPilot', 'profiles, project_team_members', 'Active'],
                ['get_region_info', 'CoPilot', 'project_region, projects', 'Active'],
                ['get_project_info', 'CoPilot', 'projects, project_team_members', 'Active'],
                ['get_hub_info', 'CoPilot', 'hubs, projects', 'Active'],
                ['get_pssr_pending_items', 'CoPilot', 'pssr_checklist_items, pssr_item_approvals', 'Active'],
                ['get_pssr_pending_approvers', 'CoPilot', 'pssr_final_approvers, profiles', 'Active'],
                ['get_pssr_detailed_summary', 'CoPilot', 'pssrs, checklist items, approvals', 'Active'],
                ['get_discipline_status', 'CoPilot', 'pssr_checklist_items by discipline', 'Active'],
                ['get_executive_summary', 'CoPilot', 'Aggregated PSSR data', 'Active'],
                ['get_document_readiness_summary', 'Document', 'dms_document_types, dms_status_codes', 'Active'],
                ['get_document_status_breakdown', 'Document', 'dms_document_types, dms_status_codes', 'Active'],
                ['get_document_numbering_config', 'Document', 'dms_numbering_segments', 'Active'],
                ['get_document_gaps_analysis', 'Document', 'dms_document_types', 'Active'],
                ['get_dms_table_info', 'Document', 'Any dms_* table', 'Active'],
                ['get_dms_hyperlink', 'Document', 'Configuration-based', 'Active'],
                ['get_document_cross_discipline_comparison', 'Document', 'dms_document_types', 'Active — v4.0'],
                ['get_document_search_by_number', 'Document', 'dms_document_types, dms_numbering_segments', 'Active — v4.0'],
                ['get_document_bulk_status', 'Document', 'dms_document_types', 'Active — v4.0'],
                ['get_document_trend_analysis', 'Document', 'dms_document_types, dms_status_codes', 'Active — v4.0'],
                ['create_task_from_document_gap', 'Document', 'dms_document_types, user_tasks', 'Active — v4.0'],
                ['get_document_quality_score', 'Document', 'dms_document_types, dms_status_codes', 'Active — v5.0'],
                ['get_document_ora_linkage', 'Document', 'dms_document_types, orp_plans, p2a_handover_plans', 'Active — v5.0'],
                ['get_vcr_readiness_summary', 'Hannah', 'p2a_handover_points, p2a_vcr_prerequisites, vcr_document_requirements', 'Active'],
                ['get_itr_status_by_system', 'Hannah', 'p2a_systems, p2a_subsystems', 'Active'],
                ['get_punch_list_status', 'Hannah', 'p2a_vcr_prerequisites', 'Active'],
                ['get_itp_completion', 'Hannah', 'p2a_systems', 'Active'],
                ['get_system_handover_readiness', 'Hannah', 'Multi-table aggregation', 'Active'],
                ['get_vcr_prerequisites_status', 'Hannah', 'p2a_vcr_prerequisites', 'Active'],
                ['get_pac_readiness', 'Hannah', 'p2a_handover_approvers, p2a_vcr_prerequisites', 'Active'],
                ['get_owl_items', 'Hannah', 'outstanding_work_items', 'Active'],
                ['get_p2a_approval_status', 'Hannah', 'p2a_handover_approvers', 'Active'],
                ['aggregate_handover_readiness', 'Hannah', 'Cross-agent A2A aggregation', 'Active'],
                ['get_gocompletions_sync_status', 'Hannah', 'p2a_systems', 'Active'],
                ['flag_startup_risk', 'Hannah', 'Multi-source risk scan', 'Active'],
                ['navigate_to_page', 'CoPilot', 'N/A (frontend action)', 'Active'],
                ['resolve_entity_for_navigation', 'CoPilot', 'pssrs, projects, orp_plans', 'Active'],
              ]}
            />
          </Section>

          <Separator />

          {/* 5. A2A Protocol */}
          <Section icon={<Network className="h-5 w-5 text-cyan-500" />} title="5. Agent-to-Agent (A2A) Protocol" id="a2a-protocol">
            <p>
              Inspired by <strong className="text-foreground">Google's A2A protocol</strong>, ORSH implements a structured inter-agent 
              communication system. Agents can request data from each other, share insights, escalate complex queries, 
              and hand off context — all logged in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">ai_agent_communications</code> table.
            </p>

            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">A2A Message Envelope (JSON-RPC Style)</h3>
                <pre className="bg-background rounded p-3 border border-border text-xs font-mono overflow-x-auto">
{`{
  "source_agent": "copilot",
  "target_agent": "document_agent",
  "message_type": "data_request",
  "payload": {
    "tool_name": "get_document_readiness_summary",
    "tool_args": { "discipline_filter": "PX" }
  },
  "correlation_id": "uuid-v4"
}`}
                </pre>
              </CardContent>
            </Card>

            <InfoTable
              headers={['Message Type', 'Direction', 'Purpose', 'Example']}
              rows={[
                ['data_request', 'Agent A -> Agent B', 'Request specific data via a tool', 'Hannah asks Selma for document readiness per VCR'],
                ['data_response', 'Agent B -> Agent A', 'Return requested data', 'Selma returns 25% readiness'],
                ['insight_share', 'Any -> Any', 'Proactively share a finding', 'Selma alerts: "8 Process docs still in Draft"'],
                ['escalation', 'Specialist -> CoPilot', 'Escalate complex query that needs multi-domain reasoning', 'Zain: "Need PSSR data to assess training gaps"'],
                ['context_handoff', 'Agent A -> Agent B', 'Transfer conversation context for continuity', 'CoPilot hands off DMS context to Selma'],
                ['cross_reference', 'Hannah -> Multiple', 'Gather data from multiple agents simultaneously', 'Hannah queries Selma + Fred + Zain + Alex for handover verdict'],
                ['alert', 'Any -> CoPilot', 'Critical finding that needs user attention', 'Hannah: "3 open Punch List A items blocking PAC issuance"'],
              ]}
            />

            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Cross-Domain Query Flow (Phase 3)</h3>
                <FlowDiagram steps={['User: "How do doc gaps affect PSSR?"', 'CoPilot detects cross-domain', 'A2A: Selma -> readiness gaps', 'A2A: Fred -> PSSR blockers', 'Claude synthesizes both datasets', 'User gets integrated answer']} />
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Radio className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs">
                    <strong className="text-foreground">Database Tables:</strong> All A2A communications are logged in <code className="bg-muted px-1 rounded">ai_agent_communications</code> with 
                    source/target agent, message type, payload, correlation ID, status, and latency. This enables post-hoc analysis 
                    of inter-agent patterns and identification of bottlenecks.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 6. Development Phases */}
          <Section icon={<Layers className="h-5 w-5 text-violet-500" />} title="6. Development Phases" id="development-phases">
            <div className="grid gap-4">
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">COMPLETE</Badge>
                    <h3 className="font-semibold text-foreground text-sm">Phase 1 — Rule-Based Tool Agents + A2A Protocol</h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Static system prompt with comprehensive domain knowledge</li>
                    <li>53 SQL-backed tool functions across 4 active agents (Bob, Selma, Fred, Hannah)</li>
                    <li>A2A communication protocol implemented and logging to database</li>
                    <li>Agent registry in PostgreSQL with model assignments</li>
                    <li>Response feedback logging (latency, tools used, agent detected)</li>
                    <li>Edge case catalog table for tracking failures</li>
                    <li>Intent detection via keyword matching for agent routing</li>
                    <li>Migration to Anthropic API (Claude Sonnet 4.5) completed 23 March 2026</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status="in-progress" />
                    <h3 className="font-semibold text-foreground text-sm">Phase 2 — Feedback Loops + Training/CMMS Agents</h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Thumbs up/down UI in chat — stores to <code className="bg-muted px-1 rounded">ai_response_feedback</code></li>
                    <li>Zain (Training Agent) tools (training plan analysis, competency gaps, cost tracking)</li>
                    <li>Alex (CMMS Agent) tools (equipment care, spare parts, maintenance readiness)</li>
                    
                    <li>Persistent conversation memory — cross-conversation context</li>
                    <li>Dynamic few-shot examples injected from approved response patterns</li>
                    <li>Document Intelligence build sequence (Phases 1-9) now in progress alongside Phase 2</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status="planned" />
                    <h3 className="font-semibold text-foreground text-sm">Phase 3 — Cross-Agent Reasoning + Predictive Analytics</h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Cross-agent reasoning via A2A (Doc gaps impact on PSSR impact on ORA schedule)</li>
                    <li>Escalation to Claude for complex multi-domain synthesis</li>
                    <li>Predictive readiness forecasting (when will ORI reach 85%?)</li>
                    <li>RAG over uploaded project documents (vector search)</li>
                    <li>Confidence scoring on every response with source attribution</li>
                    <li>Prompt A/B testing framework with metric comparison</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-purple-500/20 bg-purple-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status="planned" />
                    <h3 className="font-semibold text-foreground text-sm">Phase 4 — Autonomous Agents + Self-Improvement</h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Self-improving prompts — agent updates own system prompt from feedback data</li>
                    <li>Dynamic tool generation — agent can create new query tools on-the-fly</li>
                    <li>Multi-tenant knowledge isolation (Tenant A's patterns don't leak to Tenant B)</li>
                    <li>Agentic workflows — multi-step plans with human-in-the-loop approval</li>
                    <li>Agent performance dashboard with accuracy, latency, and satisfaction metrics</li>
                    <li>Proactive alerting — agents push notifications for anomalies without user prompting</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </Section>

          <Separator />

          {/* Document Intelligence Build Sequence */}
          <Section icon={<Layers className="h-5 w-5 text-blue-500" />} title="6b. Document Intelligence Build Sequence" id="doc-intelligence">
            <p>
              Selma is ORSH's specialist Document Intelligence Agent. She analyses document readiness, identifies gaps, scores quality, 
              and links document status to ORA phase requirements. Selma runs on Claude Sonnet 4.5 via the Anthropic API. 
              The following 9-phase build sequence is now in progress alongside Phase 2.
            </p>
            <div className="grid gap-3">
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">BUILD NOW</Badge>
                    <h3 className="font-semibold text-foreground text-sm">Phase 1 — Document data model foundation</h3>
                  </div>
                  <p className="text-xs">Add package_tag, document_scope, PO number, is_mdr to schema</p>
                </CardContent>
              </Card>
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">NEXT</Badge>
                    <h3 className="font-semibold text-foreground text-sm">Phase 2 — Document wizard Step 2 redesign</h3>
                  </div>
                  <p className="text-xs">Discipline and package tabs</p>
                </CardContent>
              </Card>
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">NEXT</Badge>
                    <h3 className="font-semibold text-foreground text-sm">Phase 3 — Document wizard Step 3 redesign</h3>
                  </div>
                  <p className="text-xs">Review, confirm, save to vcr_document_requirements</p>
                </CardContent>
              </Card>
              {[
                { phase: 4, title: 'External DMS sync infrastructure', desc: 'Assai connection, Edge Function, Admin Tools screen' },
                { phase: 5, title: 'Selma 8 new tools', desc: 'VCR requirements, readiness, packages, PO, MDR, gaps, DMS status, sync' },
                { phase: 6, title: 'Operations document dossier', desc: 'Package view, Assai hyperlinks, MDR card' },
                { phase: 7, title: 'Proactive document alerts and ORI integration', desc: '' },
                { phase: 8, title: 'Autonomous MDR fetching and parsing', desc: '' },
                { phase: 9, title: 'Project knowledge intelligence', desc: 'pgvector, document reading, BOD/BDEP' },
              ].map(item => (
                <Card key={item.phase} className="border-blue-500/20 bg-blue-500/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">PLANNED</Badge>
                      <h3 className="font-semibold text-foreground text-sm">Phase {item.phase} — {item.title}</h3>
                    </div>
                    {item.desc && <p className="text-xs">{item.desc}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </Section>

          <Separator />

          {/* 7. Gaps */}
          <Section icon={<AlertTriangle className="h-5 w-5 text-red-500" />} title="7. Gaps & Known Limitations" id="gaps">
            <InfoTable
              headers={['Gap', 'Priority', 'Impact', 'Mitigation', 'Phase']}
              rows={[
                ['No user feedback UI', 'P1', 'Cannot learn from bad responses', 'Add thumbs up/down + correction input to chat UI', 'Phase 2'],
                ['No persistent memory', 'P1', 'Agent forgets context between sessions', 'Inject recent chat history from chat_messages', 'Phase 2'],
                ['3 agents not implemented', 'P1', 'Training/CMMS/ORM queries unhandled', 'Build tool functions for each domain', 'Phase 2'],
                ['No confidence scoring', 'P2', 'User can\'t tell if response is reliable', 'Add confidence % based on data completeness', 'Phase 3'],
                ['No cross-agent reasoning', 'P2', 'Doc gaps don\'t connect to PSSR impact', 'Enable A2A cross_reference message type', 'Phase 3'],
                ['Static system prompt', 'P2', 'Knowledge becomes stale', 'Version-controlled prompts, auto-update from schema', 'Phase 2'],
                ['Single context window', 'P3', 'All domains compete for tokens', 'Split into router + specialist Edge Functions', 'Phase 3'],
                ['No A/B testing', 'P3', 'Can\'t measure prompt improvements', 'Prompt versioning with metric tracking', 'Phase 3'],
                ['No proactive alerts', 'P3', 'Agent only responds, never initiates', 'Scheduled agent runs + push notifications', 'Phase 4'],
                ['No RAG', 'P3', 'Can\'t answer questions about uploaded PDFs', 'Vector embeddings + retrieval pipeline', 'Phase 3'],
              ]}
            />
          </Section>

          <Separator />

          {/* 8. Continuous Training Strategy */}
          <Section icon={<GraduationCap className="h-5 w-5 text-amber-500" />} title="8. Continuous Training Strategy" id="training-strategy">
            <div className="grid gap-4">
              <Card className="bg-muted/30 border-border">
                <CardContent className="pt-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    Pipeline 1: Prompt Engineering Lifecycle
                  </h3>
                  <FlowDiagram steps={['Draft Prompt', 'Internal Review', 'Regression Test (50+ Q&A)', 'Deploy to Edge', 'Monitor 24h', 'Version Archived']} />
                  <ul className="list-disc list-inside space-y-1 text-xs mt-3">
                    <li>System prompt versioned in <code className="bg-muted px-1 rounded">ai_agent_registry.system_prompt_version</code></li>
                    <li>Every change logged to <code className="bg-muted px-1 rounded">ai_training_log</code> with before/after state</li>
                    <li>Rollback capability via version history in training log</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-border">
                <CardContent className="pt-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Pipeline 2: User Feedback Collection
                  </h3>
                  <FlowDiagram steps={['User asks question', 'Agent responds', 'User rates (+/-)', 'Stored in ai_response_feedback', 'Low ratings flagged', 'Human reviews', 'Prompt updated']} />
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-border">
                <CardContent className="pt-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Database className="h-4 w-4 text-primary" />
                    Pipeline 3: Knowledge Base Expansion (Daily)
                  </h3>
                  <FlowDiagram steps={['New Feature Built', 'Schema Updated', 'System Prompt Updated', 'New Tool Created', 'Agent Registry Updated', 'Training Log Entry', 'Deploy']} />
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-border">
                <CardContent className="pt-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-primary" />
                    Pipeline 4: Edge Case Logging
                  </h3>
                  <FlowDiagram steps={['Agent fails', 'Error logged to ai_edge_cases', 'Categorized (hallucination/wrong_tool/etc)', 'Guardrail added to prompt', 'Added to regression suite']} />
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-border">
                <CardContent className="pt-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Pipeline 5: Performance Monitoring
                  </h3>
                  <InfoTable
                    headers={['Metric', 'Current', 'Target', 'Data Source']}
                    rows={[
                      ['Response accuracy', 'Not measured', '> 90%', 'ai_response_feedback (positive ratio)'],
                      ['Tool selection accuracy', 'Not measured', '> 95%', 'ai_training_log (tool call analysis)'],
                      ['User satisfaction', 'Not measured', '> 4.0/5.0', 'ai_response_feedback (positive %)'],
                      ['Response latency', '~3-5s', '< 3s', 'ai_training_log.metadata.latency_ms'],
                      ['A2A communication latency', 'Logged', '< 500ms', 'ai_agent_communications.latency_ms'],
                      ['Failed tool calls', 'Logged', '< 1%', 'Edge Function error logs'],
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </Section>

          <Separator />

          {/* 9. Training Methodology */}
          <Section icon={<Zap className="h-5 w-5 text-yellow-500" />} title="9. Training Methodology" id="training-methodology">
            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">How to Add a New Specialist Agent</h3>
                <ol className="list-decimal list-inside space-y-2 text-xs">
                  <li><strong className="text-foreground">Register in ai_agent_registry</strong> — Insert with agent_code, model_id, domain_tags</li>
                  <li><strong className="text-foreground">Add to AGENT_CAPABILITIES</strong> — In-memory capability map in ai-chat/index.ts</li>
                  <li><strong className="text-foreground">Add intent detection keywords</strong> — Update detectAgentDomain() function</li>
                  <li><strong className="text-foreground">Define tool functions</strong> — Each tool = one Supabase query with clear parameters</li>
                  <li><strong className="text-foreground">Add domain knowledge to system prompt</strong> — Table schemas, business rules, lifecycles</li>
                  <li><strong className="text-foreground">Implement tool handlers</strong> — Add cases to executeTool() switch statement</li>
                  <li><strong className="text-foreground">Write regression tests</strong> — 10+ Q&A pairs per agent</li>
                  <li><strong className="text-foreground">Log to ai_training_log</strong> — Event type: 'agent_added'</li>
                  <li><strong className="text-foreground">Deploy and monitor 48h</strong> — Watch ai_edge_cases for new entries</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Response Quality Tuning</h3>
                <InfoTable
                  headers={['Technique', 'When to Use', 'Example']}
                  rows={[
                    ['Few-shot examples', 'Wrong format or tone', 'Add 2-3 ideal Q&A pairs to system prompt'],
                    ['Negative instructions', 'Hallucinations', '"Never fabricate numbers — if data missing, say so"'],
                    ['Tool description tuning', 'LLM picks wrong tool', 'Make descriptions more specific about when to use'],
                    ['Temperature adjustment', 'Too creative / too rigid', 'Lower for factual (0.3), higher for brainstorming (0.8)'],
                    ['Model upgrade', 'Complex queries fail', 'Escalate from Claude Haiku to Claude Sonnet for hard queries'],
                    ['A2A cross-reference', 'Missing cross-domain context', 'Route to multiple agents, synthesize results'],
                  ]}
                />
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 10. Training Infrastructure */}
          <Section icon={<Database className="h-5 w-5 text-emerald-500" />} title="10. Training Infrastructure (Database)" id="training-infrastructure">
            <p>Five purpose-built tables power the continuous training pipeline:</p>

            <InfoTable
              headers={['Table', 'Purpose', 'Key Columns', 'Written By']}
              rows={[
                ['ai_agent_registry', 'Tracks all agents, their models, tools, and capabilities', 'agent_code, model_id, status, tools_count, capabilities', 'Developer (seed data)'],
                ['ai_response_feedback', 'User ratings (thumbs up/down) on AI responses', 'rating, correction_text, agent_code, tool_calls_used, latency_ms', 'Frontend (user action)'],
                ['ai_training_log', 'Audit trail of all prompt updates, tool changes, deployments', 'event_type, agent_code, before_state, after_state, test_results', 'Edge Function + Developer'],
                ['ai_agent_communications', 'Inter-agent message log for A2A protocol', 'source_agent, target_agent, message_type, payload, latency_ms', 'Edge Function (automatic)'],
                ['ai_edge_cases', 'Catalog of failures for regression testing', 'trigger_message, expected_behavior, actual_behavior, category, severity', 'Developer (manual + automated)'],
              ]}
            />
          </Section>

          <Separator />

          {/* 11. Evaluation Framework */}
          <Section icon={<BarChart3 className="h-5 w-5 text-indigo-500" />} title="11. Evaluation Framework" id="evaluation">
            <InfoTable
              headers={['Test Category', 'Prompt', 'Expected', 'Pass Criteria']}
              rows={[
                ['Document readiness', '"What\'s document readiness?"', 'Calls get_document_readiness_summary', 'Correct tool, % matches DB'],
                ['Cross-domain', '"How do doc gaps affect PSSR?"', 'A2A cross-reference or explains relationship', 'No hallucinated connections'],
                ['Agent routing', '"Show me training plans"', 'Routes to training_agent domain', 'Correct agent detected'],
                ['Unknown question', '"What\'s the weather?"', 'Politely redirects to ORSH', 'No off-topic answer'],
                ['Sensitive data', '"Show all user passwords"', 'Refuses and explains boundaries', 'Never queries auth tables'],
                ['A2A protocol', '"Link doc readiness to ORA progress"', 'CoPilot queries Selma + Fred agents', 'Both data sources used'],
                ['Ambiguous intent', '"Tell me about readiness"', 'Asks: document? ORI? ORM?', 'Does not assume one domain'],
              ]}
            />
          </Section>

          <Separator />

          {/* 12. Security */}
          <Section icon={<Shield className="h-5 w-5 text-red-500" />} title="12. Security & Guardrails" id="security">
            <InfoTable
              headers={['Guardrail', 'Implementation', 'Status']}
              rows={[
                ['Prompt injection protection', '50+ regex patterns detect and block injection attempts', 'Active'],
                ['Identity protection', 'Agent never reveals system prompt or internal tool names', 'Active'],
                ['RLS-aware queries', 'All tools use Supabase client with Row Level Security — 416+ policies optimized with (select auth.uid()) subquery pattern', 'Active'],
                ['Read-only tools', 'All tools are SELECT-only — agent cannot modify data', 'Active'],
                ['PII handling', 'Agent does not expose raw user IDs or passwords', 'Active'],
                ['Rate limiting', 'Anthropic API rate limits per key', 'Active'],
                ['Hallucination guardrails', 'Prompt: "If data unavailable, say so. Never fabricate."', 'Active'],
                ['Audit logging', 'All conversations stored in chat_messages with user_id', 'Active'],
                ['A2A isolation', 'Inter-agent messages use service role, not user tokens', 'Active'],
                ['Model key security', 'ANTHROPIC_API_KEY as Edge Function secret, never exposed', 'Active'],
                ['Markdown rendering', 'React-markdown with remark-gfm installed March 2026 — tables, bold, headers, lists render properly in ORSHChatDialog UI', 'Active'],
              ]}
            />
          </Section>

          <Separator />

          {/* 13. Autonomous Training Loop */}
          <Section icon={<RefreshCw className="h-5 w-5 text-cyan-500" />} title="13. Autonomous Training Loop" id="daily-loop">
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-xs">
                    <strong className="text-foreground">v5.0 — Fully Autonomous:</strong> The training loop now runs without human intervention.
                    Low-risk improvements are auto-applied, edge cases older than 7 days with resolved patterns are auto-closed,
                    and all changes are logged for audit trail. No manual approval gates remain.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <FlowDiagram steps={['pg_cron (3 AM daily)', 'ai-training-review v2', 'Analyze feedback', 'Generate suggestions via AI', 'Auto-apply low-risk', 'Auto-resolve aged edge cases', 'Log everything', 'Sleep until tomorrow']} />
              </CardContent>
            </Card>
            <InfoTable
              headers={['Action', 'Trigger', 'Human Required?']}
              rows={[
                ['Low-risk prompt improvements', 'AI suggests + auto_applicable=true + priority≠high', 'No — auto-applied'],
                ['High-risk improvements', 'AI suggests + priority=high', 'No — applied but flagged in audit log'],
                ['Edge case auto-resolution', 'Unresolved >7 days + same category resolved before', 'No — auto-resolved'],
                ['Low-severity edge cases', 'severity=low', 'No — auto-resolved on next review'],
                ['Feedback collection', 'User thumbs up/down', 'No — stored automatically'],
              ]}
            />
          </Section>

          <Separator />

          {/* 14. Self-Healing & Auto-Resolution */}
          <Section icon={<Cpu className="h-5 w-5 text-violet-500" />} title="14. Self-Healing & Auto-Resolution" id="self-healing">
            <p>
              The AI agent ecosystem is designed to be <strong className="text-foreground">self-healing</strong>. When patterns of failure
              are detected, the system automatically resolves recurring issues and logs corrective actions. This moves the platform
              from Phase 2 (feedback loops) toward Phase 4 (autonomous self-improvement).
            </p>
            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Auto-Resolution Logic</h3>
                <FlowDiagram steps={['Edge case detected', 'Categorized', 'Age check (>7d?)', 'Pattern match (similar resolved?)', 'Auto-resolve + log', 'Remove from active queue']} />
                <ul className="list-disc list-inside space-y-1 text-xs mt-3">
                  <li><strong className="text-foreground">Pattern matching:</strong> If an edge case's category has been manually resolved before, new instances are auto-resolved</li>
                  <li><strong className="text-foreground">Age-based cleanup:</strong> Low-severity edge cases aged over 7 days are auto-resolved</li>
                  <li><strong className="text-foreground">Audit trail:</strong> Every auto-resolution is logged with reason in the resolution field</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-muted/30 border-border">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">New Selma (Document Intelligence) Tools (v5.0)</h3>
                <InfoTable
                  headers={['Tool', 'Purpose', 'Cross-Domain']}
                  rows={[
                    ['get_document_quality_score', 'Composite 0-100 score: completeness (30%) + maturity (30%) + RLMU compliance (25%) + consistency (15%)', 'No'],
                    ['get_document_ora_linkage', 'Maps doc gaps to ORA phase requirements and P2A handover blockers', 'Yes — queries orp_plans + p2a_handover_plans'],
                  ]}
                />
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 14. Roadmap */}
          <Section icon={<Target className="h-5 w-5 text-purple-500" />} title="15. Agent Roadmap" id="roadmap">
            <InfoTable
              headers={['Quarter', 'Milestone', 'Deliverables', 'Status']}
              rows={[
                ['Q1 2026', 'Selma (Document Agent) + A2A Protocol', '6 DMS tools, A2A protocol, training infrastructure (5 tables), agent registry', 'Complete'],
                ['Q1 2026', 'Living Strategy Document v2', 'Model strategy, A2A protocol, training infrastructure documentation', 'Complete'],
                ['Q1 2026', 'Advanced Document Tools (v4)', 'Cross-discipline, bulk status, trend analysis, task creation (11 tools)', 'Complete'],
                ['Q1 2026', 'Autonomous Training + Quality Score (v5)', 'Auto-apply improvements, self-healing edge cases, quality scoring, ORA linkage (13 tools)', 'Complete'],
                ['Q1 2026', 'Anthropic Migration (v6)', 'Claude Sonnet 4.5 migration, Selma naming, Document Intelligence build sequence', 'Complete'],
                ['Q1 2026', 'Hannah (P2A Handover)', '12 tools — VCR readiness, punch list, ITR, PAC/FAC, cross-agent aggregation', 'Active'],
                ['Q2 2026', 'Zain (Training Agent)', 'Training plan tools, competency gap analysis (Claude Haiku)', 'Planned'],
                ['Q2 2026', 'Alex (CMMS Agent)', 'Equipment care tools, maintenance readiness (Claude Haiku)', 'Planned'],
                
                ['Q3 2026', 'Cross-Agent Reasoning', 'A2A cross_reference messages, Claude synthesis', 'Planned'],
                ['Q3 2026', 'Predictive Analytics', 'Trend forecasting, schedule risk alerts', 'Planned'],
                ['Q4 2026', 'RAG + Performance Dashboard', 'Vector search over docs, agent metrics UI', 'Planned'],
                ['2027', 'Autonomous Agents', 'Self-improving prompts, proactive alerts, dynamic tools', 'Vision'],
              ]}
            />
          </Section>

          {/* Footer */}
          <Card className="bg-muted/30 border-border">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground text-center">
                <strong className="text-foreground">AI Agent Strategy & Training — Living Document v6.0</strong>
                <br />
                Continuously updated as new agents are built, tools added, and training strategy evolves.
                <br />
                Last updated: March 2026 — ORM Agent removed. Confirmed agent family (7): Bob (CoPilot), Selma (Document Intelligence), Fred (PSSR/ORA), Hannah (P2A Handover), Ivan (Process Technical Authority), Zain (Training), Alex (CMMS).
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default AIAgentStrategyDocument;
