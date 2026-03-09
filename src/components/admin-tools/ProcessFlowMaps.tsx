import React from 'react';
import { ArrowLeft, ArrowRight, GitBranch, Layers, Shield, ClipboardList, FolderOpen, Wrench, BookOpen, Users, FileText, CheckCircle, AlertTriangle, Clock, LayoutTemplate } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

interface ProcessFlowMapsProps {
  onBack: () => void;
}

const FlowDiagram: React.FC<{ steps: Array<{ label: string; type?: 'start' | 'end' | 'decision' | 'process' | 'auto' }> }> = ({ steps }) => (
  <div className="flex flex-wrap items-center gap-1 bg-muted/50 rounded-lg p-4">
    {steps.map((step, i) => {
      const styleMap = {
        start: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-full',
        end: 'bg-primary/20 text-primary border border-primary/30 rounded-full',
        decision: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rotate-0 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)] px-6',
        process: 'bg-card text-foreground border border-border rounded',
        auto: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded border-dashed',
      };
      const style = styleMap[step.type || 'process'];
      return (
        <React.Fragment key={i}>
          <span className={`text-[10px] font-medium px-2.5 py-1.5 whitespace-nowrap ${style}`}>{step.label}</span>
          {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
        </React.Fragment>
      );
    })}
  </div>
);

const SwimLane: React.FC<{ role: string; color: string; steps: string[] }> = ({ role, color, steps }) => (
  <div className="flex items-stretch gap-0 border border-border rounded-lg overflow-hidden">
    <div className={`w-28 shrink-0 flex items-center justify-center px-2 py-3 text-[10px] font-bold uppercase tracking-wide text-white ${color}`}>
      {role}
    </div>
    <div className="flex-1 flex items-center gap-1 px-3 py-2 overflow-x-auto bg-card">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <span className="text-[10px] bg-muted px-2 py-1 rounded whitespace-nowrap">{s}</span>
          {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  </div>
);

const ProcessSection: React.FC<{
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ id, icon, title, description, children }) => (
  <section id={id} className="scroll-mt-6">
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="space-y-4 mt-4">
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
            <th key={i} className="px-3 py-2 text-left font-semibold text-foreground text-xs">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
            {row.map((cell, j) => (
              <td key={j} className="px-3 py-2 text-xs">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ProcessFlowMaps: React.FC<ProcessFlowMapsProps> = ({ onBack }) => {
  const tocItems = [
    { id: 'user-lifecycle', label: 'User Lifecycle & Onboarding' },
    { id: 'project-creation', label: 'Project Creation & Team Setup' },
    { id: 'ora-workflow', label: 'ORA Plan Workflow' },
    { id: 'p2a-workflow', label: 'P2A Handover Plan Workflow' },
    { id: 'vcr-workflow', label: 'VCR Lifecycle' },
    { id: 'pssr-workflow', label: 'PSSR Workflow' },
    { id: 'certificate-workflow', label: 'Certificates (SoF, PAC, FAC)' },
    { id: 'orm-workflow', label: 'ORM Deliverables Workflow' },
    { id: 'training-workflow', label: 'Training Management Workflow' },
    { id: 'task-automation', label: 'Task Automation Engine' },
    { id: 'approval-chains', label: 'Approval Chain Patterns' },
    { id: 'ori-calculation', label: 'ORI Scoring Process' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Process Flow Maps" favoritePath="/admin-tools/process-flows" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                ORSH Process Flow Maps
              </h1>
              <p className="text-sm text-muted-foreground">Complete process documentation for all ORSH workflows</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {tocItems.length} Processes
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">

          {/* Table of Contents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Table of Contents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
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

          {/* 1. User Lifecycle */}
          <ProcessSection id="user-lifecycle" icon={<Users className="h-5 w-5 text-primary" />} title="1. User Lifecycle & Onboarding" description="From registration to active platform usage">
            <FlowDiagram steps={[
              { label: 'User Registers', type: 'start' },
              { label: 'Account Pending', type: 'process' },
              { label: 'Admin Reviews', type: 'decision' },
              { label: 'Approve Account', type: 'auto' },
              { label: 'Assign Role & Hub', type: 'process' },
              { label: 'Profile Complete', type: 'process' },
              { label: 'Active User', type: 'end' },
            ]} />
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-foreground mb-2">Key Automations</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong className="text-foreground">DB Trigger:</strong> <code className="bg-muted px-1 rounded text-[10px]">approve_user_account()</code> sets status to active and logs the action</li>
                  <li>• <strong className="text-foreground">Auto-assign:</strong> New users receive default "Viewer" role via trigger</li>
                  <li>• <strong className="text-foreground">Profile Sync:</strong> <code className="bg-muted px-1 rounded text-[10px]">sync_profile_names_to_auth()</code> keeps auth metadata in sync</li>
                  <li>• <strong className="text-foreground">Offboarding:</strong> <code className="bg-muted px-1 rounded text-[10px]">offboard_user()</code> deactivates, cancels tasks, revokes API keys</li>
                </ul>
              </CardContent>
            </Card>
          </ProcessSection>

          <Separator />

          {/* 2. Project Creation */}
          <ProcessSection id="project-creation" icon={<FolderOpen className="h-5 w-5 text-primary" />} title="2. Project Creation & Team Setup" description="Creating projects and assigning team members">
            <FlowDiagram steps={[
              { label: 'Create Project', type: 'start' },
              { label: 'Set ID (e.g. DP-300)', type: 'process' },
              { label: 'Assign Plant/Field', type: 'process' },
              { label: 'Add Team Members', type: 'process' },
              { label: 'Assign Sr. ORA Engr', type: 'decision' },
              { label: '⚡ Auto-Create Task', type: 'auto' },
              { label: 'ORA Plan Task Created', type: 'end' },
            ]} />
            <SwimLane role="Admin" color="bg-slate-600" steps={['Create Project', 'Configure Details', 'Assign Plant & Field']} />
            <SwimLane role="Admin" color="bg-slate-600" steps={['Add Team Members', 'Assign Roles (from roles table)', 'Save Team']} />
            <SwimLane role="System" color="bg-blue-600" steps={['Detect Sr. ORA Engineer', 'Trigger: auto_create_ora_plan_task()', 'Create "Create ORA Plan" Task']} />
          </ProcessSection>

          <Separator />

          {/* 3. ORA Workflow */}
          <ProcessSection id="ora-workflow" icon={<LayoutTemplate className="h-5 w-5 text-primary" />} title="3. ORA Plan Workflow" description="End-to-end ORA Activity Plan lifecycle">
            <FlowDiagram steps={[
              { label: 'Task: Create ORA Plan', type: 'start' },
              { label: 'Open Wizard', type: 'process' },
              { label: 'Step 1: Phase & Type', type: 'process' },
              { label: 'Step 2: Template', type: 'process' },
              { label: 'Step 3: Activities', type: 'process' },
              { label: 'Step 4: Schedule (Gantt)', type: 'process' },
              { label: 'Step 5: Approvers', type: 'auto' },
              { label: 'Step 6: Review & Submit', type: 'process' },
              { label: 'PENDING_APPROVAL', type: 'decision' },
            ]} />
            <FlowDiagram steps={[
              { label: 'Approvers Review', type: 'process' },
              { label: 'All Approved?', type: 'decision' },
              { label: '⚡ Materialize Activities', type: 'auto' },
              { label: '⚡ Generate Leaf Tasks', type: 'auto' },
              { label: '⚡ Create P2A Task', type: 'auto' },
              { label: 'APPROVED', type: 'end' },
            ]} />
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-foreground mb-2">Approval Logic</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong className="text-foreground">Consensus:</strong> All approvers must approve (ORA Lead + Hub Lead)</li>
                  <li>• <strong className="text-foreground">Rejection:</strong> Returns plan to DRAFT status</li>
                  <li>• <strong className="text-foreground">Read-Only:</strong> Plan is locked during PENDING_APPROVAL/UNDER_REVIEW</li>
                  <li>• <strong className="text-foreground">Post-Approval:</strong> DB trigger <code className="bg-muted px-1 rounded text-[10px]">auto_create_ora_leaf_tasks</code> generates tasks for leaf activities</li>
                </ul>
              </CardContent>
            </Card>
            <InfoTable headers={['State', 'Editing', 'Who Can Transition']} rows={[
              ['DRAFT', 'Full editing', 'Sr. ORA Engineer'],
              ['PENDING_APPROVAL', 'Read-only (view only)', 'System (on submit)'],
              ['UNDER_REVIEW', 'Approver edits only', 'Approver'],
              ['APPROVED', 'Execution mode (status/progress)', 'System (on all approve)'],
              ['REJECTED → DRAFT', 'Full editing resumes', 'System (on rejection)'],
            ]} />
          </ProcessSection>

          <Separator />

          {/* 4. P2A Workflow */}
          <ProcessSection id="p2a-workflow" icon={<Layers className="h-5 w-5 text-primary" />} title="4. P2A Handover Plan Workflow" description="Project-to-Asset handover plan creation">
            <FlowDiagram steps={[
              { label: 'Task: Create P2A Plan', type: 'start' },
              { label: 'Open P2A Wizard', type: 'process' },
              { label: 'Step 1: Select Systems', type: 'process' },
              { label: 'Step 2: Create VCRs', type: 'process' },
              { label: 'Step 3: Assign Systems to VCRs', type: 'process' },
              { label: 'Step 4: Handover Phases', type: 'process' },
              { label: 'Step 5: Select Approvers', type: 'process' },
              { label: 'Step 6: Review & Submit', type: 'process' },
              { label: 'SUBMITTED', type: 'end' },
            ]} />
            <SwimLane role="Sr ORA Engr" color="bg-emerald-600" steps={['Create P2A Plan', 'Define Systems', 'Create VCRs', 'Submit']} />
            <SwimLane role="Reviewers" color="bg-blue-600" steps={['Review P2A Plan', 'Approve / Reject', 'Add Comments']} />
            <SwimLane role="Dir/DPD" color="bg-violet-600" steps={['Final Approval (Phase 2)', 'Sign-off']} />
            <SwimLane role="System" color="bg-slate-600" steps={['Create Approval Tasks', 'Progressive Activation', 'Update Status']} />
          </ProcessSection>

          <Separator />

          {/* 5. VCR Lifecycle */}
          <ProcessSection id="vcr-workflow" icon={<ClipboardList className="h-5 w-5 text-primary" />} title="5. VCR Lifecycle" description="Verification Certificate of Readiness from creation to sign-off">
            <FlowDiagram steps={[
              { label: 'VCR Created', type: 'start' },
              { label: 'Systems Assigned', type: 'process' },
              { label: 'Prerequisites Populated', type: 'auto' },
              { label: '⚡ Checklist Bundle Tasks', type: 'auto' },
              { label: 'Delivering Parties Execute', type: 'process' },
              { label: 'All Delivered?', type: 'decision' },
              { label: '⚡ Activate Approval Bundle', type: 'auto' },
              { label: 'Reviewers Approve', type: 'process' },
              { label: 'VCR SIGNED', type: 'end' },
            ]} />
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-foreground mb-2">Progressive Task Activation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong className="text-foreground">Delivery Phase:</strong> <code className="bg-muted px-1 rounded text-[10px]">vcr_checklist_bundle</code> tasks for each delivering party</li>
                  <li>• <strong className="text-foreground">Review Phase:</strong> <code className="bg-muted px-1 rounded text-[10px]">vcr_approval_bundle</code> tasks activate only after delivery complete</li>
                  <li>• <strong className="text-foreground">Soft-Blocking:</strong> ORA Activity Intelligence warns when related activities are incomplete</li>
                  <li>• <strong className="text-foreground">Sub-Items:</strong> Each bundle task contains sub-items synced via <code className="bg-muted px-1 rounded text-[10px]">update_delivering_party_task_progress()</code></li>
                </ul>
              </CardContent>
            </Card>
          </ProcessSection>

          <Separator />

          {/* 6. PSSR Workflow */}
          <ProcessSection id="pssr-workflow" icon={<Shield className="h-5 w-5 text-primary" />} title="6. PSSR Workflow" description="Pre-Startup Safety Review from creation to SoF generation">
            <FlowDiagram steps={[
              { label: 'Create PSSR', type: 'start' },
              { label: 'Configure Scope', type: 'process' },
              { label: 'Assign Lead & Team', type: 'process' },
              { label: 'Submit Draft', type: 'process' },
              { label: 'PENDING_LEAD_REVIEW', type: 'decision' },
              { label: '⚡ Create Review Task', type: 'auto' },
              { label: 'Lead Approves', type: 'process' },
              { label: 'IN_PROGRESS', type: 'process' },
            ]} />
            <FlowDiagram steps={[
              { label: 'Walkdown Execution', type: 'process' },
              { label: 'Checklist Responses', type: 'process' },
              { label: '⚡ Auto Progress Calc', type: 'auto' },
              { label: 'All Items Complete?', type: 'decision' },
              { label: 'PSSR Approvers Review', type: 'process' },
              { label: 'All Approved?', type: 'decision' },
              { label: 'SoF Approvers Unlocked', type: 'auto' },
              { label: 'SoF Signed', type: 'end' },
            ]} />
            <InfoTable headers={['Status', 'Description', 'Trigger']} rows={[
              ['DRAFT', 'Being configured by creator', 'Manual'],
              ['PENDING_LEAD_REVIEW', 'Submitted for lead approval', 'Submit action → auto task'],
              ['IN_PROGRESS', 'Walkdown and checklist execution', 'Lead approval'],
              ['UNDER_REVIEW', 'Items being reviewed by approvers', 'All items responded'],
              ['APPROVED', 'PSSR approved, SoF unlocked', 'All PSSR approvers approve'],
              ['SOF_APPROVED', 'Statement of Fitness signed', 'All SoF approvers sign'],
            ]} />
          </ProcessSection>

          <Separator />

          {/* 7. Certificates */}
          <ProcessSection id="certificate-workflow" icon={<FileText className="h-5 w-5 text-primary" />} title="7. Certificates (SoF, PAC, FAC)" description="Certificate generation and approval workflows">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Statement of Fitness (SoF)</p>
                  <FlowDiagram steps={[
                    { label: 'PSSR Approved', type: 'start' },
                    { label: '⚡ SoF Approvers Unlocked', type: 'auto' },
                    { label: 'SoF Reviewers Sign', type: 'process' },
                    { label: 'SoF Certificate Generated', type: 'end' },
                  ]} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Provisional Acceptance Certificate (PAC)</p>
                  <FlowDiagram steps={[
                    { label: 'Project Team Initiates', type: 'start' },
                    { label: 'Edit Certificate Content', type: 'process' },
                    { label: 'Review & Sign', type: 'process' },
                    { label: 'PAC Issued', type: 'end' },
                  ]} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Final Acceptance Certificate (FAC)</p>
                  <FlowDiagram steps={[
                    { label: 'Post-Startup Period', type: 'start' },
                    { label: 'FAC Prerequisites Checked', type: 'process' },
                    { label: 'Edit Certificate Content', type: 'process' },
                    { label: 'Review & Sign', type: 'process' },
                    { label: 'FAC Issued', type: 'end' },
                  ]} />
                </div>
              </CardContent>
            </Card>
          </ProcessSection>

          <Separator />

          {/* 8. ORM */}
          <ProcessSection id="orm-workflow" icon={<Users className="h-5 w-5 text-primary" />} title="8. ORM Deliverables Workflow" description="Operations Readiness Manpower tracking">
            <FlowDiagram steps={[
              { label: 'Create ORM Plan', type: 'start' },
              { label: 'Add Deliverables', type: 'process' },
              { label: 'Assign Resources', type: 'process' },
              { label: 'Track Progress', type: 'process' },
              { label: 'QA/QC Review', type: 'decision' },
              { label: 'Daily Reports', type: 'process' },
              { label: 'Milestone Tracking', type: 'process' },
              { label: 'Deliverable Complete', type: 'end' },
            ]} />
            <InfoTable headers={['Stage', 'Description', 'Auto-Calculation']} rows={[
              ['not_started', 'Deliverable created, no work begun', '—'],
              ['in_progress', 'Resource assigned and working', 'Progress from daily reports'],
              ['in_review', 'QA/QC reviewer assessing', '—'],
              ['revision', 'Changes requested by reviewer', '—'],
              ['completed', 'Deliverable accepted', 'Milestone progress auto-calc'],
            ]} />
          </ProcessSection>

          <Separator />

          {/* 9. Training */}
          <ProcessSection id="training-workflow" icon={<BookOpen className="h-5 w-5 text-primary" />} title="9. Training Management Workflow" description="Training plan creation, execution, and evidence tracking">
            <FlowDiagram steps={[
              { label: 'Create Training Plan', type: 'start' },
              { label: 'Add Training Items', type: 'process' },
              { label: 'Map to Systems', type: 'process' },
              { label: 'Submit for Approval', type: 'process' },
              { label: 'Multi-stage Approval', type: 'decision' },
              { label: 'Schedule Training', type: 'process' },
              { label: 'Issue PO', type: 'process' },
              { label: 'Execute & Upload Evidence', type: 'process' },
              { label: 'Training Complete', type: 'end' },
            ]} />
            <InfoTable headers={['Execution Stage', 'Description']} rows={[
              ['planning', 'Training item defined, not yet scheduled'],
              ['scheduled', 'Date and provider confirmed'],
              ['po_issued', 'Purchase order created for external training'],
              ['in_progress', 'Training session underway'],
              ['completed', 'Training delivered, evidence uploaded'],
              ['cancelled', 'Training cancelled'],
            ]} />
          </ProcessSection>

          <Separator />

          {/* 10. Task Automation */}
          <ProcessSection id="task-automation" icon={<Wrench className="h-5 w-5 text-primary" />} title="10. Task Automation Engine" description="How ORSH automatically generates and manages tasks">
            <InfoTable headers={['Trigger', 'Task Created', 'Assigned To', 'DB Function']} rows={[
              ['Sr. ORA Engineer assigned to project', 'Create ORA Plan', 'Sr. ORA Engineer', 'auto_create_ora_plan_task()'],
              ['ORA Plan approved', 'Leaf activity tasks + P2A task', 'Sr. ORA Engineer', 'auto_create_ora_leaf_tasks (trigger)'],
              ['PSSR submitted for review', 'Review Draft PSSR', 'PSSR Lead', 'auto_create_pssr_review_task()'],
              ['P2A approver assigned', 'Review & Approve P2A Plan', 'Approver', 'auto_create_p2a_approval_task()'],
              ['VCR prerequisites populated', 'Checklist bundle tasks', 'Delivering parties', 'VCR task generation logic'],
              ['All delivery bundles complete', 'Approval bundle activated', 'Reviewers', 'update_delivering_party_task_progress()'],
            ]} />
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-foreground mb-1">Smart Priority Model</p>
                <p className="text-xs text-muted-foreground">Tasks use a weighted priority formula: <strong className="text-foreground">Urgency (50%)</strong> + <strong className="text-foreground">Impact (30%)</strong> + <strong className="text-foreground">Momentum (20%)</strong>. Urgency factors in due dates and overdue status. Impact considers project criticality. Momentum rewards consistent progress patterns.</p>
              </CardContent>
            </Card>
          </ProcessSection>

          <Separator />

          {/* 11. Approval Chains */}
          <ProcessSection id="approval-chains" icon={<CheckCircle className="h-5 w-5 text-primary" />} title="11. Approval Chain Patterns" description="How approvals flow across modules">
            <InfoTable headers={['Module', 'Pattern', 'Approvers', 'Escalation']} rows={[
              ['ORA Plan', 'Consensus (all must approve)', 'ORA Lead + Hub Lead', 'Rejection → DRAFT'],
              ['P2A Plan', '2-Phase (sequential)', 'Phase 1: Technical reviewers → Phase 2: DPD', 'Phase 2 waits for Phase 1'],
              ['PSSR', 'Sequential gating', 'PSSR Approvers → SoF Approvers', 'SoF locked until PSSR approved'],
              ['Training', 'Multi-stage sequential', 'TA Reviewer → ORA Lead → Hub Lead', 'Each stage sequential'],
              ['VCR', 'Progressive activation', 'Delivering Parties → Review Bundle', 'Review waits for delivery'],
            ]} />
          </ProcessSection>

          <Separator />

          {/* 12. ORI Scoring */}
          <ProcessSection id="ori-calculation" icon={<Layers className="h-5 w-5 text-primary" />} title="12. ORI Scoring Process" description="How the Operational Readiness Index is calculated">
            <FlowDiagram steps={[
              { label: 'Trigger: Calculate ORI', type: 'start' },
              { label: 'sync_readiness_nodes()', type: 'auto' },
              { label: 'Collect All Module Data', type: 'process' },
              { label: 'Map to 5 Dimensions', type: 'process' },
              { label: 'Apply Weights & Confidence', type: 'process' },
              { label: 'Calculate Risk Penalties', type: 'process' },
              { label: 'ORI = Σ(W×DS) − RP', type: 'process' },
              { label: 'SCS = ORI × SAI × CPSI', type: 'process' },
              { label: 'Score Saved', type: 'end' },
            ]} />
            <SwimLane role="Data Sources" color="bg-blue-600" steps={['ORA Activities', 'P2A Handover Points', 'PSSRs', 'ORM Deliverables', 'Training Items']} />
            <SwimLane role="Dimensions" color="bg-emerald-600" steps={['Operating Integrity', 'Design Integrity', 'Health & Safety', 'Management Systems', 'Technical Integrity']} />
            <SwimLane role="Output" color="bg-violet-600" steps={['ORI Score (0-100)', 'SCS (0-100)', 'Dimension Breakdown', 'Risk Penalties', 'Confidence Level']} />
          </ProcessSection>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground py-6 border-t border-border">
            <p>This is a living document maintained within the ORSH platform.</p>
            <p>Process flows are updated as new workflows, automations, and modules are added.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessFlowMaps;
