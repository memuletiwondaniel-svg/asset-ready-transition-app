import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Shield, Database, Clock, AlertTriangle, CheckCircle, Server, HardDrive, Users, Key, FileText } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

interface DisasterRecoveryRunbookProps {
  onBack: () => void;
}

interface RunbookSection {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
  content: React.ReactNode;
}

const DisasterRecoveryRunbook: React.FC<DisasterRecoveryRunbookProps> = ({ onBack }) => {
  const [openSections, setOpenSections] = useState<string[]>(['rto-rpo']);

  const toggleSection = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const sections: RunbookSection[] = [
    {
      id: 'rto-rpo',
      title: 'Recovery Objectives (RTO / RPO)',
      icon: Clock,
      badge: 'Critical',
      badgeVariant: 'destructive',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Recovery Time Objective (RTO)</p>
              <p className="text-2xl font-bold text-foreground">4 hours</p>
              <p className="text-xs text-muted-foreground mt-1">Maximum acceptable downtime before full service restoration</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Recovery Point Objective (RPO)</p>
              <p className="text-2xl font-bold text-foreground">1 hour</p>
              <p className="text-xs text-muted-foreground mt-1">Maximum acceptable data loss measured in time</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            These objectives should be reviewed quarterly with stakeholders and adjusted based on business needs. 
            With PITR enabled, the RPO can be reduced to near-zero (seconds).
          </p>
        </div>
      ),
    },
    {
      id: 'backup-inventory',
      title: 'Backup Inventory',
      icon: HardDrive,
      content: (
        <div className="space-y-3">
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-2 font-medium">Component</th>
                  <th className="text-left p-2 font-medium">Method</th>
                  <th className="text-left p-2 font-medium">Frequency</th>
                  <th className="text-left p-2 font-medium">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-2">Postgres Database</td><td className="p-2">Supabase auto-backup</td><td className="p-2">Daily</td><td className="p-2">7–30 days (plan-dependent)</td></tr>
                <tr><td className="p-2">Database (PITR)</td><td className="p-2">WAL archiving</td><td className="p-2">Continuous</td><td className="p-2">7 days</td></tr>
                <tr><td className="p-2">Storage Buckets</td><td className="p-2">Cloud provider redundancy</td><td className="p-2">Real-time</td><td className="p-2">3+ replicas</td></tr>
                <tr><td className="p-2">Edge Functions</td><td className="p-2">Git repository</td><td className="p-2">Every commit</td><td className="p-2">Indefinite</td></tr>
                <tr><td className="p-2">Application Code</td><td className="p-2">Git (Lovable/GitHub)</td><td className="p-2">Every commit</td><td className="p-2">Indefinite</td></tr>
                <tr><td className="p-2">Secrets/Env Vars</td><td className="p-2">Manual (vault)</td><td className="p-2">On change</td><td className="p-2">Per vault policy</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 'restore-database',
      title: 'Procedure: Database Restore',
      icon: Database,
      badge: 'Step-by-step',
      badgeVariant: 'outline',
      content: (
        <ol className="space-y-3 text-xs text-muted-foreground list-decimal list-inside">
          <li><strong className="text-foreground">Assess the incident</strong> — Determine the nature of data loss (accidental deletion, corruption, or full outage)</li>
          <li><strong className="text-foreground">Log into Supabase Dashboard</strong> — Navigate to <code className="bg-muted px-1 rounded text-[11px]">Project Settings → Database → Backups</code></li>
          <li><strong className="text-foreground">For point-in-time recovery:</strong> Select the target timestamp just before the incident occurred</li>
          <li><strong className="text-foreground">For daily backup:</strong> Select the most recent backup before the incident</li>
          <li><strong className="text-foreground">Initiate restore</strong> — Click "Restore" and confirm. This creates a new database instance</li>
          <li><strong className="text-foreground">Verify data integrity</strong> — Check critical tables (projects, pssrs, profiles, audit_logs) for completeness</li>
          <li><strong className="text-foreground">Update connection strings</strong> — If restored to a new project, update environment variables</li>
          <li><strong className="text-foreground">Verify RLS policies</strong> — Ensure all Row Level Security policies are intact after restore</li>
          <li><strong className="text-foreground">Test authentication</strong> — Confirm user login works and sessions are valid</li>
          <li><strong className="text-foreground">Document the incident</strong> — Record what happened, when, and what was restored in the audit log</li>
        </ol>
      ),
    },
    {
      id: 'restore-application',
      title: 'Procedure: Application Restore',
      icon: Server,
      content: (
        <ol className="space-y-3 text-xs text-muted-foreground list-decimal list-inside">
          <li><strong className="text-foreground">Identify the last known good commit</strong> in the Git repository</li>
          <li><strong className="text-foreground">Revert to the commit</strong> using Lovable's version history or GitHub</li>
          <li><strong className="text-foreground">Re-publish the application</strong> from the Lovable editor</li>
          <li><strong className="text-foreground">Verify edge functions</strong> are deployed and responding</li>
          <li><strong className="text-foreground">Check environment variables</strong> match the expected values</li>
          <li><strong className="text-foreground">Run smoke tests</strong> — Login, create a test record, verify dashboards load</li>
        </ol>
      ),
    },
    {
      id: 'contacts',
      title: 'Emergency Contacts',
      icon: Users,
      badge: 'Keep Updated',
      badgeVariant: 'secondary',
      content: (
        <div className="space-y-3">
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-2 font-medium">Role</th>
                  <th className="text-left p-2 font-medium">Responsibility</th>
                  <th className="text-left p-2 font-medium">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-2">System Administrator</td><td className="p-2">First responder, initiates restore</td><td className="p-2">Daniel Memuletiwon — memuletiwondaniel@gmail.com / +1 (905) 242-9978</td></tr>
                <tr><td className="p-2">Database Administrator</td><td className="p-2">Database restore, data verification</td><td className="p-2">Daniel Memuletiwon — memuletiwondaniel@gmail.com / +1 (905) 242-9978</td></tr>
                <tr><td className="p-2">Supabase Support</td><td className="p-2">Infrastructure-level issues</td><td className="p-2">support@supabase.io</td></tr>
                <tr><td className="p-2">IT Security Lead</td><td className="p-2">Security incident coordination</td><td className="p-2">Daniel Memuletiwon — memuletiwondaniel@gmail.com / +1 (905) 242-9978</td></tr>
                <tr><td className="p-2">Business Owner</td><td className="p-2">Incident communication, RTO decisions</td><td className="p-2">Daniel Memuletiwon — memuletiwondaniel@gmail.com / +1 (905) 242-9978</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">Primary contact: Daniel Memuletiwon. Update additional contacts as your team grows.</p>
        </div>
      ),
    },
    {
      id: 'verification',
      title: 'Post-Recovery Verification Checklist',
      icon: CheckCircle,
      content: (
        <div className="space-y-2">
          {[
            'All users can authenticate (login/logout)',
            'RLS policies are enforced (tenant isolation verified)',
            'Critical tables have expected row counts',
            'File uploads and downloads work (Storage buckets)',
            'Edge functions respond correctly',
            'Audit logging is recording new events',
            'Session timeout is enforced',
            'Brute-force protection is active',
            'Email notifications are sending',
            'Dashboard data loads correctly',
            'PSSR workflows can be created and approved',
            'Incident documented in audit log and communicated to stakeholders',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/30">
              <div className="w-5 h-5 rounded border border-border flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-mono">{i + 1}</span>
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'drill-schedule',
      title: 'Restore Drill Schedule',
      icon: FileText,
      content: (
        <div className="space-y-3 text-xs text-muted-foreground">
          <p>Conduct restore drills quarterly to ensure backups are restorable and the team is prepared:</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-2 font-medium">Quarter</th>
                  <th className="text-left p-2 font-medium">Drill Type</th>
                  <th className="text-left p-2 font-medium">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-2">Q1</td><td className="p-2">Full database restore</td><td className="p-2">Restore daily backup to staging</td></tr>
                <tr><td className="p-2">Q2</td><td className="p-2">PITR restore</td><td className="p-2">Point-in-time recovery to specific timestamp</td></tr>
                <tr><td className="p-2">Q3</td><td className="p-2">Application rollback</td><td className="p-2">Revert to previous Git commit</td></tr>
                <tr><td className="p-2">Q4</td><td className="p-2">Full disaster simulation</td><td className="p-2">Complete restore from scratch</td></tr>
              </tbody>
            </table>
          </div>
          <p>After each drill, document findings and update this runbook with any improvements.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Disaster Recovery Runbook" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Disaster Recovery Runbook
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Step-by-step procedures for backup verification and incident recovery
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Last reviewed: Update after each drill
          </Badge>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-3 max-w-3xl">
        {sections.map(section => {
          const isOpen = openSections.includes(section.id);
          const Icon = section.icon;
          return (
            <Collapsible key={section.id} open={isOpen} onOpenChange={() => toggleSection(section.id)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm">{section.title}</CardTitle>
                        {section.badge && (
                          <Badge variant={section.badgeVariant || 'default'} className="text-[10px]">
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    {section.content}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default DisasterRecoveryRunbook;
