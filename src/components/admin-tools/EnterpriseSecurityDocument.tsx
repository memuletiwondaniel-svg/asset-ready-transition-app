import React from 'react';
import { ArrowLeft, Shield, CheckCircle, FileText, Lock, Users, Database, Globe, Key, Activity, Server, Flag, MonitorCheck, RefreshCw, Container } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

interface EnterpriseSecurityDocumentProps {
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

const StatusTable: React.FC<{ rows: { label: string; value: string; status: 'active' | 'configured' | 'info' }[] }> = ({ rows }) => (
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
                'bg-muted text-muted-foreground'
              }>
                {row.status === 'active' ? '✅ Active' : row.status === 'configured' ? '✅ Configured' : 'ℹ️ Info'}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EnterpriseSecurityDocument: React.FC<EnterpriseSecurityDocumentProps> = ({ onBack }) => {
  const tocItems = [
    { id: 'auth', label: 'Authentication & Identity' },
    { id: 'rbac', label: 'Role-Based Access Control' },
    { id: 'multitenancy', label: 'Multi-Tenancy & Isolation' },
    { id: 'sessions', label: 'Session & Brute-Force Protection' },
    { id: 'lifecycle', label: 'User Lifecycle Management' },
    { id: 'api-security', label: 'API & Webhook Security' },
    { id: 'audit', label: 'Audit Logging & Compliance' },
    { id: 'data-protection', label: 'Data Protection' },
    { id: 'backup-dr', label: 'Backup & Disaster Recovery' },
    { id: 'change-mgmt', label: 'Change Management & Deployment' },
    { id: 'feature-flags', label: 'Tenant Feature Flags' },
    { id: 'sso', label: 'Single Sign-On (SSO)' },
    { id: 'db-security', label: 'Database Security' },
    { id: 'compliance', label: 'Enterprise Compliance Summary' },
    { id: 'portability', label: 'Architecture Portability & Data Sovereignty' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Enterprise Security Document" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                ORSH Enterprise Security & Compliance
              </h1>
              <p className="text-sm text-muted-foreground">Living document — automatically updated as the platform evolves</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            v1.0 — March 2026
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">

          {/* Executive Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Executive Summary</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Operations Readiness & Start-up Hub (ORSH) is a multi-tenant, enterprise-grade web application 
                for managing complex operational readiness workflows in the oil & gas sector. This document details 
                the security architecture, data protection measures, and change management processes ensuring ORSH 
                meets enterprise requirements for <strong className="text-foreground">confidentiality</strong>, <strong className="text-foreground">integrity</strong>, <strong className="text-foreground">availability</strong>, and <strong className="text-foreground">compliance</strong>.
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
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="text-sm text-primary hover:underline py-1 flex items-center gap-2"
                  >
                    <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                    {item.label}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 1. Authentication */}
          <Section id="auth" icon={<Lock className="h-5 w-5 text-primary" />} title="1. Authentication & Identity Management">
            <p>ORSH supports multiple authentication methods for enterprise flexibility:</p>
            <StatusTable rows={[
              { label: 'Email/Password', value: 'Standard credential-based login with server-side validation', status: 'active' },
              { label: 'SAML 2.0 SSO', value: 'Enterprise SSO via Supabase SAML integration', status: 'active' },
              { label: 'OIDC SSO', value: 'OpenID Connect for compatible identity providers', status: 'active' },
              { label: 'Two-Factor Auth (2FA)', value: 'TOTP-based with authenticator apps + 8 single-use backup codes', status: 'active' },
            ]} />
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-sm space-y-2">
                <p className="font-medium text-foreground">Password Security</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Server-side bcrypt hashing managed by Supabase Auth</li>
                  <li>Admin-initiated password resets via secure, time-limited tokens (1-hour expiry)</li>
                  <li>Expired/used tokens automatically cleaned up</li>
                  <li>Temporary passwords cleared from database after use</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 2. RBAC */}
          <Section id="rbac" icon={<Users className="h-5 w-5 text-primary" />} title="2. Role-Based Access Control (RBAC)">
            <p>ORSH implements a granular, permission-based RBAC system with three layers:</p>
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs">
              <div>Roles (roles table)</div>
              <div className="pl-4">└── Role Permissions (role_permissions → app_permission enum)</div>
              <div className="pl-8">└── User Assignment (profiles.role → roles.id)</div>
            </div>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-destructive">Critical Security Principle</p>
                <p>Roles are stored in a dedicated <code className="bg-muted px-1 rounded">user_roles</code> table — <strong>never</strong> on the user profile directly — preventing privilege escalation attacks.</p>
              </CardContent>
            </Card>
            <p className="font-medium text-foreground">Permission Matrix</p>
            <StatusTable rows={[
              { label: 'create_project', value: 'Create new projects', status: 'active' },
              { label: 'create_vcr', value: 'Create Vendor Completion Reports', status: 'active' },
              { label: 'create_pssr', value: 'Create Pre-Startup Safety Reviews', status: 'active' },
              { label: 'approve_pssr', value: 'Overall PSSR approval (Engr. Manager Asset only)', status: 'active' },
              { label: 'approve_sof', value: 'Statement of Fitness approval', status: 'active' },
              { label: 'manage_users', value: 'User administration', status: 'active' },
              { label: 'access_admin', value: 'Admin tools access', status: 'active' },
              { label: 'view_reports', value: 'Director-level reporting', status: 'active' },
              { label: 'create_ora_plan', value: 'ORA Plan creation', status: 'active' },
              { label: 'manage_p2a / manage_orm', value: 'P2A Handover & ORM Plan management', status: 'active' },
            ]} />
            <p className="font-medium text-foreground mt-4">Server-Side Enforcement</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="bg-muted px-1 rounded text-xs">has_permission()</code> — Checks user permission via security-definer function</li>
              <li><code className="bg-muted px-1 rounded text-xs">user_is_admin()</code> — Validates admin status server-side only</li>
              <li><code className="bg-muted px-1 rounded text-xs">get_user_permissions()</code> — Returns all permissions for a user</li>
              <li>Edge functions independently verify caller's admin role before processing</li>
            </ul>
          </Section>

          <Separator />

          {/* 3. Multi-Tenancy */}
          <Section id="multitenancy" icon={<Globe className="h-5 w-5 text-primary" />} title="3. Multi-Tenancy & Data Isolation">
            <p>ORSH uses an SAP-style row-level multi-tenancy pattern ensuring complete data isolation between organizations.</p>
            <StatusTable rows={[
              { label: 'Tenant Column', value: 'tenant_id on all core tables (profiles, projects, plans, tasks)', status: 'configured' },
              { label: 'Row Level Security', value: 'RLS policies enforce isolation at the database level', status: 'active' },
              { label: 'Auto Tenant Stamping', value: 'set_tenant_id_from_user() trigger on every insert', status: 'active' },
              { label: 'Subdomain Resolution', value: 'Tenant resolved from subdomain (e.g., bgc.orsh.app) before login', status: 'active' },
              { label: 'Mismatch Detection', value: 'Warning when profile tenant ≠ subdomain tenant', status: 'active' },
            ]} />
          </Section>

          <Separator />

          {/* 4. Sessions */}
          <Section id="sessions" icon={<MonitorCheck className="h-5 w-5 text-primary" />} title="4. Session Management & Brute-Force Protection">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm space-y-2">
                  <p className="font-medium text-foreground">Session Timeout</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Configurable inactivity timeout (default: 30 min)</li>
                    <li>Warning notification before expiry</li>
                    <li>Automatic logout with audit log entry</li>
                    <li>Activity tracking resets timer</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm space-y-2">
                  <p className="font-medium text-foreground">Brute-Force Protection</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Progressive account lockout</li>
                    <li>Failed attempts tracked & rate-limited</li>
                    <li>All failures recorded in audit log</li>
                    <li>JWT expiry: 3600s with auto-refresh</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </Section>

          <Separator />

          {/* 5. User Lifecycle */}
          <Section id="lifecycle" icon={<Users className="h-5 w-5 text-primary" />} title="5. User Lifecycle Management">
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs text-center">
              Registration → Admin Review → Approval/Rejection → Active → Offboarding
            </div>
            <p className="font-medium text-foreground">Offboarding Workflow (<code className="bg-muted px-1 rounded text-xs">offboard_user()</code>)</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account suspension (status → inactive, account_status → suspended)</li>
              <li>All pending tasks cancelled automatically</li>
              <li>API keys deactivated</li>
              <li>Role assignments removed</li>
              <li>Full audit trail entry created</li>
            </ul>
            <p className="font-medium text-foreground mt-3">Additional Lifecycle Features</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Stale Account Detection:</strong> Automated flagging after 90+ days inactivity</li>
              <li><strong>Access Certification:</strong> Quarterly campaigns to verify permission appropriateness</li>
            </ul>
          </Section>

          <Separator />

          {/* 6. API Security */}
          <Section id="api-security" icon={<Key className="h-5 w-5 text-primary" />} title="6. API & Webhook Security">
            <p className="font-medium text-foreground">API Key Management</p>
            <StatusTable rows={[
              { label: 'Key Storage', value: 'SHA-256 hashed (never stored in plaintext)', status: 'active' },
              { label: 'Scoped Permissions', value: 'Per-key permission arrays', status: 'active' },
              { label: 'Rate Limiting', value: 'Configurable per-minute limits via check_api_rate_limit()', status: 'active' },
              { label: 'IP Restrictions', value: 'CIDR/IP allowlists per key', status: 'active' },
              { label: 'Rotation Reminders', value: 'Configurable rotation reminder periods', status: 'configured' },
              { label: 'Request Logging', value: 'All requests logged with response times, auto-cleanup at 30 days', status: 'active' },
            ]} />
            <p className="font-medium text-foreground mt-4">Webhook Security</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>HMAC signature verification for incoming webhooks</li>
              <li>Configurable signing algorithms (SHA-256, SHA-512)</li>
              <li>Per-webhook secret keys (hashed at rest)</li>
              <li>Source system tracking</li>
            </ul>
          </Section>

          <Separator />

          {/* 7. Audit Logging */}
          <Section id="audit" icon={<Activity className="h-5 w-5 text-primary" />} title="7. Audit Logging & Compliance">
            <p>Every audit entry captures <strong className="text-foreground">who</strong>, <strong className="text-foreground">what</strong>, <strong className="text-foreground">when</strong>, <strong className="text-foreground">where</strong>, and <strong className="text-foreground">how</strong> with full JSON diffs of old/new values.</p>
            <StatusTable rows={[
              { label: 'Authentication Events', value: 'Login success/failure, logout, session timeout, SSO', status: 'active' },
              { label: 'User Management', value: 'Account creation, approval, rejection, offboarding, role changes', status: 'active' },
              { label: 'PSSR/SoF/P2A Workflows', value: 'Status changes, approver decisions with comments', status: 'active' },
              { label: 'Security Events', value: 'Failed logins, lockouts, API key operations, data exports', status: 'active' },
              { label: 'Feature Flag Changes', value: 'Automated trigger on every toggle', status: 'active' },
            ]} />
            <p className="font-medium text-foreground mt-3">Database-Triggered Auditing</p>
            <p>Critical workflows use PostgreSQL triggers for tamper-proof audit trails, including PSSR status changes, approver decisions, P2A approvals, and feature flag toggles.</p>
            <p className="font-medium text-foreground mt-3">Retention Policy</p>
            <p>Configurable retention period with automated purge via <code className="bg-muted px-1 rounded text-xs">purge_old_audit_logs()</code> and weekly <code className="bg-muted px-1 rounded text-xs">pg_cron</code> schedule.</p>
          </Section>

          <Separator />

          {/* 8. Data Protection */}
          <Section id="data-protection" icon={<Database className="h-5 w-5 text-primary" />} title="8. Data Protection">
            <p className="font-medium text-foreground">Sensitive Field Protection</p>
            <StatusTable rows={[
              { label: 'two_factor_secret', value: 'Excluded from profiles_safe view', status: 'active' },
              { label: 'two_factor_backup_codes', value: 'Excluded from profiles_safe view', status: 'active' },
              { label: 'Password hashes', value: 'Managed by Supabase Auth, never in public schema', status: 'active' },
              { label: 'temporary_password', value: 'Cleared after use; column purged of plaintext', status: 'active' },
            ]} />
            <p className="font-medium text-foreground mt-3">Data Export Controls</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sensitive fields filtered automatically from exports</li>
              <li>Maximum 10,000 records per export (prevents bulk extraction)</li>
              <li>All export actions logged in security audit log</li>
            </ul>
          </Section>

          <Separator />

          {/* 9. Backup & DR */}
          <Section id="backup-dr" icon={<Server className="h-5 w-5 text-primary" />} title="9. Backup & Disaster Recovery">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-muted/30 text-center">
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-primary">Daily</p>
                  <p className="text-xs text-muted-foreground">Automated Backups</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 text-center">
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-primary">4h</p>
                  <p className="text-xs text-muted-foreground">Recovery Time Objective</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 text-center">
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-primary">1h</p>
                  <p className="text-xs text-muted-foreground">Recovery Point Objective</p>
                </CardContent>
              </Card>
            </div>
            <p className="font-medium text-foreground">Recovery Procedure</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Access Supabase Dashboard → Backups</li>
              <li>Select most recent backup before incident</li>
              <li>Initiate restore (creates new database instance)</li>
              <li>Verify data integrity across critical tables</li>
              <li>Verify RLS policies are intact after restore</li>
              <li>Update connection strings if restored to new project</li>
            </ol>
            <p className="text-xs mt-2"><strong className="text-foreground">Primary Emergency Contact:</strong> Daniel Memuletiwon (memuletiwondaniel@gmail.com)</p>
          </Section>

          <Separator />

          {/* 10. Change Management */}
          <Section id="change-mgmt" icon={<RefreshCw className="h-5 w-5 text-primary" />} title="10. Change Management & Deployment">
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs text-center">
              BUILD (Lovable Chat) → TEST (Preview URL) → VERIFY (Pre-Publish Checklist) → PUBLISH (Production)
            </div>
            <p className="font-medium text-foreground">Pre-Publish Checklist (8 items)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                'Preview tested and verified',
                'Database migration reviewed',
                'RLS policies verified',
                'Edge functions tested',
                'User permissions checked',
                'Mobile responsiveness verified',
                'No console errors',
                'Rollback plan identified',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="font-medium text-foreground mt-3">Deployment Logging</p>
            <p>Every deployment recorded with version label, deployer, release notes, changes summary, and rollback reference.</p>
            <Card className="bg-muted/30 mt-2">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-foreground">Frontend vs Backend</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li><strong>Frontend</strong> (UI, styling) — Requires explicit "Publish → Update" action</li>
                  <li><strong>Backend</strong> (edge functions, migrations) — Deploys immediately and automatically</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 11. Feature Flags */}
          <Section id="feature-flags" icon={<Flag className="h-5 w-5 text-primary" />} title="11. Tenant Feature Flags">
            <p>Per-tenant feature flags enable controlled rollouts — ship to one tenant first, verify, then enable for all.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                'ora_module', 'pssr_module', 'p2a_module', 'orm_module', 'training_module', 'ai_chat',
                'sso_enabled', 'two_factor_required', 'data_export', 'api_integration', 'advanced_reporting', 'bulk_operations',
              ].map(flag => (
                <Badge key={flag} variant="outline" className="justify-center py-1.5 text-xs font-mono">
                  {flag}
                </Badge>
              ))}
            </div>
            <p className="mt-2">All flag changes are automatically audit-logged via database trigger.</p>
          </Section>

          <Separator />

          {/* 12. SSO */}
          <Section id="sso" icon={<Shield className="h-5 w-5 text-primary" />} title="12. Single Sign-On (SSO)">
            <StatusTable rows={[
              { label: 'SAML 2.0', value: 'Per-tenant Entity ID, SSO URL, Certificate configuration', status: 'active' },
              { label: 'OIDC', value: 'OpenID Connect for compatible providers', status: 'active' },
              { label: 'Enforcement: disabled', value: 'SSO not available; email/password only', status: 'info' },
              { label: 'Enforcement: optional', value: 'SSO available alongside email/password', status: 'info' },
              { label: 'Enforcement: required', value: 'SSO mandatory; email/password disabled', status: 'info' },
            ]} />
            <p className="mt-2">Branded login screens use subdomain resolution to display tenant-specific SSO buttons.</p>
          </Section>

          <Separator />

          {/* 13. Database Security */}
          <Section id="db-security" icon={<Database className="h-5 w-5 text-primary" />} title="13. Database Security Architecture">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>RLS enabled on all tables</strong> containing user or tenant data</li>
              <li>Policies use <code className="bg-muted px-1 rounded text-xs">security definer</code> functions to prevent recursive evaluation</li>
              <li>All views use <code className="bg-muted px-1 rounded text-xs">security_invoker = true</code></li>
              <li>Edge functions validate JWT and verify admin role server-side</li>
              <li>Service role key used only server-side; never exposed to the client</li>
            </ul>
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs mt-3">
              <div>Client (anon key) → RLS Policy → Tenant Filter → Data</div>
              <div className="pl-16 mt-1">↓</div>
              <div className="pl-4">Security Definer Function → user_roles / role_permissions</div>
            </div>
          </Section>

          <Separator />

          {/* 14. Compliance Summary */}
          <Section id="compliance" icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} title="14. Enterprise Compliance Summary">
            <StatusTable rows={[
              { label: 'Authentication', value: 'Email/password, SAML SSO, OIDC, 2FA', status: 'active' },
              { label: 'Authorization', value: 'Granular RBAC with permission matrix', status: 'active' },
              { label: 'Multi-Tenancy', value: 'Row-level isolation with RLS', status: 'active' },
              { label: 'Audit Trail', value: 'Comprehensive, database-triggered, immutable', status: 'active' },
              { label: 'Session Security', value: 'Configurable timeout, brute-force protection', status: 'active' },
              { label: 'API Security', value: 'Hashed keys, rate limiting, IP restrictions', status: 'active' },
              { label: 'Webhook Security', value: 'HMAC signature verification', status: 'active' },
              { label: 'Data Protection', value: 'Sensitive field filtering, safe views', status: 'active' },
              { label: 'Backup & Recovery', value: 'Daily backups, DR runbook (RTO: 4h, RPO: 1h)', status: 'active' },
              { label: 'Change Management', value: 'Pre-publish checklist, deployment logging', status: 'active' },
              { label: 'Feature Flags', value: 'Per-tenant controlled rollouts', status: 'active' },
              { label: 'SSO', value: 'SAML 2.0 / OIDC with per-tenant enforcement', status: 'active' },
              { label: 'User Lifecycle', value: 'Registration → Approval → Active → Offboarding', status: 'active' },
              { label: 'Access Reviews', value: 'Quarterly access certification campaigns', status: 'active' },
              { label: 'Data Retention', value: 'Configurable audit log retention with auto-purge', status: 'active' },
              { label: 'Encryption', value: 'TLS in transit, encryption at rest (Supabase)', status: 'active' },
            ]} />
          </Section>

          <Separator />

          {/* 15. Architecture Portability & Data Sovereignty */}
          <Section id="portability" icon={<Container className="h-5 w-5 text-primary" />} title="15. Architecture Portability & Data Sovereignty">
            <p>ORSH is built on a <strong className="text-foreground">100% open-source, standards-based</strong> technology stack with zero proprietary lock-in. Every component can be exported, migrated, or self-hosted.</p>

            <p className="font-medium text-foreground mt-3">Data Ownership & Export</p>
            <StatusTable rows={[
              { label: 'Database Engine', value: 'Standard PostgreSQL — fully owned, exportable via pg_dump', status: 'active' },
              { label: 'Connection Strings', value: 'Standard PostgreSQL connection URI available for any client', status: 'active' },
              { label: 'Data Export', value: 'Admin CSV/JSON export + full pg_dump for complete backup', status: 'active' },
              { label: 'Schema Portability', value: 'All migrations stored as SQL files — apply to any PostgreSQL instance', status: 'active' },
            ]} />

            <p className="font-medium text-foreground mt-4">Hosting Flexibility</p>
            <StatusTable rows={[
              { label: 'Current Hosting', value: 'Supabase Cloud (AWS infrastructure)', status: 'active' },
              { label: 'Cloud Migration', value: 'Portable to AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL', status: 'configured' },
              { label: 'Self-Hosted (Docker)', value: 'Official Supabase Docker images for all backend services', status: 'configured' },
              { label: 'On-Premises', value: 'Full on-prem deployment via Docker Compose or Kubernetes', status: 'configured' },
            ]} />

            <p className="font-medium text-foreground mt-4">Regional Data Residency — Middle East</p>
            <StatusTable rows={[
              { label: 'AWS Bahrain', value: 'me-south-1 — Available for PostgreSQL, Storage, and Edge Functions', status: 'configured' },
              { label: 'AWS UAE', value: 'me-central-1 — Available for regional data residency requirements', status: 'configured' },
              { label: 'Compliance', value: 'Data sovereignty requirements met via regional hosting selection', status: 'info' },
            ]} />

            <p className="font-medium text-foreground mt-4">Kubernetes & Containerization</p>
            <StatusTable rows={[
              { label: 'Frontend', value: 'Static build served via Nginx container — standard K8s Deployment', status: 'configured' },
              { label: 'API Gateway', value: 'PostgREST container — auto-generates REST API from PostgreSQL schema', status: 'configured' },
              { label: 'Authentication', value: 'GoTrue container — handles auth, JWT, SSO independently', status: 'configured' },
              { label: 'Realtime', value: 'Supabase Realtime container — WebSocket subscriptions', status: 'configured' },
              { label: 'Storage', value: 'Supabase Storage container — S3-compatible object storage', status: 'configured' },
              { label: 'Helm Charts', value: 'Community-maintained Helm charts available for K8s orchestration', status: 'info' },
            ]} />

            <p className="font-medium text-foreground mt-4">Zero Vendor Lock-In</p>
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="pt-4 text-sm space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong className="text-foreground">Frontend:</strong> React 18 + TypeScript + Vite + Tailwind — runs anywhere Node.js runs</li>
                  <li><strong className="text-foreground">Backend:</strong> PostgreSQL + Deno Edge Functions — portable to any PostgreSQL host and Deno runtime</li>
                  <li><strong className="text-foreground">Source Code:</strong> Full GitHub repository — clone and deploy independently at any time</li>
                  <li><strong className="text-foreground">No Proprietary Components:</strong> Every library and service used is open-source or has open standards-based alternatives</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground py-6 border-t border-border">
            <p>This is a living document maintained within the ORSH platform.</p>
            <p>Review and update quarterly alongside Access Certification Campaign cycles.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseSecurityDocument;
