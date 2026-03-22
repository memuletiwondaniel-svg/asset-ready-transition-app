import React, { useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, Users, MapPin, BookOpen, CheckCircle, Clock, Star, Shield, Wrench, ClipboardList, FolderOpen, LayoutTemplate, FileText, Layers, AlertTriangle, UserCheck, Eye, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import DocumentDownloadButton from './DocumentDownloadButton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CustomerJourneyMapsProps {
  onBack: () => void;
}

interface RolePersona {
  roleKey: string;
  title: string;
  description: string;
  goals: string[];
  painPoints: string[];
  icon: React.ReactNode;
  gradient: string;
  journeyPhases: JourneyPhase[];
}

interface JourneyPhase {
  phase: string;
  actions: string[];
  touchpoints: string[];
  emotion: 'positive' | 'neutral' | 'frustrated';
  outcome: string;
}

const PhaseCard: React.FC<{ phase: JourneyPhase; index: number; total: number }> = ({ phase, index, total }) => {
  const emotionConfig = {
    positive: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: '😊 Confident' },
    neutral: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: '😐 Focused' },
    frustrated: { color: 'text-red-500', bg: 'bg-red-500/10', label: '😤 Challenged' },
  };
  const emotion = emotionConfig[phase.emotion];

  return (
    <div className="relative flex-1 min-w-[200px]">
      <div className="border border-border rounded-lg p-3 bg-card h-full">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-[10px] font-mono">{index + 1}/{total}</Badge>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${emotion.bg} ${emotion.color}`}>{emotion.label}</span>
        </div>
        <h4 className="font-semibold text-sm text-foreground mb-2">{phase.phase}</h4>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Actions</p>
            <ul className="space-y-0.5">
              {phase.actions.map((a, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Touchpoints</p>
            <div className="flex flex-wrap gap-1">
              {phase.touchpoints.map((t, i) => (
                <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
          <div className="pt-1 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground"><strong className="text-foreground">Outcome:</strong> {phase.outcome}</p>
          </div>
        </div>
      </div>
      {index < total - 1 && (
        <div className="hidden lg:flex absolute right-[-14px] top-1/2 -translate-y-1/2 z-10">
          <ArrowRight className="h-5 w-5 text-primary/40" />
        </div>
      )}
    </div>
  );
};

const CustomerJourneyMaps: React.FC<CustomerJourneyMapsProps> = ({ onBack }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  // Fetch real users grouped by role
  const { data: roleUsers = {} } = useQuery({
    queryKey: ['journey-map-role-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles' as any)
        .select('user_id, full_name, first_name, last_name, avatar_url, position, role')
        .eq('is_active', true)
        .eq('account_status', 'active')
        .limit(500);

      const grouped: Record<string, Array<{ name: string; avatar: string | null; position: string }>> = {};
      for (const u of data || []) {
        const pos = ((u as any).position || '').toLowerCase();
        let roleKey = 'viewer';
        if (pos.includes('director') || pos.includes('dep. plant')) roleKey = 'director';
        else if (pos.includes('ops manager') || pos.includes('operations manager')) roleKey = 'ops_manager';
        else if (pos.includes('hub lead') || pos.includes('project hub')) roleKey = 'hub_lead';
        else if (pos.includes('snr ora') || pos.includes('senior ora') || pos.includes('sr. ora') || pos.includes('sr ora')) roleKey = 'sr_ora_engineer';
        else if (pos.includes('ora') && (pos.includes('lead') || pos.includes('coach'))) roleKey = 'ora_lead';
        else if (pos.includes('team lead') || pos.includes('ops team lead')) roleKey = 'team_lead';
        else if (pos.includes('admin') || pos.includes('administrator')) roleKey = 'admin';
        else if (pos.includes('engineer') || pos.includes('technician')) roleKey = 'engineer';

        if (!grouped[roleKey]) grouped[roleKey] = [];
        grouped[roleKey].push({
          name: (u as any).full_name || `${(u as any).first_name || ''} ${(u as any).last_name || ''}`.trim() || 'Unknown',
          avatar: (u as any).avatar_url,
          position: (u as any).position || '',
        });
      }
      return grouped;
    },
    staleTime: 300_000,
  });

  const rolePersonas: RolePersona[] = useMemo(() => [
    {
      roleKey: 'director',
      title: 'Director / Deputy Plant Director',
      description: 'Executive decision-maker overseeing operational readiness across the entire asset. Needs high-level visibility into project health, risk, and startup confidence.',
      goals: ['Ensure timely startup', 'Monitor ORI/SCS scores', 'Final approval authority', 'Risk oversight'],
      painPoints: ['Lack of real-time visibility', 'Too many reports to read', 'Delayed escalation of blockers'],
      icon: <Shield className="h-5 w-5" />,
      gradient: 'from-violet-500 to-purple-600',
      journeyPhases: [
        { phase: 'Dashboard Review', actions: ['Open ORSH landing page', 'Review favorited projects', 'Check ORI scores'], touchpoints: ['Landing Page', 'Project Cards', 'ORI Widget'], emotion: 'positive', outcome: 'Instant visibility into portfolio readiness' },
        { phase: 'AI-Assisted Insights', actions: ['Ask Bob CoPilot for project summary', 'Get document readiness score', 'Review AI-flagged blockers'], touchpoints: ['AI Chat', 'ORI Dashboard', 'Notifications'], emotion: 'positive', outcome: 'Data-driven decisions without manual report digging' },
        { phase: 'Director SoF View', actions: ['View My Tasks (Director view)', 'Review pending approvals', 'Check SoF status'], touchpoints: ['My Tasks Page', 'Director SoF View'], emotion: 'neutral', outcome: 'Understand approval backlog' },
        { phase: 'Approval Decisions', actions: ['Review P2A plans', 'Approve/reject ORA plans', 'Sign-off certificates'], touchpoints: ['Task Detail Sheet', 'Approval Controls'], emotion: 'positive', outcome: 'Plans unblocked and progressing' },
        { phase: 'Escalation Review', actions: ['Identify at-risk projects', 'Review overdue activities', 'Engage with hub leads'], touchpoints: ['Project Overview', 'Gantt Chart', 'Comments'], emotion: 'frustrated', outcome: 'Blockers identified and action taken' },
      ],
    },
    {
      roleKey: 'ops_manager',
      title: 'Operations Manager',
      description: 'Manages day-to-day operations readiness execution. Bridges project teams and asset operations. Ensures all modules progress towards startup.',
      goals: ['Track cross-module progress', 'Coordinate between teams', 'Ensure PSSR completion', 'Monitor training readiness'],
      painPoints: ['Cross-module coordination', 'Chasing status updates', 'Manual progress aggregation'],
      icon: <Users className="h-5 w-5" />,
      gradient: 'from-blue-500 to-indigo-600',
      journeyPhases: [
        { phase: 'Morning Dashboard', actions: ['Check My Tasks inbox', 'Review overnight updates', 'Scan project dashboards'], touchpoints: ['My Tasks', 'Landing Page', 'Project Overview'], emotion: 'neutral', outcome: 'Daily priorities identified' },
        { phase: 'PSSR Management', actions: ['Review submitted PSSRs', 'Assign checklists', 'Track item completion'], touchpoints: ['PSSR Workflow', 'Checklist Response', 'Key Activities'], emotion: 'neutral', outcome: 'PSSRs progressing toward approval' },
        { phase: 'P2A Oversight', actions: ['Monitor VCR progress', 'Review delivering party status', 'Check handover phases'], touchpoints: ['VCR Detail Overlay', 'P2A Dashboard'], emotion: 'positive', outcome: 'Handover blockers identified early' },
        { phase: 'Reporting', actions: ['Export data for meetings', 'Share ORI trends', 'Escalate risks upward'], touchpoints: ['Data Export', 'ORI Scores', 'Project Cards'], emotion: 'neutral', outcome: 'Stakeholders informed with data' },
      ],
    },
    {
      roleKey: 'hub_lead',
      title: 'Project Hub Lead',
      description: 'Leads a hub of projects and is a key approver in ORA and P2A workflows. Ensures consistency and quality across the hub.',
      goals: ['Approve ORA plans', 'Review P2A submissions', 'Ensure standard adherence', 'Hub-level reporting'],
      painPoints: ['Volume of approvals', 'Inconsistent plan quality', 'Tracking multiple project timelines'],
      icon: <FolderOpen className="h-5 w-5" />,
      gradient: 'from-teal-500 to-cyan-600',
      journeyPhases: [
        { phase: 'Approval Queue', actions: ['Open My Tasks', 'Filter review tasks', 'Prioritize by due date'], touchpoints: ['My Tasks Kanban', 'Task Filters'], emotion: 'neutral', outcome: 'Approval backlog managed' },
        { phase: 'ORA Plan Review', actions: ['Open ORA wizard in review mode', 'Review activities & schedule', 'Approve or request changes'], touchpoints: ['ORA Wizard', 'Gantt Chart', 'Review Controls'], emotion: 'positive', outcome: 'ORA plan approved or returned' },
        { phase: 'P2A Review', actions: ['Review P2A plan submission', 'Check VCR assignments', 'Verify handover phases'], touchpoints: ['P2A Wizard', 'VCR Cards', 'Approval Task'], emotion: 'neutral', outcome: 'P2A plan progresses to next approval tier' },
        { phase: 'Hub Coordination', actions: ['Compare hub project progress', 'Identify lagging projects', 'Support team leads'], touchpoints: ['Project List', 'ORI Dashboard'], emotion: 'positive', outcome: 'Hub performance optimized' },
      ],
    },
    {
      roleKey: 'ora_lead',
      title: 'ORA Lead / ORA Coach',
      description: 'Subject matter expert guiding teams through ORA methodology. Approves ORA plans and provides coaching on best practices.',
      goals: ['Ensure ORA compliance', 'Coach project teams', 'Approve activity plans', 'Monitor activity execution'],
      painPoints: ['Teams unfamiliar with ORA', 'Incomplete plans submitted', 'Tracking coaching sessions'],
      icon: <LayoutTemplate className="h-5 w-5" />,
      gradient: 'from-amber-500 to-orange-600',
      journeyPhases: [
        { phase: 'Plan Reviews', actions: ['Review ORA plan submissions', 'Check activity completeness', 'Evaluate scheduling'], touchpoints: ['My Tasks', 'ORA Wizard Review', 'Gantt Chart'], emotion: 'neutral', outcome: 'Plans meet ORA standards' },
        { phase: 'Coaching Sessions', actions: ['Open project ORA overview', 'Identify gaps in activities', 'Guide Sr. ORA Engineer'], touchpoints: ['Project Overview', 'ORA Activities Card'], emotion: 'positive', outcome: 'Team capabilities improved' },
        { phase: 'Approval Decision', actions: ['Approve or reject ORA plan', 'Add review comments', 'Monitor changes after rejection'], touchpoints: ['Review Controls', 'Comments', 'Activity Log'], emotion: 'positive', outcome: 'Quality-assured ORA plans' },
      ],
    },
    {
      roleKey: 'sr_ora_engineer',
      title: 'Senior ORA Engineer',
      description: 'Primary executor of ORA activities. Creates ORA plans, manages P2A handover, executes daily activities tracked through the task manager.',
      goals: ['Create & execute ORA plans', 'Complete assigned activities', 'Manage P2A handover', 'Maintain schedule compliance'],
      painPoints: ['Volume of activities', 'Complex scheduling', 'Multiple system dependencies', 'Documentation burden'],
      icon: <Wrench className="h-5 w-5" />,
      gradient: 'from-emerald-500 to-green-600',
      journeyPhases: [
        { phase: 'Task Management', actions: ['Open My Tasks', 'View Kanban board', 'Prioritize by smart priority'], touchpoints: ['My Tasks Page', 'Kanban Board', 'Task Cards'], emotion: 'neutral', outcome: 'Daily work plan clear' },
        { phase: 'ORA Plan Creation', actions: ['Open ORA wizard from task CTA', 'Select phase & project type', 'Choose activities from catalog', 'Schedule on Gantt chart'], touchpoints: ['ORA Wizard Steps 1-6', 'Activity Catalog', 'Gantt Chart'], emotion: 'neutral', outcome: 'ORA plan submitted for approval' },
        { phase: 'Activity Execution', actions: ['Open activity task', 'Update progress & status', 'Add comments & evidence', 'Mark as completed'], touchpoints: ['Task Detail Sheet', 'ORA Activity Sheet', 'Gantt Chart'], emotion: 'positive', outcome: 'Activities completed on schedule' },
        { phase: 'P2A Handover', actions: ['Create P2A plan from task', 'Define systems & VCRs', 'Assign handover phases', 'Submit for approval'], touchpoints: ['P2A Wizard', 'VCR Creation', 'System Assignment'], emotion: 'frustrated', outcome: 'P2A plan submitted and tracked' },
        { phase: 'AI CoPilot Assistance', actions: ['Ask Bob about document gaps', 'Get quality scores for DMS', 'Check ORA linkage for documents', 'Get numbering config help'], touchpoints: ['AI Chat', 'Document Specialist', 'DMS Config'], emotion: 'positive', outcome: 'AI-guided document readiness and gap closure' },
        { phase: 'Training Coordination', actions: ['Create training plan', 'Schedule training items', 'Track PO status', 'Upload evidence'], touchpoints: ['Training Module', 'Training Items', 'Evidence Upload'], emotion: 'neutral', outcome: 'Training requirements fulfilled' },
      ],
    },
    {
      roleKey: 'team_lead',
      title: 'Operations Team Lead',
      description: 'Frontline supervisor managing operational teams. Participates in PSSRs, reviews VCR prerequisites, and ensures team readiness.',
      goals: ['Complete PSSR walkdowns', 'Review VCR items', 'Ensure team trained', 'Support handover activities'],
      painPoints: ['Multiple PSSRs simultaneously', 'Unfamiliar with digital tools', 'Time pressure from operations'],
      icon: <ClipboardList className="h-5 w-5" />,
      gradient: 'from-rose-500 to-pink-600',
      journeyPhases: [
        { phase: 'Task Inbox', actions: ['Check My Tasks for pending items', 'Review VCR checklist bundles', 'Identify PSSR walkthroughs'], touchpoints: ['My Tasks', 'Task Cards', 'Notifications'], emotion: 'neutral', outcome: 'Pending actions visible' },
        { phase: 'PSSR Participation', actions: ['Join PSSR walkdown', 'Complete checklist responses', 'Add comments and findings'], touchpoints: ['PSSR Checklist', 'Response Forms', 'Photo Upload'], emotion: 'neutral', outcome: 'PSSR items addressed' },
        { phase: 'VCR Delivery', actions: ['Review assigned prerequisites', 'Update delivery status', 'Upload supporting evidence'], touchpoints: ['VCR Detail Overlay', 'Prerequisite Cards', 'File Upload'], emotion: 'frustrated', outcome: 'VCR prerequisites fulfilled' },
      ],
    },
    {
      roleKey: 'admin',
      title: 'Platform Administrator',
      description: 'Manages platform configuration, user access, roles, security policies, and system health. Ensures the platform operates securely and efficiently.',
      goals: ['Manage user lifecycle', 'Configure roles & permissions', 'Monitor security', 'Maintain system health'],
      painPoints: ['User onboarding volume', 'Permission audit complexity', 'Incident response pressure'],
      icon: <Shield className="h-5 w-5" />,
      gradient: 'from-slate-500 to-zinc-600',
      journeyPhases: [
        { phase: 'User Management', actions: ['Approve pending accounts', 'Assign roles and hubs', 'Bulk upload users'], touchpoints: ['User Management', 'Bulk Upload', 'Role Assignment'], emotion: 'neutral', outcome: 'Users onboarded correctly' },
        { phase: 'Security Monitoring', actions: ['Review audit logs', 'Check session configs', 'Monitor API key usage'], touchpoints: ['Audit Logs', 'Session Timeout', 'API Key Management'], emotion: 'neutral', outcome: 'Security posture maintained' },
        { phase: 'Configuration', actions: ['Manage roles & permissions', 'Configure feature flags', 'Set up SSO providers'], touchpoints: ['Role Permissions', 'Feature Flags', 'SSO Config'], emotion: 'positive', outcome: 'Platform configured for needs' },
        { phase: 'AI & DMS Management', actions: ['Review AI Agent Strategy doc', 'Configure DMS metadata (9 tabs)', 'Monitor AI training feedback', 'Review document numbering'], touchpoints: ['AI Strategy Doc', 'DMS Config', 'Admin Tools'], emotion: 'positive', outcome: 'AI and document systems properly configured' },
        { phase: 'Incident Response', actions: ['Follow incident runbook', 'Execute containment', 'Generate post-mortem'], touchpoints: ['Incident Runbook', 'Disaster Recovery', 'Deployment Log'], emotion: 'frustrated', outcome: 'Incidents resolved and documented' },
      ],
    },
    {
      roleKey: 'engineer',
      title: 'Engineer / Technician',
      description: 'Technical contributor who participates in specific activities, provides expertise for PSSRs, and delivers on assigned VCR prerequisites.',
      goals: ['Complete assigned tasks', 'Provide technical input', 'Support PSSR reviews', 'Deliver evidence on time'],
      painPoints: ['Unclear task requirements', 'Multiple project assignments', 'Limited platform familiarity'],
      icon: <Wrench className="h-5 w-5" />,
      gradient: 'from-sky-500 to-blue-600',
      journeyPhases: [
        { phase: 'Task Review', actions: ['Open My Tasks', 'Read task descriptions', 'Understand required deliverables'], touchpoints: ['My Tasks', 'Task Detail Sheet'], emotion: 'neutral', outcome: 'Work scope understood' },
        { phase: 'Execution', actions: ['Complete technical activities', 'Update progress percentage', 'Upload evidence documents'], touchpoints: ['Activity Sheet', 'File Upload', 'Progress Slider'], emotion: 'positive', outcome: 'Activities completed with evidence' },
        { phase: 'PSSR Support', actions: ['Join PSSR as technical expert', 'Respond to checklist items', 'Flag safety concerns'], touchpoints: ['PSSR Checklist', 'Response Forms', 'Comments'], emotion: 'neutral', outcome: 'Technical expertise applied to safety reviews' },
      ],
    },
  ], []);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Customer Journey Maps" favoritePath="/admin-tools/journey-maps" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Customer Journey Maps — ORSH Personas
              </h1>
              <p className="text-sm text-muted-foreground">Role-based journey maps with real user personas from the platform</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground/70" />
                <span className="text-xs text-muted-foreground/70">Last updated: 22 March 2026</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DocumentDownloadButton contentRef={contentRef} fileName="ORSH-Customer-Journey-Maps" />
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {rolePersonas.length} Personas
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-10">

          {/* Executive Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-3">About These Journey Maps</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                These Customer Journey Maps document how each role interacts with the <strong className="text-foreground">Operations Readiness & Start-up Hub (ORSH)</strong> platform.
                Each persona includes real users from the system, their goals, pain points, and a step-by-step journey through their primary workflows.
                Use these maps to understand user experience, identify improvement areas, and guide training programs.
              </p>
            </CardContent>
          </Card>

          {/* Journey Maps */}
          {rolePersonas.map((persona, idx) => {
            const users = roleUsers[persona.roleKey] || [];
            const displayUsers = users.slice(0, 5);

            return (
              <React.Fragment key={persona.roleKey}>
                {idx > 0 && <Separator />}
                <section id={`journey-${persona.roleKey}`} className="scroll-mt-6">
                  {/* Persona Header */}
                  <Card className="mb-4">
                    <CardContent className="pt-5">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Persona Identity */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${persona.gradient} text-white shrink-0`}>
                            {persona.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-foreground">{persona.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{persona.description}</p>
                          </div>
                        </div>

                        {/* Real Users */}
                        {displayUsers.length > 0 && (
                          <div className="md:w-64 shrink-0 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                              Real Users ({users.length})
                            </p>
                            <div className="space-y-1.5">
                              {displayUsers.map((u, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={u.avatar || undefined} />
                                    <AvatarFallback className="text-[9px] bg-muted">{getInitials(u.name)}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{u.position}</p>
                                  </div>
                                </div>
                              ))}
                              {users.length > 5 && (
                                <p className="text-[10px] text-muted-foreground">+{users.length - 5} more</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Goals & Pain Points */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mb-1.5 flex items-center gap-1">
                            <Star className="h-3 w-3" /> Goals
                          </p>
                          <ul className="space-y-0.5">
                            {persona.goals.map((g, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                <CheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" /> {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600 mb-1.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Pain Points
                          </p>
                          <ul className="space-y-0.5">
                            {persona.painPoints.map((p, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" /> {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Journey Phases */}
                  <div className="flex flex-col lg:flex-row gap-3 overflow-x-auto pb-2">
                    {persona.journeyPhases.map((phase, i) => (
                      <PhaseCard key={i} phase={phase} index={i} total={persona.journeyPhases.length} />
                    ))}
                  </div>
                </section>
              </React.Fragment>
            );
          })}

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground py-6 border-t border-border">
            <p>This is a living document maintained within the ORSH platform.</p>
            <p>User personas are populated with real platform data and updated in real-time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerJourneyMaps;
