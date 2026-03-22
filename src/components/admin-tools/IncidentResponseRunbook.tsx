import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Shield, Phone, Mail, Clock, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

interface IncidentResponseRunbookProps {
  onBack: () => void;
}

const severityLevels = [
  {
    level: 'P1 — Critical',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    responseTime: '15 minutes',
    description: 'Complete system outage, data breach confirmed, or active security incident affecting all tenants.',
    examples: ['Database unreachable', 'Confirmed data exfiltration', 'Authentication system failure', 'RLS bypass detected'],
    actions: [
      'Immediately notify Primary Contact and all stakeholders',
      'Activate war room (video call link in contacts)',
      'Isolate affected systems — revoke compromised credentials',
      'Engage Supabase support (if infrastructure-related)',
      'Begin forensic evidence collection (audit logs, access logs)',
      'Draft external communication if customer data affected',
    ],
  },
  {
    level: 'P2 — High',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    responseTime: '1 hour',
    description: 'Partial system degradation, suspected security incident, or single-tenant data access anomaly.',
    examples: ['Single tenant experiencing data visibility issues', 'Spike in failed authentication attempts', 'Edge function failures affecting workflows', 'Suspicious API key usage pattern'],
    actions: [
      'Notify Primary Contact within 1 hour',
      'Review audit logs for anomalous activity',
      'Suspend affected API keys or user accounts if warranted',
      'Assess blast radius — determine affected tenants/users',
      'Apply temporary mitigation (feature flag disable, rate limit)',
    ],
  },
  {
    level: 'P3 — Medium',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    responseTime: '4 hours',
    description: 'Non-critical functionality impaired, performance degradation, or minor security finding.',
    examples: ['Slow query performance on reports', 'Non-critical module error', 'Stale session not timing out', 'Minor UI security finding'],
    actions: [
      'Log incident in audit trail',
      'Assess impact and root cause',
      'Schedule fix in next deployment cycle',
      'Notify stakeholders via standard channels',
    ],
  },
  {
    level: 'P4 — Low',
    color: 'bg-muted text-muted-foreground',
    responseTime: '24 hours',
    description: 'Cosmetic issues, documentation gaps, or informational security observations.',
    examples: ['UI inconsistency', 'Documentation outdated', 'Non-exploitable code smell', 'Feature request from security review'],
    actions: [
      'Log in issue tracker',
      'Prioritize in next sprint',
      'No immediate action required',
    ],
  },
];

const IncidentResponseRunbook: React.FC<IncidentResponseRunbookProps> = ({ onBack }) => {
  const [expandedSeverity, setExpandedSeverity] = useState<number | null>(0);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Incident Response Runbook" favoritePath="/admin-tools/incident-response" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Incident Response Runbook</h1>
              <p className="text-sm text-muted-foreground">Severity classification, escalation paths, and response procedures</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            ORIP Mandatory
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">

          {/* Response Flow */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Incident Response Lifecycle</h2>
              <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs text-center">
                Detection → Triage → Containment → Eradication → Recovery → Post-Mortem
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                All incidents follow this standardized lifecycle. Each phase is logged in the audit trail.
                The response SLA is determined by severity classification at the Triage phase.
              </p>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-2.5 text-left font-medium text-foreground">Role</th>
                      <th className="px-4 py-2.5 text-left font-medium text-foreground">Contact</th>
                      <th className="px-4 py-2.5 text-left font-medium text-foreground">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="px-4 py-2.5 font-medium text-foreground">Primary — Admin / DBA / Security</td>
                      <td className="px-4 py-2.5 text-muted-foreground">System Administrator</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> Configure in admin settings
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> Configure in admin settings
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-t border-border bg-muted/30">
                      <td className="px-4 py-2.5 font-medium text-foreground">Supabase Support</td>
                      <td className="px-4 py-2.5 text-muted-foreground">Infrastructure issues only</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">Supabase Dashboard → Support</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Severity Levels — Interactive */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Severity Classification & Response SLAs
            </h2>
            <div className="space-y-3">
              {severityLevels.map((sev, i) => (
                <Card key={i} className="overflow-hidden">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedSeverity(expandedSeverity === i ? null : i)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedSeverity === i ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Badge variant="outline" className={sev.color}>
                            {sev.level}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{sev.description}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-4">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{sev.responseTime}</span>
                        </div>
                      </div>
                    </CardHeader>
                  </button>
                  {expandedSeverity === i && (
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">Example Scenarios</p>
                        <div className="flex flex-wrap gap-2">
                          {sev.examples.map((ex, j) => (
                            <Badge key={j} variant="secondary" className="text-xs">{ex}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">Response Actions</p>
                        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                          {sev.actions.map((action, j) => (
                            <li key={j}>{action}</li>
                          ))}
                        </ol>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Containment Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Built-In Containment Capabilities</CardTitle>
              <CardDescription>Actions available in the platform to contain an active incident</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { action: 'Suspend User Account', tool: 'User Offboarding → Suspend', available: true },
                  { action: 'Revoke All API Keys', tool: 'API Key Management → Deactivate', available: true },
                  { action: 'Disable SSO Provider', tool: 'SSO Configuration → Toggle Off', available: true },
                  { action: 'Disable Tenant Module', tool: 'Feature Flags → Toggle Off', available: true },
                  { action: 'Export Audit Evidence', tool: 'Audit Log Viewer → Export', available: true },
                  { action: 'Force Session Logout', tool: 'Session Timeout → Set to 1 min', available: true },
                  { action: 'Database Point-in-Time Restore', tool: 'Supabase Dashboard → Backups', available: true },
                  { action: 'Rate Limit Enforcement', tool: 'API Key → Reduce rate limit', available: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.tool}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Post-Mortem Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Post-Mortem Template</CardTitle>
              <CardDescription>Standard structure for incident post-mortem documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2 font-mono">
                <p className="text-foreground font-medium">## Incident Post-Mortem</p>
                <p className="text-muted-foreground">**Date:** [YYYY-MM-DD]</p>
                <p className="text-muted-foreground">**Severity:** [P1/P2/P3/P4]</p>
                <p className="text-muted-foreground">**Duration:** [Start → End]</p>
                <p className="text-muted-foreground">**Impact:** [Users/tenants affected, data scope]</p>
                <p className="text-muted-foreground">**Root Cause:** [Technical root cause]</p>
                <p className="text-muted-foreground">**Timeline:** [Chronological event log]</p>
                <p className="text-muted-foreground">**Corrective Actions:** [What was fixed]</p>
                <p className="text-muted-foreground">**Preventive Actions:** [What changes prevent recurrence]</p>
                <p className="text-muted-foreground">**Audit Log References:** [Link to audit entries]</p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground py-6 border-t border-border">
            <p>This runbook is aligned with SOC 2 and ISO 27001 incident management requirements.</p>
            <p>Review and test quarterly alongside tabletop exercises.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentResponseRunbook;
