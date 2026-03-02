import React from 'react';
import { ArrowLeft, BookOpen, Workflow, Database, Users, FolderOpen, ClipboardList, Shield, Layers, Code, Table, GitBranch, CheckCircle, FileText, Boxes, ArrowRight, Wrench, Container } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

interface PlatformGuideDocumentProps {
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

const PlatformGuideDocument: React.FC<PlatformGuideDocumentProps> = ({ onBack }) => {
  const tocItems = [
    { id: 'overview', label: 'Platform Overview' },
    { id: 'project-lifecycle', label: 'Project Lifecycle & Workflows' },
    { id: 'ora-plan', label: 'ORA Plan Workflow' },
    { id: 'p2a-handover', label: 'P2A Handover Plan & VCRs' },
    { id: 'pssr', label: 'PSSR Workflow' },
    { id: 'certificates', label: 'Certificates (SoF, PAC, FAC)' },
    { id: 'orm', label: 'ORM (Operations Readiness Manpower)' },
    { id: 'training', label: 'Training Management' },
    { id: 'coding-conventions', label: 'Coding Conventions & ID Formats' },
    { id: 'roles', label: 'Roles & Permissions Configuration' },
    { id: 'database-schema', label: 'Database Schema & Tables' },
    { id: 'enums', label: 'Status Enums & State Machines' },
    { id: 'task-automation', label: 'Task Automation & Triggers' },
    { id: 'integrations', label: 'External Integrations' },
    { id: 'admin-tools', label: 'Admin Tools Reference' },
    { id: 'deployment-portability', label: 'Deployment Architecture & Portability' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Platform Guide" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                ORSH Platform Guide — How It Works
              </h1>
              <p className="text-sm text-muted-foreground">Living document — covers all workflows, codes, tables, roles, and automations</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            v1.0 — March 2026
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">

          {/* Executive Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-3">What is ORSH?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The <strong className="text-foreground">Operations Readiness & Start-up Hub (ORSH)</strong> is a multi-tenant enterprise platform for managing the entire lifecycle of capital project handover from 
                <strong className="text-foreground"> Project</strong> to <strong className="text-foreground">Asset (Operations)</strong>. It orchestrates ORA Planning, P2A Handovers (VCRs), Pre-Startup Safety Reviews (PSSRs), 
                Certificates (SoF, PAC, FAC), Operations Readiness Manpower (ORM), and Training — all with role-based access control, automated tasking, and comprehensive audit trails.
              </p>
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

          {/* 1. Platform Overview */}
          <Section id="overview" icon={<Layers className="h-5 w-5 text-primary" />} title="1. Platform Overview">
            <p className="font-medium text-foreground">Core Modules</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Project Management', desc: 'Create and manage capital projects with unique codes (e.g., DP-300)' },
                { name: 'ORA Plan', desc: 'Operations Readiness Assessment — activity planning via PDCA workflow' },
                { name: 'P2A Handover', desc: 'Project-to-Asset handover plans with VCRs, systems, and subsystems' },
                { name: 'PSSR', desc: 'Pre-Startup Safety Reviews with checklists, approvals, and SoF generation' },
                { name: 'ORM', desc: 'Operations Readiness Manpower — deliverable tracking and resource planning' },
                { name: 'Training', desc: 'Training plan management with cost tracking, materials, and approvals' },
                { name: 'Task Manager', desc: 'Unified task inbox with auto-generated tasks from all modules' },
                { name: 'Admin Tools', desc: 'User management, roles, security, audit, and platform configuration' },
              ].map(m => (
                <Card key={m.name} className="bg-muted/30">
                  <CardContent className="pt-3 pb-3">
                    <p className="font-medium text-foreground text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="font-medium text-foreground mt-4">Technology Stack</p>
            <InfoTable headers={['Layer', 'Technology']} rows={[
              ['Frontend', 'React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui'],
              ['State Management', 'TanStack React Query (server state) + React Context (auth, tenant, language)'],
              ['Backend', 'Supabase (PostgreSQL + Auth + Edge Functions + Storage + Realtime)'],
              ['Authentication', 'Supabase Auth (email/password, SAML SSO, OIDC)'],
              ['Hosting', 'Lovable Platform (preview + production environments)'],
              ['Internationalization', 'i18next (English + Arabic RTL support)'],
            ]} />
          </Section>

          <Separator />

          {/* 2. Project Lifecycle */}
          <Section id="project-lifecycle" icon={<FolderOpen className="h-5 w-5 text-primary" />} title="2. Project Lifecycle & Workflows">
            <p className="font-medium text-foreground">End-to-End Project Flow</p>
            <FlowDiagram steps={['Create Project', 'Assign Team', 'Create ORA Plan', 'Create P2A Plan', 'Define VCRs', 'Approve P2A', 'Execute VCRs', 'Conduct PSSR', 'Issue SoF', 'Issue PAC', 'Issue FAC']} />

            <p className="font-medium text-foreground mt-4">Project Creation</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Projects are created with a <strong className="text-foreground">prefix + number</strong> format (e.g., <code className="bg-muted px-1 rounded text-xs">DP-300</code>, <code className="bg-muted px-1 rounded text-xs">DP-354</code>)</li>
              <li>Each project is linked to a <strong className="text-foreground">Plant</strong>, <strong className="text-foreground">Field</strong>, and <strong className="text-foreground">Commission</strong></li>
              <li>Team members are assigned with specific roles from the <code className="bg-muted px-1 rounded text-xs">roles</code> table</li>
              <li>Creating a project and assigning a Senior ORA Engineer <strong className="text-foreground">automatically generates a task</strong> to create the ORA Plan</li>
            </ul>

            <p className="font-medium text-foreground mt-4">Project Data Model</p>
            <InfoTable headers={['Field', 'Description', 'Example']} rows={[
              ['project_id_prefix', 'Project code prefix', 'DP'],
              ['project_id_number', 'Project code number', '300'],
              ['project_title', 'Full project name', 'Basrah Gas Gathering System'],
              ['plant_name', 'Associated plant', 'BNGL'],
              ['field_name', 'Associated field', 'Rumaila'],
              ['status', 'Project status', 'active'],
              ['is_scorecard_project', 'Appears on scorecard', 'true/false'],
              ['is_favorite', 'User-pinned project', 'true/false'],
            ]} />
          </Section>

          <Separator />

          {/* 3. ORA Plan */}
          <Section id="ora-plan" icon={<Workflow className="h-5 w-5 text-primary" />} title="3. ORA Plan Workflow">
            <p>The ORA (Operations Readiness Assessment) Plan follows a <strong className="text-foreground">PDCA (Plan-Do-Check-Act)</strong> lifecycle.</p>
            
            <FlowDiagram steps={['Auto-Task Created', 'Wizard Opens', 'Define Deliverables', 'Set Schedule', 'Submit for Review', 'ORA Lead Reviews (Gantt)', 'Approved', 'Activities Generated']} />

            <p className="font-medium text-foreground mt-4">ORA Plan Status Flow</p>
            <InfoTable headers={['Status', 'Description']} rows={[
              ['DRAFT', 'Plan being created via wizard (can be resumed)'],
              ['IN_PROGRESS', 'Plan is being actively worked on'],
              ['PENDING_APPROVAL', 'Submitted to ORA Lead for review'],
              ['APPROVED', 'ORA Lead approved — deliverables convert to activities'],
              ['COMPLETED', 'All activities finished'],
            ]} />

            <p className="font-medium text-foreground mt-4">ORA Activity Catalog</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Activities are organized by <strong className="text-foreground">ORP Phases</strong>: Assess & Select, Define, Execute</li>
              <li>Activity codes use <strong className="text-foreground">phase prefix + serial</strong> (e.g., <code className="bg-muted px-1 rounded text-xs">IDN-01</code>, <code className="bg-muted px-1 rounded text-xs">EXE-03</code>)</li>
              <li>Sub-activities use <strong className="text-foreground">dot notation</strong> (e.g., <code className="bg-muted px-1 rounded text-xs">IDN-01.01</code>, <code className="bg-muted px-1 rounded text-xs">IDN-01.02</code>)</li>
              <li>Each activity has <strong className="text-foreground">3 duration estimates</strong>: Low, Med, High (in days)</li>
              <li>Phase and code are auto-inherited from parent activities</li>
            </ul>

            <p className="font-medium text-foreground mt-4">Key Tables</p>
            <InfoTable headers={['Table', 'Purpose']} rows={[
              ['orp_plans', 'ORA Plans linked to projects'],
              ['orp_phases', 'Phase definitions (Assess & Select, Define, Execute)'],
              ['ora_activity_catalog', 'Master activity library with hierarchical codes'],
              ['ora_plan_activities', 'Plan-specific activity instances with assignments'],
              ['orp_plan_deliverables', 'Deliverables linked to plans'],
              ['orp_approvals', 'Approval records for ORA Plans'],
              ['orp_activity_log', 'Audit trail for all ORA Plan changes'],
            ]} />
          </Section>

          <Separator />

          {/* 4. P2A Handover */}
          <Section id="p2a-handover" icon={<GitBranch className="h-5 w-5 text-primary" />} title="4. P2A Handover Plan & VCRs">
            <p>The P2A (Project-to-Asset) Handover Plan is the <strong className="text-foreground">master gate</strong> for transitioning project control to operations.</p>

            <p className="font-medium text-foreground mt-3">P2A Plan Structure</p>
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs">
              <div>P2A Handover Plan (project-level)</div>
              <div className="pl-4">├── Systems (imported from GoCompletions / Excel / manual)</div>
              <div className="pl-8">├── Subsystems (comm_status tracking)</div>
              <div className="pl-4">├── VCRs (Handover Points — one per facility/area)</div>
              <div className="pl-8">├── VCR Prerequisites (checklist items per role)</div>
              <div className="pl-8">├── VCR Execution Plan (building blocks)</div>
              <div className="pl-8">├── ITP (Inspection Test Plan — W/H points)</div>
              <div className="pl-4">├── Milestones (manual or Primavera API)</div>
              <div className="pl-4">└── Approvers (Phase 1 + Phase 2)</div>
            </div>

            <p className="font-medium text-foreground mt-4">P2A Approval Workflow — Two Phases</p>
            <FlowDiagram steps={['Plan Created', 'Phase 1: 4 Leads (simultaneous)', 'All 4 Approved?', 'Phase 2: Deputy Plant Director', 'COMPLETED']} />

            <InfoTable headers={['Phase', 'Approvers', 'Trigger']} rows={[
              ['Phase 1', 'ORA Lead, CSU Lead, Construction Lead, Project Hub Lead', 'Tasks created immediately on plan submission'],
              ['Phase 2', 'Deputy Plant Director', 'Auto-activated only after ALL Phase 1 approvers approve'],
            ]} />

            <p className="font-medium text-foreground mt-4">VCR (Verification Certificate of Readiness)</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>VCR Code format: <code className="bg-muted px-1 rounded text-xs">VCR-001-DP300</code> (sequence + project code)</li>
              <li>Each VCR has a <strong className="text-foreground">VCR Execution Plan</strong> defining building blocks (Training, Procedures, Spares, etc.)</li>
              <li>Execution Plan approval triggers a <strong className="text-foreground">cascade</strong>:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>VCR status → APPROVED</li>
                  <li>ORA activity "Create VCR delivery plan" → COMPLETED</li>
                  <li>3-level ORA activity hierarchy generated (Building Blocks → Items → System ITP Activities)</li>
                  <li>Leaf-level tasks auto-assigned to Senior ORA Engineers</li>
                  <li>VCR checklist bundles generated for delivering/approving parties</li>
                  <li>Execution tabs (Training, Procedures) unlocked</li>
                </ul>
              </li>
            </ul>

            <p className="font-medium text-foreground mt-4">VCR Prerequisite Status Flow</p>
            <InfoTable headers={['Status', 'Description']} rows={[
              ['NOT_STARTED', 'Item not yet initiated'],
              ['IN_PROGRESS', 'Delivering party working on item'],
              ['READY_FOR_REVIEW', 'Submitted for approving party review'],
              ['ACCEPTED', 'Approved by approving party'],
              ['REJECTED', 'Rejected — needs rework'],
              ['QUALIFICATION_REQUESTED', 'Qualification process initiated'],
              ['QUALIFICATION_APPROVED', 'Qualification accepted'],
            ]} />

            <p className="font-medium text-foreground mt-4">ITP (Inspection Test Plan)</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Witness (W)</strong> — Asset wishes to observe an activity</li>
              <li><strong className="text-foreground">Hold (H)</strong> — Mandatory Asset presence and sign-off required</li>
              <li>Status assigned via single-click cycling: — → W → H</li>
              <li>Systems grouped by parent with alternating shading</li>
            </ul>

            <p className="font-medium text-foreground mt-4">Key Tables</p>
            <InfoTable headers={['Table', 'Purpose']} rows={[
              ['p2a_handover_plans', 'Master handover plan per project'],
              ['p2a_handover_points', 'VCRs (handover points/facilities)'],
              ['p2a_systems', 'Systems within the plan (from GoCompletions/Excel)'],
              ['p2a_subsystems', 'Subsystems with commissioning status'],
              ['p2a_vcr_prerequisites', 'Checklist items per VCR with delivering/approving parties'],
              ['p2a_handover_approvers', 'Plan approvers (Phase 1 + Phase 2)'],
              ['p2a_handover_deliverables', 'Deliverable tracking'],
              ['p2a_project_phases', 'Phase persistence (PAC/FAC)'],
              ['p2a_audit_trail', 'Full audit trail for P2A changes'],
            ]} />
          </Section>

          <Separator />

          {/* 5. PSSR */}
          <Section id="pssr" icon={<ClipboardList className="h-5 w-5 text-primary" />} title="5. PSSR Workflow">
            <p>Pre-Startup Safety Reviews (PSSRs) ensure that a facility is safe to start up after construction or modification.</p>

            <p className="font-medium text-foreground mt-3">PSSR Code Format</p>
            <p><code className="bg-muted px-1 rounded text-xs">PSSR-{'{PLANT}'}-{'{SEQ}'}</code> — e.g., <code className="bg-muted px-1 rounded text-xs">PSSR-BNGL-001</code>, <code className="bg-muted px-1 rounded text-xs">PSSR-CS-001</code></p>

            <p className="font-medium text-foreground mt-4">PSSR Status Flow</p>
            <FlowDiagram steps={['DRAFT', 'PENDING_LEAD_REVIEW', 'UNDER_REVIEW', 'PSSR Approvers', 'SoF Approvers', 'COMPLETED']} />

            <InfoTable headers={['Status', 'Description', 'Who']} rows={[
              ['DRAFT', 'Creator building the PSSR (checklist, scope, team)', 'PSSR Creator'],
              ['PENDING_LEAD_REVIEW', 'Submitted for lead review (auto-generates task)', 'PSSR Lead'],
              ['UNDER_REVIEW', 'Lead approved — checklist items being executed', 'All parties'],
              ['COMPLETED', 'All approvers signed off', 'System'],
            ]} />

            <p className="font-medium text-foreground mt-4">PSSR Checklist System</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Master checklist items organized by <strong className="text-foreground">11 categories</strong>: General (GN), Process Safety (PS), Organization (OR), Health & Safety (HS), Emergency Response (ER), PACO (IN), Static (MS), Rotating (MR), Civil (CX), Elect (EL), Documentation (DC)</li>
              <li>Each item has a <strong className="text-foreground">unique ID</strong>: <code className="bg-muted px-1 rounded text-xs">{'{CAT_REF}'}-{'{SEQ}'}</code> (e.g., <code className="bg-muted px-1 rounded text-xs">GN-01</code>, <code className="bg-muted px-1 rounded text-xs">PS-03</code>)</li>
              <li>Items assigned to <strong className="text-foreground">delivering party</strong> (who does the work) and <strong className="text-foreground">approving party</strong> (who reviews)</li>
              <li>Responses: <code className="bg-muted px-1 rounded text-xs">YES</code>, <code className="bg-muted px-1 rounded text-xs">NO</code>, <code className="bg-muted px-1 rounded text-xs">NA</code></li>
              <li>Item approval statuses: <code className="bg-muted px-1 rounded text-xs">pending</code> → <code className="bg-muted px-1 rounded text-xs">ready_for_review</code> → <code className="bg-muted px-1 rounded text-xs">approved</code> / <code className="bg-muted px-1 rounded text-xs">rejected</code> / <code className="bg-muted px-1 rounded text-xs">approved_with_action</code></li>
              <li>Priority levels: <strong className="text-foreground">A</strong> (must be closed before start-up) and <strong className="text-foreground">B</strong> (can be closed after)</li>
            </ul>

            <p className="font-medium text-foreground mt-4">PSSR Approval Chain</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">PSSR Approvers</strong> sign first (TA2s, Engineering Manager, etc.)</li>
              <li><strong className="text-foreground">SoF Approvers</strong> are <strong>LOCKED</strong> until all PSSR Approvers approve</li>
              <li>Once all PSSR Approvers approve → SoF Approvers auto-unlock (<code className="bg-muted px-1 rounded text-xs">check_pssr_approval_complete()</code> trigger)</li>
              <li><code className="bg-muted px-1 rounded text-xs">approve_pssr</code> permission is exclusively granted to <strong className="text-foreground">Engr. Manager Asset</strong></li>
            </ul>

            <p className="font-medium text-foreground mt-4">Key Activities</p>
            <p>PSSRs track key milestone dates (Kick-off, Walkdown, SoF Meeting) via <code className="bg-muted px-1 rounded text-xs">pssr_key_activities</code>, denormalized into <code className="bg-muted px-1 rounded text-xs">pssrs.key_activity_dates</code> for fast list-view access.</p>

            <p className="font-medium text-foreground mt-4">Key Tables</p>
            <InfoTable headers={['Table', 'Purpose']} rows={[
              ['pssrs', 'Master PSSR records with progress, status, dates'],
              ['pssr_checklist_items', 'Master checklist items (template)'],
              ['pssr_custom_checklist_items', 'Custom items added per PSSR'],
              ['pssr_checklist_responses', 'Per-PSSR responses with delivering/approving assignments'],
              ['pssr_approvers', 'PSSR approver assignments and decisions'],
              ['sof_approvers', 'SoF approver assignments (locked until PSSR approved)'],
              ['pssr_key_activities', 'Milestone activity dates'],
              ['pssr_action_items', 'Action items raised during PSSR'],
            ]} />
          </Section>

          <Separator />

          {/* 6. Certificates */}
          <Section id="certificates" icon={<FileText className="h-5 w-5 text-primary" />} title="6. Certificates (SoF, PAC, FAC)">
            <InfoTable headers={['Certificate', 'Full Name', 'Purpose', 'Code Format']} rows={[
              ['SoF', 'Statement of Fitness', 'Declares facility fit for start-up after PSSR completion', 'Linked to PSSR'],
              ['PAC', 'Provisional Acceptance Certificate', 'Formalizes transfer of CONTROL, CUSTODY and CARE of systems', 'PAC-{ProjectCode}-VCR-{SN}'],
              ['FAC', 'Final Acceptance Certificate', 'Final handover after defect liability period', 'Linked to VCR'],
            ]} />

            <p className="font-medium text-foreground mt-4">PAC Details</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>PAC number format: <code className="bg-muted px-1 rounded text-xs">PAC-DP300-VCR-001</code></li>
              <li>Info hierarchy: Project ID → Project Name → VCR Name → VCR Ref → PAC Date</li>
              <li>PAC Date shows "Pending Approval" until formally signed</li>
              <li>Systems table: Index, System Code, System Name only</li>
              <li>Opening statement formalizes transfer of "CONTROL, CUSTODY and CARE"</li>
              <li>Standardized signatory grid layout shared across all certificate types</li>
            </ul>

            <p className="font-medium text-foreground mt-4">Outstanding Work List (OWL)</p>
            <p>OWL items track uncompleted work that can proceed after PAC issuance.</p>
            <p>Item number format: <code className="bg-muted px-1 rounded text-xs">OWL-{'{YYYY}'}-{'{SEQ}'}</code> (e.g., <code className="bg-muted px-1 rounded text-xs">OWL-2026-0001</code>)</p>
          </Section>

          <Separator />

          {/* 7. ORM */}
          <Section id="orm" icon={<Users className="h-5 w-5 text-primary" />} title="7. ORM (Operations Readiness Manpower)">
            <p>ORM manages the workforce readiness deliverables needed before operations commence.</p>

            <p className="font-medium text-foreground mt-3">ORM Deliverable Types</p>
            <InfoTable headers={['Type', 'Code', 'Description']} rows={[
              ['Asset Register', 'ASSET_REGISTER', 'Equipment and asset registration'],
              ['Preventive Maintenance', 'PREVENTIVE_MAINTENANCE', 'PM strategy and task lists'],
              ['BOM Development', 'BOM_DEVELOPMENT', 'Bill of Materials for spares'],
              ['Operating Spares', 'OPERATING_SPARES', 'Critical spares procurement'],
              ['IMS Update', 'IMS_UPDATE', 'Integrated Management System updates'],
              ['PM Activation', 'PM_ACTIVATION', 'CMMS PM schedule activation'],
            ]} />

            <p className="font-medium text-foreground mt-4">ORM Workflow Stages</p>
            <FlowDiagram steps={['IN_PROGRESS', 'QAQC_REVIEW', 'LEAD_REVIEW', 'CENTRAL_TEAM_REVIEW', 'APPROVED']} />

            <p className="font-medium text-foreground mt-4">Key Tables</p>
            <InfoTable headers={['Table', 'Purpose']} rows={[
              ['orm_plans', 'ORM plan per project with lead assignment'],
              ['orm_deliverables', 'Individual deliverables with workflow stage tracking'],
              ['orm_tasks', 'Tasks per deliverable with priority and assignment'],
              ['orm_milestones', 'Milestones linked to deliverables'],
              ['orm_daily_reports', 'Daily progress reports per deliverable'],
              ['orm_document_checklist', 'Document receipt tracking'],
              ['orm_attachments', 'File attachments per deliverable'],
            ]} />
          </Section>

          <Separator />

          {/* 8. Training */}
          <Section id="training" icon={<BookOpen className="h-5 w-5 text-primary" />} title="8. Training Management">
            <p>Training plans are linked to ORA Plans and track all training needed for operations readiness.</p>

            <p className="font-medium text-foreground mt-3">Training Plan Status Flow</p>
            <FlowDiagram steps={['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_EXECUTION', 'COMPLETED']} />

            <p className="font-medium text-foreground mt-4">Training Execution Stages</p>
            <InfoTable headers={['Stage', 'Description']} rows={[
              ['NOT_STARTED', 'Training item not yet initiated'],
              ['MATERIALS_REQUESTED', 'Training materials requested from provider'],
              ['MATERIALS_UNDER_REVIEW', 'TA reviewing training materials'],
              ['MATERIALS_APPROVED', 'Materials approved by TA'],
              ['PO_ISSUED', 'Purchase order raised'],
              ['TRAINEES_IDENTIFIED', 'Trainees selected and confirmed'],
              ['SCHEDULED', 'Training dates confirmed'],
              ['IN_PROGRESS', 'Training underway'],
              ['COMPLETED', 'Training completed with evidence uploaded'],
            ]} />

            <p className="font-medium text-foreground mt-4">Key Tables</p>
            <InfoTable headers={['Table', 'Purpose']} rows={[
              ['ora_training_plans', 'Training plans linked to ORA Plans'],
              ['ora_training_items', 'Individual training courses/items with cost tracking'],
              ['ora_training_materials', 'Uploaded training materials with TA approval'],
              ['ora_training_evidence', 'Completion evidence (certificates, photos)'],
              ['ora_training_approvals', 'Multi-stage approval workflow'],
              ['ora_training_system_mappings', 'Link training to specific systems/handover points'],
            ]} />
          </Section>

          <Separator />

          {/* 9. Coding Conventions */}
          <Section id="coding-conventions" icon={<Code className="h-5 w-5 text-primary" />} title="9. Coding Conventions & ID Formats">
            <InfoTable headers={['Entity', 'Format', 'Example', 'Generator Function']} rows={[
              ['Project Code', '{PREFIX}-{NUMBER}', 'DP-300', 'Manual entry'],
              ['VCR Code', 'VCR-{SEQ}-DP{PROJECT}', 'VCR-001-DP300', 'generate_vcr_code()'],
              ['PSSR Code', 'PSSR-{PLANT}-{SEQ}', 'PSSR-BNGL-001', 'generate_pssr_code()'],
              ['PAC Number', 'PAC-{PROJECT}-VCR-{SEQ}', 'PAC-DP300-VCR-001', 'Derived from VCR'],
              ['OWL Item', 'OWL-{YEAR}-{SEQ}', 'OWL-2026-0001', 'generate_owl_item_number()'],
              ['ORA Activity', '{PHASE_PREFIX}-{SEQ}', 'IDN-01', 'generate_ora_activity_code()'],
              ['ORA Sub-Activity', '{PARENT}.{SEQ}', 'IDN-01.01', 'generate_ora_activity_code()'],
              ['Checklist Item', '{CAT_REF}-{SEQ}', 'GN-01, PS-03', 'assign_checklist_unique_id()'],
            ]} />

            <p className="font-medium text-foreground mt-4">Checklist Category Reference IDs</p>
            <InfoTable headers={['Category', 'Ref ID']} rows={[
              ['General', 'GN'],
              ['Process Safety', 'PS'],
              ['Organization', 'OR'],
              ['Health & Safety', 'HS'],
              ['Emergency Response', 'ER'],
              ['PACO', 'IN'],
              ['Static', 'MS'],
              ['Rotating', 'MR'],
              ['Civil', 'CX'],
              ['Elect', 'EL'],
              ['Documentation', 'DC'],
            ]} />
          </Section>

          <Separator />

          {/* 10. Roles */}
          <Section id="roles" icon={<Shield className="h-5 w-5 text-primary" />} title="10. Roles & Permissions Configuration">
            <p>Roles are organized in <strong className="text-foreground">categories</strong> and each role has specific <strong className="text-foreground">permissions</strong> from the <code className="bg-muted px-1 rounded text-xs">app_permission</code> enum.</p>

            <p className="font-medium text-foreground mt-3">Role Categories</p>
            <InfoTable headers={['Category', 'Example Roles']} rows={[
              ['ORA Team', 'ORA Engr., Snr. ORA Engr., ORA Lead'],
              ['Technical Authority (TA2)', 'Process TA2 - Project, Electrical TA2 - Asset, Civil TA2, Tech Safety TA2'],
              ['Engineering Management', 'Engr. Manager Asset, Engr. Manager Project'],
              ['Directors', 'P&E Director, P&M Director, HSE Director, Plant Director'],
              ['CSU Team', 'CSU Lead, CSU Engineer'],
              ['Construction', 'Construction Lead'],
              ['Hub Management', 'Project Hub Lead'],
              ['System', 'admin'],
            ]} />

            <p className="font-medium text-foreground mt-4">TA2 Role Split</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Most TA2 disciplines split into <strong className="text-foreground">Project</strong> (VCR-focused) and <strong className="text-foreground">Asset</strong> (PSSR-focused) variants</li>
              <li>Example: "Process TA2 - Project" vs "Process TA2 - Asset"</li>
              <li><strong className="text-foreground">Civil</strong> and <strong className="text-foreground">Technical Safety</strong> remain common (single role)</li>
              <li>Asset TAs are limited to <strong>item-level reviews</strong>; overall PSSR approval is exclusive to Engr. Manager Asset</li>
            </ul>

            <p className="font-medium text-foreground mt-4">Key Permission Restrictions</p>
            <InfoTable headers={['Permission', 'Restricted To']} rows={[
              ['create_project', 'ORA Engineers, ORA Lead, Snr. ORA Engineers, select leadership'],
              ['create_vcr', 'ORA Engineers, ORA Lead, Snr. ORA Engineers'],
              ['create_pssr', 'ORA Engineers, ORA Lead, Snr. ORA Engineers'],
              ['approve_pssr', 'Engr. Manager Asset ONLY'],
              ['approve_sof', 'Directors (P&E, P&M, HSE, Plant)'],
              ['create_ora_plan', 'ORA Engineers, ORA Lead, Snr. ORA Engineers'],
              ['access_admin', 'System administrators'],
              ['view_reports', 'Directors'],
            ]} />

            <p className="font-medium text-foreground mt-4">Key Tables</p>
            <InfoTable headers={['Table', 'Purpose']} rows={[
              ['roles', 'Role definitions with category and display order'],
              ['role_category', 'Role groupings (ORA, TA2, Directors, etc.)'],
              ['role_permissions', 'Maps roles to app_permission enum values'],
              ['user_roles', 'System role assignment (admin, manager, etc.)'],
            ]} />
          </Section>

          <Separator />

          {/* 11. Database Schema */}
          <Section id="database-schema" icon={<Table className="h-5 w-5 text-primary" />} title="11. Database Schema & Tables">
            <p>The ORSH database contains <strong className="text-foreground">70+ tables</strong> organized by module:</p>

            <p className="font-medium text-foreground mt-3">Core Tables</p>
            <InfoTable headers={['Table', 'Module', 'Description']} rows={[
              ['profiles', 'Core', 'User profiles with tenant_id, role, position, company'],
              ['projects', 'Core', 'Capital projects with prefix/number, plant, field'],
              ['project_team_members', 'Core', 'Team assignments with role_id per project'],
              ['tenants', 'Core', 'Multi-tenant organizations (BGC, Shell, etc.)'],
              ['commission', 'Core', 'Organizational commissions'],
              ['discipline', 'Core', 'Engineering disciplines'],
              ['plant', 'Core', 'Physical plant locations'],
              ['field', 'Core', 'Oil/gas field locations'],
              ['hubs', 'Core', 'Organizational hubs'],
              ['roles', 'Auth', 'Role definitions'],
              ['role_category', 'Auth', 'Role groupings'],
              ['role_permissions', 'Auth', 'Permission matrix'],
              ['user_roles', 'Auth', 'System role assignments'],
            ]} />

            <p className="font-medium text-foreground mt-4">ORA Plan Tables</p>
            <InfoTable headers={['Table', 'Description']} rows={[
              ['orp_plans', 'ORA Plans linked to projects'],
              ['orp_phases', 'Phase definitions with prefixes'],
              ['ora_activity_catalog', 'Master activity library'],
              ['ora_plan_activities', 'Plan-specific activities'],
              ['orp_plan_deliverables', 'Deliverables with completion tracking'],
              ['orp_approvals', 'Approval workflow records'],
              ['orp_resources', 'Resource assignments'],
              ['orp_collaborators', 'Collaborator assignments per deliverable'],
              ['orp_activity_log', 'Full change audit trail'],
            ]} />

            <p className="font-medium text-foreground mt-4">P2A Handover Tables</p>
            <InfoTable headers={['Table', 'Description']} rows={[
              ['p2a_handover_plans', 'Master handover plan per project'],
              ['p2a_handover_points', 'VCRs (facilities/areas)'],
              ['p2a_systems', 'Systems with RFO/RFSU tracking'],
              ['p2a_subsystems', 'Subsystems with comm status'],
              ['p2a_vcr_prerequisites', 'Checklist items with role assignments'],
              ['p2a_handover_approvers', 'Two-phase approval workflow'],
              ['p2a_handover_deliverables', 'Deliverable tracking'],
              ['p2a_project_phases', 'Phase config (PAC/FAC)'],
              ['p2a_approval_workflow', 'Approval stage tracking'],
              ['p2a_audit_trail', 'Complete audit trail'],
            ]} />

            <p className="font-medium text-foreground mt-4">PSSR Tables</p>
            <InfoTable headers={['Table', 'Description']} rows={[
              ['pssrs', 'Master PSSR records'],
              ['pssr_checklist_items', 'Template checklist items'],
              ['pssr_custom_checklist_items', 'Custom items per PSSR'],
              ['pssr_checklist_responses', 'Responses with assignments'],
              ['pssr_approvers', 'PSSR approver chain'],
              ['sof_approvers', 'SoF approver chain (locked until PSSR approved)'],
              ['pssr_key_activities', 'Milestone dates'],
              ['pssr_action_items', 'Action items'],
              ['checklist_items', 'Master checklist configuration'],
            ]} />

            <p className="font-medium text-foreground mt-4">Supporting Tables</p>
            <InfoTable headers={['Table', 'Description']} rows={[
              ['user_tasks', 'Unified task inbox (auto-generated + manual)'],
              ['notifications', 'In-app and email notifications'],
              ['notification_preferences', 'User notification settings'],
              ['audit_logs', 'Security and compliance audit trail'],
              ['user_activity_logs', 'User login and activity history'],
              ['deployment_log', 'Release tracking'],
              ['tenant_feature_flags', 'Per-tenant feature toggles'],
              ['api_keys', 'External integration API keys'],
              ['api_request_logs', 'API request audit trail'],
              ['webhook_configs', 'Incoming webhook configurations'],
              ['chat_conversations / chat_messages', 'AI assistant conversations'],
              ['password_reset_tokens', 'Secure password reset flow'],
              ['outstanding_work_items', 'OWL tracking for certificates'],
              ['handover_certificate_templates', 'Certificate template management'],
              ['fac_prerequisites', 'FAC prerequisite items'],
            ]} />
          </Section>

          <Separator />

          {/* 12. Enums */}
          <Section id="enums" icon={<Boxes className="h-5 w-5 text-primary" />} title="12. Status Enums & State Machines">
            <p>All status values are defined as PostgreSQL enums for type safety:</p>

            <InfoTable headers={['Enum', 'Values', 'Used By']} rows={[
              ['orp_status', 'DRAFT → IN_PROGRESS → PENDING_APPROVAL → APPROVED → COMPLETED', 'orp_plans'],
              ['orp_phase', 'ASSESS_SELECT, DEFINE, EXECUTE', 'orp_phases'],
              ['p2a_plan_status', 'DRAFT → ACTIVE → COMPLETED → ARCHIVED', 'p2a_handover_plans'],
              ['p2a_handover_point_status', 'PENDING → IN_PROGRESS → READY → SIGNED', 'p2a_handover_points'],
              ['p2a_system_completion_status', 'NOT_STARTED → IN_PROGRESS → RFO → RFSU', 'p2a_systems'],
              ['p2a_vcr_prerequisite_status', 'NOT_STARTED → ... → ACCEPTED / QUALIFICATION_APPROVED', 'p2a_vcr_prerequisites'],
              ['pssr_item_approval_status', 'pending → ready_for_review → approved / rejected', 'pssr_checklist_responses'],
              ['pssr_priority_level', 'A (pre-startup), B (post-startup)', 'pssr_action_items'],
              ['ora_training_status', 'DRAFT → PENDING_APPROVAL → ... → COMPLETED', 'ora_training_plans'],
              ['orm_workflow_stage', 'IN_PROGRESS → QAQC → LEAD → CENTRAL → APPROVED', 'orm_deliverables'],
              ['orm_deliverable_type', 'ASSET_REGISTER, PREVENTIVE_MAINTENANCE, BOM, ...', 'orm_deliverables'],
              ['user_company', 'BGC, KENT', 'profiles'],
              ['user_role', 'admin, manager, engineer, safety_officer, technical_authority, user', 'user_roles'],
            ]} />
          </Section>

          <Separator />

          {/* 13. Task Automation */}
          <Section id="task-automation" icon={<Wrench className="h-5 w-5 text-primary" />} title="13. Task Automation & Database Triggers">
            <p>ORSH uses PostgreSQL triggers to automate task creation, progress tracking, and workflow transitions:</p>

            <InfoTable headers={['Trigger', 'Event', 'Action']} rows={[
              ['auto_create_ora_plan_task', 'Senior ORA Engineer assigned to project', 'Creates "Create ORA Plan" task automatically'],
              ['auto_create_pssr_review_task', 'PSSR status → PENDING_LEAD_REVIEW', 'Creates review task for PSSR Lead'],
              ['auto_create_p2a_approval_task', 'Approver added to P2A plan', 'Creates approval task (Phase 1 or waiting Phase 2)'],
              ['auto_activate_p2a_phase2_tasks', 'All Phase 1 approvers approve', 'Activates Phase 2 (Deputy Plant Director) tasks'],
              ['check_pssr_approval_complete', 'PSSR approver approves', 'Unlocks SoF approvers when all PSSR approvers done'],
              ['trg_update_pssr_progress', 'Checklist response changes', 'Recalculates progress_percentage and category_progress'],
              ['manage_delivering_party_task', 'delivering_user_id assigned', 'Creates/updates task for delivering party'],
              ['update_delivering_party_task_progress', 'VCR prerequisite status changes', 'Updates bundle task progress and activates approval bundles'],
              ['sync_key_activity_dates', 'Key activity modified', 'Denormalizes dates into pssrs table'],
              ['rollup_ora_plan_activity_completion', 'Child activity status changes', 'Rolls up completion to parent activity'],
              ['log_orp_activity', 'Any ORA entity change', 'Creates audit trail entry'],
              ['log_p2a_audit_trail', 'Any P2A entity change', 'Creates P2A audit entry'],
              ['audit_pssr_status_change', 'PSSR status changes', 'Writes to audit_logs'],
              ['sync_profile_names_to_auth', 'Profile updated', 'Syncs name/avatar to auth.users metadata'],
            ]} />

            <p className="font-medium text-foreground mt-4">Auto-Generated Code Triggers</p>
            <InfoTable headers={['Trigger Function', 'Purpose']} rows={[
              ['generate_vcr_code()', 'Generates VCR-{SEQ}-DP{PROJECT} codes'],
              ['generate_pssr_code()', 'Generates PSSR-{PLANT}-{SEQ} codes'],
              ['generate_owl_item_number()', 'Generates OWL-{YEAR}-{SEQ} codes'],
              ['generate_ora_activity_code()', 'Generates phase-prefixed activity codes with dot notation'],
              ['assign_checklist_unique_id()', 'Generates category-prefixed checklist IDs'],
            ]} />
          </Section>

          <Separator />

          {/* 14. External Integrations */}
          <Section id="integrations" icon={<Layers className="h-5 w-5 text-primary" />} title="14. External Integrations">
            <InfoTable headers={['System', 'Integration Type', 'Purpose']} rows={[
              ['GoCompletions (GoHub)', 'API + Edge Functions', 'Import systems/subsystems into P2A plans, sync completion counts'],
              ['SAP4HANA', 'API (planned)', 'Asset register and maintenance data sync'],
              ['Primavera P6', 'API (planned)', 'Milestone schedule sync for P2A plans'],
              ['Assai', 'API (planned)', 'Document management system integration'],
              ['SharePoint', 'Microsoft OAuth', 'Document storage and collaboration'],
              ['Email (Resend)', 'Edge Functions', 'Notifications, welcome emails, approval requests'],
            ]} />

            <p className="font-medium text-foreground mt-3">Data Import Sources</p>
            <InfoTable headers={['Source Type Enum', 'Description']} rows={[
              ['MANUAL', 'Manually entered by users'],
              ['EXCEL_IMPORT', 'Bulk imported from Excel spreadsheets'],
              ['API_GOCOMPLETIONS', 'Synced from GoCompletions API'],
              ['API_HUB2', 'Synced from Hub2 system'],
            ]} />
          </Section>

          <Separator />

          {/* 15. Admin Tools */}
          <Section id="admin-tools" icon={<Wrench className="h-5 w-5 text-primary" />} title="15. Admin Tools Reference">
            <p>The Admin Tools dashboard provides 22+ management tools:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { name: 'User Management', desc: 'Create, edit, approve, reject users' },
                { name: 'Bulk User Upload', desc: 'CSV-based mass user creation' },
                { name: 'User Offboarding', desc: 'Secure account deactivation workflow' },
                { name: 'Roles & Permissions', desc: 'Configure RBAC permission matrix' },
                { name: 'Permission Reviews', desc: 'Quarterly access certification campaigns' },
                { name: 'Single Sign-On', desc: 'Per-tenant SAML/OIDC configuration' },
                { name: 'Session Timeout', desc: 'Configure inactivity timeout' },
                { name: 'Brute-Force Protection', desc: 'Account lockout thresholds' },
                { name: 'Security Audit Logs', desc: 'View all security events' },
                { name: 'Audit Log Retention', desc: 'Configure retention and auto-purge' },
                { name: 'Data Export', desc: 'CSV/JSON export of critical tables' },
                { name: 'Disaster Recovery', desc: 'DR runbook with RTO/RPO targets' },
                { name: 'API Key Management', desc: 'Scoped, hashed API keys' },
                { name: 'Webhook Security', desc: 'HMAC signature verification' },
                { name: 'Integration Health', desc: 'API call monitoring dashboard' },
                { name: 'APIs', desc: 'External system interface config' },
                { name: 'ORA Configuration', desc: 'Activity catalog and phase management' },
                { name: 'VCRs and PSSRs', desc: 'Certificate and checklist configuration' },
                { name: 'Activity Log', desc: 'Platform-wide activity feed' },
                { name: 'Deployment Log', desc: 'Release tracking with pre-publish checklist' },
                { name: 'Tenant Feature Flags', desc: 'Per-tenant module toggles' },
                { name: 'Security & Compliance Doc', desc: 'This living security document' },
                { name: 'Platform Guide', desc: 'This living platform guide' },
              ].map(t => (
                <div key={t.name} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">{t.name}</strong> — {t.desc}</span>
                </div>
              ))}
            </div>
          </Section>

          <Separator />

          {/* 16. Deployment Architecture & Portability */}
          <Section id="deployment-portability" icon={<Container className="h-5 w-5 text-primary" />} title="16. Deployment Architecture & Portability">
            <p>ORSH is designed for <strong className="text-foreground">full architectural portability</strong> — no proprietary dependencies, no vendor lock-in, and multiple deployment models supported.</p>

            <p className="font-medium text-foreground mt-3">Technology Stack Summary</p>
            <InfoTable headers={['Layer', 'Technology', 'Portability']} rows={[
              ['Frontend', 'React 18 + TypeScript + Vite + Tailwind CSS', 'Runs anywhere — static build served by any web server'],
              ['Backend API', 'Supabase PostgREST (auto-generated REST)', 'Replaceable with any PostgreSQL REST layer'],
              ['Database', 'PostgreSQL 15+', 'Standard SQL — migrate to any PostgreSQL host'],
              ['Authentication', 'GoTrue (Supabase Auth)', 'Self-hostable via Docker; compatible with SAML/OIDC'],
              ['Edge Functions', 'Deno-based serverless functions', 'Portable to Deno Deploy, Cloudflare Workers, or self-hosted Deno'],
              ['Storage', 'S3-compatible object storage', 'Works with AWS S3, MinIO, or any S3-compatible provider'],
              ['Realtime', 'Supabase Realtime (WebSocket)', 'Self-hostable via official Docker image'],
            ]} />

            <p className="font-medium text-foreground mt-4">Export & Migration Path</p>
            <FlowDiagram steps={['Clone GitHub Repo', 'pg_dump Database', 'Export Storage Files', 'Copy Edge Functions', 'Deploy to Target']} />
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Source Code:</strong> Full codebase available via GitHub — <code className="bg-muted px-1 rounded text-xs">git clone</code> and build with <code className="bg-muted px-1 rounded text-xs">npm run build</code></li>
              <li><strong className="text-foreground">Database:</strong> Export via <code className="bg-muted px-1 rounded text-xs">pg_dump --format=custom</code> — import to any PostgreSQL 15+ instance</li>
              <li><strong className="text-foreground">Migrations:</strong> All schema changes stored as versioned SQL files in <code className="bg-muted px-1 rounded text-xs">supabase/migrations/</code></li>
              <li><strong className="text-foreground">Edge Functions:</strong> Standard Deno/TypeScript — deploy to Deno Deploy, self-hosted Deno, or refactor to Node.js</li>
            </ul>

            <p className="font-medium text-foreground mt-4">Supported Deployment Models</p>
            <InfoTable headers={['Model', 'Infrastructure', 'Best For']} rows={[
              ['Cloud (Supabase)', 'Managed Supabase on AWS', 'Fastest setup, zero ops overhead, automatic scaling'],
              ['Self-Hosted (Docker)', 'Docker Compose on any VM/server', 'Full control, cost optimization, air-gapped environments'],
              ['On-Premises', 'Customer data center', 'Strict data sovereignty, regulatory compliance'],
              ['Kubernetes', 'K8s cluster (EKS, AKS, GKE, on-prem)', 'Enterprise scale, HA, auto-scaling, multi-region'],
            ]} />

            <p className="font-medium text-foreground mt-4">Containerization Architecture</p>
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs space-y-1">
              <div className="text-foreground font-semibold mb-2">┌─────────── Kubernetes Cluster / Docker Compose ───────────┐</div>
              <div>│                                                           │</div>
              <div>│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │</div>
              <div>│  │ Frontend  │  │   API    │  │   Auth   │  │ Realtime │  │</div>
              <div>│  │  (Nginx)  │  │(PostgREST)│  │ (GoTrue) │  │   (WS)   │  │</div>
              <div>│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │</div>
              <div>│       │             │             │             │         │</div>
              <div>│  ┌────┴─────────────┴─────────────┴─────────────┴────┐    │</div>
              <div>│  │              PostgreSQL Database                   │    │</div>
              <div>│  └──────────────────────────────────────────────────┘    │</div>
              <div>│                                                           │</div>
              <div>│  ┌──────────┐  ┌──────────┐                              │</div>
              <div>│  │ Storage  │  │  Edge Fn  │                              │</div>
              <div>│  │  (S3)    │  │  (Deno)   │                              │</div>
              <div>│  └──────────┘  └──────────┘                              │</div>
              <div>│                                                           │</div>
              <div>└───────────────────────────────────────────────────────────┘</div>
            </div>

            <p className="font-medium text-foreground mt-4">Regional Hosting Options — Middle East</p>
            <InfoTable headers={['Region', 'AWS Code', 'Services Available']} rows={[
              ['Bahrain', 'me-south-1', 'RDS PostgreSQL, S3, Lambda, EC2, EKS — full stack support'],
              ['UAE', 'me-central-1', 'RDS PostgreSQL, S3, EC2 — data residency compliance'],
            ]} />
            <Card className="bg-primary/5 border-primary/20 mt-2">
              <CardContent className="pt-4 text-sm">
                <p><strong className="text-foreground">Data Sovereignty Note:</strong> By deploying to a Middle East AWS region, all data (database, file storage, backups) resides within the selected country's jurisdiction, meeting local regulatory and data residency requirements.</p>
              </CardContent>
            </Card>
          </Section>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground py-6 border-t border-border">
            <p>This is a living document maintained within the ORSH platform.</p>
            <p>Updated continuously as new features, workflows, and tables are added.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformGuideDocument;
