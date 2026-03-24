import React, { useRef } from 'react';
import { ArrowLeft, Shield, CheckCircle, FileText, Lock, Users, Database, Globe, Key, Activity, Server, Flag, MonitorCheck, RefreshCw, Container, AlertTriangle, Target, ShieldCheck, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import DocumentDownloadButton from './DocumentDownloadButton';

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

const StatusTable: React.FC<{ rows: { label: string; value: string; status: 'active' | 'configured' | 'info' | 'roadmap' }[] }> = ({ rows }) => (
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
                row.status === 'roadmap' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                'bg-muted text-muted-foreground'
              }>
                {row.status === 'active' ? '✅ Active' : row.status === 'configured' ? '✅ Configured' : row.status === 'roadmap' ? '🔶 Roadmap' : 'ℹ️ Info'}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EnterpriseSecurityDocument: React.FC<EnterpriseSecurityDocumentProps> = ({ onBack }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const tocItems = [
    { id: 'march-2026-hardening', label: 'March 2026 Security Hardening' },
    { id: 'auth', label: 'Authentication & Identity' },
    { id: 'rbac', label: 'Role-Based Access Control' },
    { id: 'multitenancy', label: 'Multi-Tenancy & Isolation' },
    { id: 'sessions', label: 'Session & Brute-Force Protection' },
    { id: 'lifecycle', label: 'User Lifecycle Management' },
    { id: 'api-security', label: 'API & Webhook Security' },
    { id: 'audit', label: 'Audit Logging & Compliance' },
    { id: 'data-protection', label: 'Data Protection' },
    { id: 'ai-security', label: 'AI Agent Security & Guardrails' },
    { id: 'backup-dr', label: 'Backup & Disaster Recovery' },
    { id: 'change-mgmt', label: 'Change Management & Deployment' },
    { id: 'feature-flags', label: 'Tenant Feature Flags' },
    { id: 'sso', label: 'Single Sign-On (SSO)' },
    { id: 'db-security', label: 'Database Security' },
    { id: 'compliance', label: 'Enterprise Compliance Summary' },
    { id: 'portability', label: 'Architecture Portability & Data Sovereignty' },
    { id: 'architecture-readiness', label: 'Enterprise SaaS Architecture Readiness' },
    { id: 'security-controls', label: 'Security Controls & Hardening' },
    { id: 'compliance-roadmap', label: 'Compliance Certifications & ORIP Roadmap' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Enterprise Security Document" favoritePath="/admin-tools/security-document" />
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
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground/70" />
                <span className="text-xs text-muted-foreground/70">Last updated: 24 March 2026 — Security hardening complete, Claude migration security reviewed</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DocumentDownloadButton contentRef={contentRef} fileName="ORSH-Enterprise-Security-Compliance" />
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              v4.0 — March 2026
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={contentRef}>
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
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                As ORSH evolves into <strong className="text-foreground">ORIP (Operational Readiness Intelligence Platform)</strong>, this document 
                also identifies architecture and compliance gaps — marked with <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 mx-1 text-xs">🔶 Roadmap</Badge> — 
                that are mandatory for enterprise procurement readiness, including SOC 2 Type II, ISO 27001, and penetration testing.
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

          {/* March 2026 Security Hardening Summary — NEW */}
          <Section id="march-2026-hardening" icon={<ShieldCheck className="h-5 w-5 text-emerald-500" />} title="March 2026 Security Hardening — Summary">
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="pt-4 text-sm">
                <p className="text-muted-foreground">The following security hardening was applied to ORSH in March 2026. All items have been verified and confirmed resolved.</p>
              </CardContent>
            </Card>

            <div className="space-y-4 mt-4">
              {/* 1. 2FA Secrets */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">1. Two-Factor Authentication Secrets Secured</p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✅ RESOLVED</Badge>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><code className="bg-muted px-1 rounded text-xs">profiles_safe</code> view created — <code className="bg-muted px-1 rounded text-xs">two_factor_secret</code>, <code className="bg-muted px-1 rounded text-xs">two_factor_backup_codes</code>, <code className="bg-muted px-1 rounded text-xs">temporary_password</code> excluded</li>
                    <li>Column-level SELECT revoked for sensitive authentication fields</li>
                    <li><code className="bg-muted px-1 rounded text-xs">temporary_password</code> column purge trigger added — cleared after first use</li>
                  </ul>
                </CardContent>
              </Card>

              {/* 2. OAuth Tokens */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">2. Microsoft OAuth Tokens Encrypted</p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✅ RESOLVED</Badge>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>OAuth tokens no longer stored in plaintext</li>
                    <li>Access tokens: no longer persisted to database</li>
                    <li>Refresh tokens: encrypted AES-256-GCM at rest via Supabase Vault</li>
                  </ul>
                </CardContent>
              </Card>

              {/* 3. Unauthenticated Access */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">3. Unauthenticated Data Access Closed</p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✅ RESOLVED</Badge>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>43 previously open SELECT policies now require authentication</li>
                    <li>All operational tables (projects, pssrs, orp_plans, p2a_handover_plans) confirmed requiring <code className="bg-muted px-1 rounded text-xs">auth.uid() IS NOT NULL</code></li>
                    <li>Zero <code className="bg-muted px-1 rounded text-xs">USING(true)</code> SELECT policies on operational data</li>
                  </ul>
                </CardContent>
              </Card>

              {/* 4. Email Protection */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">4. Email Addresses Protected</p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✅ RESOLVED</Badge>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>All tables containing email columns require <code className="bg-muted px-1 rounded text-xs">auth.uid() IS NOT NULL</code></li>
                    <li>Tenant isolation enforced: <code className="bg-muted px-1 rounded text-xs">tenant_id = (select auth.jwt()-&gt;&gt;'tenant_id')</code></li>
                  </ul>
                </CardContent>
              </Card>

              {/* 5. RLS Performance */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">5. RLS Performance Hardening</p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✅ RESOLVED</Badge>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>All 416+ RLS policies updated to use <code className="bg-muted px-1 rounded text-xs">(select auth.uid())</code> subquery pattern</li>
                    <li>Evaluated once per query not per row — significant performance improvement at scale</li>
                    <li>Zero bare <code className="bg-muted px-1 rounded text-xs">auth.uid()</code> calls remaining</li>
                  </ul>
                </CardContent>
              </Card>

              {/* 6. .env File */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">6. .env File Removed from GitHub</p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✅ RESOLVED</Badge>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>.env file deleted from public GitHub repository</li>
                    <li>.env added to .gitignore</li>
                    <li>.env.example created with placeholder values</li>
                    <li>README security note added</li>
                  </ul>
                </CardContent>
              </Card>

              {/* 7. Anthropic API Key */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">7. Anthropic API Key Security</p>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">✅ ACTIVE</Badge>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>ANTHROPIC_API_KEY stored as Supabase Edge Function secret — never exposed in frontend</li>
                    <li>API key never included in any log output, error message or API response</li>
                    <li>SSE output format verified — no key leakage through streaming</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </Section>

          <Separator />

          {/* 1. Authentication — enhanced with explicit IdP callouts */}
          <Section id="auth" icon={<Lock className="h-5 w-5 text-primary" />} title="1. Authentication & Identity Management">
            <p>ORSH supports multiple authentication methods for enterprise flexibility:</p>
            <StatusTable rows={[
              { label: 'Email/Password', value: 'Standard credential-based login with server-side validation', status: 'active' },
              { label: 'SAML 2.0 SSO', value: 'Enterprise SSO — compatible with Azure AD / Entra ID, Okta, SAP IAM, and any SAML 2.0 IdP', status: 'active' },
              { label: 'OIDC SSO', value: 'OpenID Connect — compatible with Entra ID, Okta, Google Workspace, and any OIDC-compliant provider', status: 'active' },
              { label: 'Two-Factor Auth (2FA)', value: 'TOTP-based with authenticator apps + 8 single-use backup codes', status: 'active' },
            ]} />
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-sm space-y-2">
                <p className="font-medium text-foreground">Password Security</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Server-side bcrypt hashing managed by Supabase Auth</li>
                  <li><strong className="text-foreground">Leaked password protection enabled</strong> — prevents users from setting passwords found in known breach databases (HaveIBeenPwned integration via Supabase Auth)</li>
                  <li>Admin-initiated password resets via secure, time-limited tokens (1-hour expiry)</li>
                  <li><strong className="text-foreground">OTP expiry hardened to 600 seconds (10 minutes)</strong> — reduced from default to minimize token replay window</li>
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

          {/* 3. Multi-Tenancy — enhanced with Data Segregation and API Isolation */}
          <Section id="multitenancy" icon={<Globe className="h-5 w-5 text-primary" />} title="3. Multi-Tenancy & Data Isolation">
            <p>ORSH uses an SAP-style row-level multi-tenancy pattern ensuring complete data isolation between organizations.</p>
            <StatusTable rows={[
              { label: 'Tenant Column', value: 'tenant_id on all core tables (profiles, projects, plans, tasks)', status: 'configured' },
              { label: 'Row Level Security', value: 'RLS policies enforce isolation at the database level', status: 'active' },
              { label: 'Auto Tenant Stamping', value: 'set_tenant_id_from_user() trigger on every insert', status: 'active' },
              { label: 'Subdomain Resolution', value: 'Tenant resolved from subdomain (e.g., bgc.orsh.app) before login', status: 'active' },
              { label: 'Mismatch Detection', value: 'Warning when profile tenant ≠ subdomain tenant', status: 'active' },
              { label: 'Data Segregation', value: 'Complete data isolation enforced at PostgreSQL RLS level — not UI filtering. Each tenant\'s data is invisible to other tenants at the query engine layer.', status: 'active' },
              { label: 'API Isolation per Tenant', value: 'All API requests scoped to tenant via RLS + JWT claims; API keys are tenant-bound with independent rate limits and IP restrictions', status: 'active' },
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

          {/* 9. AI Agent Security */}
          <Section id="ai-security" icon={<ShieldCheck className="h-5 w-5 text-primary" />} title="9. AI Agent Security & Guardrails">
            <p>The AI CoPilot (Bob) operates within strict security boundaries to prevent data leakage, prompt injection, and unauthorized access.</p>
            <StatusTable rows={[
              { label: 'RLS-Aware Queries', value: 'All AI database queries execute through the Supabase client with user JWT — RLS policies enforced at query level', status: 'active' },
              { label: 'Tenant Isolation', value: 'AI agents cannot access cross-tenant data — enforced by database RLS, not application logic', status: 'active' },
              { label: 'Tool-Based Access', value: 'AI uses predefined tool functions (13 tools) — no raw SQL or arbitrary query generation', status: 'active' },
              { label: 'Prompt Injection Prevention', value: 'System prompts are versioned and hashed; user input is never interpolated into system context', status: 'active' },
              { label: 'Feedback Audit Trail', value: 'All user feedback, corrections, and AI responses logged with conversation_id for traceability', status: 'active' },
              { label: 'Auto-Apply Guardrails', value: 'Only low-risk, non-high-priority prompt improvements are auto-applied; high-impact changes require human review', status: 'active' },
              { label: 'Edge Case Catalog', value: 'Hallucinations and tool failures cataloged in ai_edge_cases with severity classification and regression testing', status: 'active' },
              { label: 'Context Persistence', value: 'User preferences stored in ai_user_context — scoped to individual user_id, never shared cross-user', status: 'active' },
            ]} />
            <Card className="bg-emerald-500/5 border-emerald-500/20 mt-4">
              <CardContent className="pt-4 text-sm space-y-2">
                <p className="font-medium text-foreground">Claude Migration — March 2026</p>
                <p className="text-muted-foreground">All AI agents now call Anthropic API directly from Supabase Edge Functions using server-side secrets. The Lovable AI Gateway has been removed. Model API keys are stored as Edge Function secrets and are never accessible from client-side code. Prompt injection protection, RLS-aware queries, tenant isolation and read-only tool access all remain active.</p>
              </CardContent>
            </Card>
            <p className="font-medium text-foreground mt-4">Autonomous Training Security</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Version Control:</strong> All prompt changes tracked with before/after state in ai_training_log</li>
              <li><strong className="text-foreground">Rollback Capability:</strong> Previous prompt versions preserved for instant rollback</li>
              <li><strong className="text-foreground">Rate Limiting:</strong> Auto-apply limited to daily cron cycle — prevents rapid uncontrolled changes</li>
              <li><strong className="text-foreground">Model Access:</strong> AI model API keys stored as Edge Function secrets — never exposed to frontend</li>
            </ul>
          </Section>

          <Separator />

          {/* 10. Backup & DR */}
          <Section id="backup-dr" icon={<Server className="h-5 w-5 text-primary" />} title="10. Backup & Disaster Recovery">
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
            <p className="text-xs mt-2"><strong className="text-foreground">Primary Emergency Contact:</strong> System Administrator (configure in admin settings)</p>
          </Section>

          <Separator />

          {/* 11. Change Management — enhanced CI/CD framing */}
          <Section id="change-mgmt" icon={<RefreshCw className="h-5 w-5 text-primary" />} title="11. Change Management & CI/CD Pipeline">
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs text-center">
              BUILD (Lovable Chat) → TEST (Preview URL) → VERIFY (Pre-Publish Checklist) → PUBLISH (Production)
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              This constitutes the platform's CI/CD pipeline: code changes are built, tested in an isolated preview environment, 
              verified against an 8-point checklist, and published to production with full deployment logging and rollback capability.
            </p>
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

          {/* 12. Feature Flags */}
          <Section id="feature-flags" icon={<Flag className="h-5 w-5 text-primary" />} title="12. Tenant Feature Flags">
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

          {/* 13. SSO */}
          <Section id="sso" icon={<Shield className="h-5 w-5 text-primary" />} title="13. Single Sign-On (SSO)">
            <StatusTable rows={[
              { label: 'SAML 2.0', value: 'Per-tenant Entity ID, SSO URL, Certificate configuration', status: 'active' },
              { label: 'OIDC', value: 'OpenID Connect for compatible providers', status: 'active' },
              { label: 'Azure AD / Entra ID', value: 'Fully supported via SAML 2.0 and OIDC protocols', status: 'active' },
              { label: 'Okta', value: 'Fully supported via SAML 2.0 and OIDC protocols', status: 'active' },
              { label: 'SAP IAM', value: 'Supported via SAML 2.0 federation', status: 'configured' },
              { label: 'Enforcement: disabled', value: 'SSO not available; email/password only', status: 'info' },
              { label: 'Enforcement: optional', value: 'SSO available alongside email/password', status: 'info' },
              { label: 'Enforcement: required', value: 'SSO mandatory; email/password disabled', status: 'info' },
            ]} />
            <p className="mt-2">Branded login screens use subdomain resolution to display tenant-specific SSO buttons.</p>
          </Section>

          <Separator />

          {/* 14. Database Security */}
          <Section id="db-security" icon={<Database className="h-5 w-5 text-primary" />} title="14. Database Security Architecture">
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

            <p className="font-medium text-foreground mt-4">RLS Performance Hardening (March 2026)</p>
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="pt-4 text-sm space-y-2">
                <p className="text-muted-foreground">Two major RLS hardening migrations applied across the entire schema:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong className="text-foreground">auth.uid() subquery optimization (416 policies):</strong> All RLS policies updated to wrap <code className="bg-muted px-1 rounded text-xs">auth.uid()</code> as <code className="bg-muted px-1 rounded text-xs">(select auth.uid())</code>, telling PostgreSQL to evaluate the auth function once per query rather than once per row — significant performance improvement at scale.</li>
                  <li><strong className="text-foreground">Multiple permissive policy consolidation (~100 overlaps):</strong> Eliminated duplicate permissive policies across ~90 tables. ALL-command policies split into per-command (SELECT, INSERT, UPDATE, DELETE) policies. Direct duplicates consolidated using OR conditions within single policies.</li>
                  <li><strong className="text-foreground">Zero Supabase advisor warnings:</strong> Both "Auth RLS Initialization Plan" and "Multiple Permissive Policies" warnings fully resolved.</li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 15. Compliance Summary — enhanced with new rows */}
          <Section id="compliance" icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} title="15. Enterprise Compliance Summary">
            <StatusTable rows={[
              { label: 'Authentication', value: 'Email/password, SAML SSO (Entra/Okta/SAP IAM), OIDC, 2FA', status: 'active' },
              { label: 'Authorization', value: 'Granular RBAC with permission matrix', status: 'active' },
              { label: 'Multi-Tenancy', value: 'Row-level isolation with RLS + API-level tenant scoping', status: 'active' },
              { label: 'Data Segregation', value: 'Database-level isolation (not UI filtering) via PostgreSQL RLS', status: 'active' },
              { label: 'Audit Trail', value: 'Comprehensive, database-triggered, immutable', status: 'active' },
              { label: 'Session Security', value: 'Configurable timeout, brute-force protection', status: 'active' },
              { label: 'API Security', value: 'Hashed keys, rate limiting, IP restrictions', status: 'active' },
              { label: 'Webhook Security', value: 'HMAC signature verification', status: 'active' },
              { label: 'Data Protection', value: 'Sensitive field filtering, safe views', status: 'active' },
              { label: 'Backup & Recovery', value: 'Daily backups, DR runbook (RTO: 4h, RPO: 1h)', status: 'active' },
              { label: 'Change Management', value: 'CI/CD pipeline with pre-publish checklist, deployment logging', status: 'active' },
              { label: 'Feature Flags', value: 'Per-tenant controlled rollouts', status: 'active' },
              { label: 'SSO', value: 'SAML 2.0 / OIDC with per-tenant enforcement', status: 'active' },
              { label: 'User Lifecycle', value: 'Registration → Approval → Active → Offboarding', status: 'active' },
              { label: 'Access Reviews', value: 'Quarterly access certification campaigns', status: 'active' },
              { label: 'Encryption', value: 'AES-256 at rest, TLS 1.2+ in transit', status: 'active' },
              { label: 'Single-Tenant Option', value: 'Dedicated instance deployment for high-security clients', status: 'configured' },
              { label: 'Air-Gapped Deployment', value: 'Offline-capable via Docker Compose with local container registry', status: 'roadmap' },
              { label: 'SOC 2 Type II', value: 'Mandatory for ORIP — certification roadmap in progress', status: 'roadmap' },
              { label: 'ISO 27001', value: 'Mandatory for ORIP — certification path defined', status: 'roadmap' },
              { label: 'Penetration Testing', value: 'Mandatory for ORIP — annual third-party pen test schedule', status: 'roadmap' },
            ]} />
          </Section>

          <Separator />

          {/* 16. Architecture Portability & Data Sovereignty */}
          <Section id="portability" icon={<Container className="h-5 w-5 text-primary" />} title="16. Architecture Portability & Data Sovereignty">
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

          <Separator />

          {/* 17. Enterprise SaaS Architecture Readiness — NEW */}
          <Section id="architecture-readiness" icon={<Target className="h-5 w-5 text-primary" />} title="17. Enterprise SaaS Architecture Readiness">
            <p>Consolidated assessment of all enterprise architecture requirements against ORSH current state. Items marked <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 mx-1 text-xs">🔶 Roadmap</Badge> are planned for ORIP evolution.</p>

            <p className="font-medium text-foreground mt-3">ORIP Scoring & Intelligence Engine</p>
            <StatusTable rows={[
              { label: 'Readiness Ontology', value: 'VCR Item Categories (Design Integrity, Technical Integrity, Operating Integrity, Management Systems, Health & Safety) serve as tenant-configurable readiness dimensions with weights and confidence factors', status: 'active' },
              { label: 'ORI Scoring Engine', value: 'Full ORIP formula: ORI = Σ(Dimension Weight × DS_i) − Risk Penalty; Confidence-adjusted dimension scores; Risk penalty capped at 15%', status: 'active' },
              { label: 'Startup Confidence Score', value: 'SCS = ORI × Schedule Adherence × Critical Path Stability — executive decision metric with High/Moderate/High Risk/Unlikely classifications', status: 'active' },
              { label: 'Risk Penalty Engine', value: 'Severity-weighted risk deductions: Minor(0.5×), Moderate(1.0×), Major(2.0×), Startup-blocking(3.0×) — prevents inflated readiness reporting', status: 'active' },
              { label: 'Confidence Factor System', value: 'Auto-assigned: Verified/Approved=1.0, In-progress/Self-reported=0.8, Forecasted/Not-started=0.7', status: 'active' },
              { label: 'Executive Dashboard', value: 'Strategic layout: ORI/SCS banner, dimension breakdown with trends, Top 5 blockers, predictive trend chart, risk impact summary', status: 'active' },
            ]} />

            <p className="font-medium text-foreground mt-3">Identity & Access</p>
            <StatusTable rows={[
              { label: 'SSO (Azure AD / Entra ID)', value: 'SAML 2.0 + OIDC integration via Supabase Auth; per-tenant IdP configuration', status: 'active' },
              { label: 'SSO (Okta)', value: 'SAML 2.0 + OIDC integration via standard protocols', status: 'active' },
              { label: 'SSO (SAP IAM)', value: 'Supported via SAML 2.0 federation; requires customer IdP configuration', status: 'configured' },
              { label: 'RBAC', value: 'Granular permission-based RBAC with dedicated roles table and server-side enforcement', status: 'active' },
              { label: 'Role Inheritance Controls', value: 'Hierarchical role-permission model; permissions assigned per role, not per user', status: 'active' },
              { label: 'Least-Privilege Defaults', value: 'New users auto-assigned "Viewer" role with minimal permissions via database trigger; admin must explicitly grant elevated access', status: 'active' },
            ]} />

            <p className="font-medium text-foreground mt-4">Multi-Tenancy & Data</p>
            <StatusTable rows={[
              { label: 'Multi-Tenancy', value: 'SAP-style row-level tenancy with automatic tenant_id stamping via database trigger', status: 'active' },
              { label: 'Data Segregation', value: 'PostgreSQL RLS enforces tenant isolation at the query engine level — not UI-side filtering', status: 'active' },
              { label: 'API Isolation per Tenant', value: 'All API requests scoped by tenant via JWT claims + RLS; tenant-bound API keys with independent rate limits', status: 'active' },
              { label: 'Single-Tenant Deployment', value: 'Architecture supports dedicated instance per client via Docker Compose or Kubernetes — isolated DB, storage, and auth', status: 'configured' },
              { label: 'Tenant-Configurable Scoring', value: 'Each tenant can customize readiness dimension weights, confidence defaults, and risk severity multipliers independently', status: 'active' },
            ]} />

            <p className="font-medium text-foreground mt-4">Infrastructure & Deployment</p>
            <StatusTable rows={[
              { label: 'Cloud-Agnostic', value: 'Runs on AWS, Azure, GCP — standard PostgreSQL + Docker containers, no cloud-specific dependencies', status: 'configured' },
              { label: 'Containerized (Docker)', value: 'All services (API, Auth, Storage, Realtime, Frontend) run as Docker containers', status: 'configured' },
              { label: 'Kubernetes-Deployable', value: 'Standard K8s Deployments + community Helm charts; production-grade orchestration ready', status: 'configured' },
              { label: 'On-Premises Compatible', value: 'Full on-prem deployment via Docker Compose or K8s with self-hosted PostgreSQL', status: 'configured' },
              { label: 'Air-Gapped Capable', value: 'Requires offline container registry + local PostgreSQL; no external API dependencies at runtime', status: 'roadmap' },
              { label: 'Regional Data Hosting', value: 'Deployable to any region (AWS Bahrain/UAE, Azure Qatar, etc.) for data residency compliance', status: 'configured' },
            ]} />

            <p className="font-medium text-foreground mt-4">Reliability & Operations</p>
            <StatusTable rows={[
              { label: 'Disaster Recovery', value: 'Defined RPO (1h) and RTO (4h); daily automated backups with documented recovery runbook', status: 'active' },
              { label: 'CI/CD Pipeline', value: 'Build → Test (Preview) → Verify (8-point checklist) → Publish with deployment logging and rollback', status: 'active' },
              { label: 'Incident Response Process', value: 'Interactive runbook with P1-P4 severity classification, defined SLAs (15min–24h), escalation paths, and built-in containment capabilities', status: 'active' },
            ]} />
          </Section>

          <Separator />

          {/* 18. Security Controls & Hardening — NEW */}
          <Section id="security-controls" icon={<ShieldCheck className="h-5 w-5 text-primary" />} title="18. Security Controls & Hardening">
            <p>Detailed security controls addressing enterprise procurement requirements for data protection, access governance, and cryptographic standards.</p>

            <StatusTable rows={[
              { label: 'Audit Log Immutability', value: 'Audit logs written via PostgreSQL triggers with no UPDATE/DELETE policies; append-only by design. Retention purge is the only removal path (scheduled, audited).', status: 'active' },
              { label: 'Tenant Data Isolation (DB Level)', value: 'Enforced at PostgreSQL RLS layer — not application-side UI filtering. Cross-tenant queries are impossible even with direct database access using tenant-scoped credentials.', status: 'active' },
              { label: 'Encryption at Rest (AES-256)', value: 'All data encrypted at rest using AES-256 via the underlying cloud infrastructure (Supabase/AWS). Storage buckets and database volumes use AES-256 encryption.', status: 'active' },
              { label: 'Encryption in Transit (TLS 1.2+)', value: 'All client-server communication enforced via TLS 1.2+ (HTTPS). Database connections use SSL/TLS. No plaintext channels permitted.', status: 'active' },
              { label: 'Role Inheritance Controls', value: 'Permissions are assigned to roles (not users directly). Users inherit permissions from their assigned role. Role changes propagate immediately.', status: 'active' },
              { label: 'Least-Privilege Defaults', value: 'New user accounts auto-assigned "Viewer" role (view-only) via database trigger. Elevated access requires explicit admin grant with audit log entry.', status: 'active' },
              { label: 'RLS Performance Hardening', value: '416 policies optimized with (select auth.uid()) subquery pattern; ~100 duplicate permissive policy overlaps consolidated into single policies — zero Supabase advisor warnings.', status: 'active' },
              { label: 'Leaked Password Protection', value: 'Supabase Auth HaveIBeenPwned integration enabled — prevents setting passwords found in known data breaches.', status: 'active' },
              { label: 'OTP Expiry Hardening', value: 'OTP token expiry reduced to 600 seconds (10 minutes) — minimizes replay attack window for email/SMS verification codes.', status: 'active' },
            ]} />

            <Card className="bg-muted/30 mt-4">
              <CardContent className="pt-4 text-sm space-y-2">
                <p className="font-medium text-foreground">Cryptographic Standards Summary</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-xs">At Rest</p>
                      <p className="text-xs text-muted-foreground">AES-256 (database volumes, storage buckets)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-xs">In Transit</p>
                      <p className="text-xs text-muted-foreground">TLS 1.2+ (all endpoints, database connections)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-xs">API Keys</p>
                      <p className="text-xs text-muted-foreground">SHA-256 hashed, never stored in plaintext</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-xs">Passwords</p>
                      <p className="text-xs text-muted-foreground">bcrypt hashing via Supabase Auth</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          {/* 19. Compliance Certifications & ORIP Roadmap — NEW */}
          <Section id="compliance-roadmap" icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} title="19. Compliance Certifications & ORIP Roadmap">
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-foreground">⚠️ Mandatory for ORIP Enterprise Procurement</p>
                <p className="text-muted-foreground mt-1">
                  The following certifications and processes are <strong className="text-foreground">required</strong> for ORIP to be procurement-eligible 
                  by enterprise operators (ADNOC, Aramco, QatarEnergy, Shell, etc.). These are tracked as roadmap items with target timelines.
                </p>
              </CardContent>
            </Card>

            <p className="font-medium text-foreground mt-4">Certification Roadmap</p>
            <StatusTable rows={[
              { label: 'SOC 2 Type I', value: 'Point-in-time assessment of security controls design. Target: Q3 2026. Pre-requisite for Type II.', status: 'roadmap' },
              { label: 'SOC 2 Type II', value: 'Ongoing effectiveness audit over 6–12 month observation period. Target: Q2 2027. Mandatory for enterprise sales.', status: 'roadmap' },
              { label: 'ISO 27001', value: 'Information Security Management System (ISMS) certification. Target: Q4 2027. Required by Middle East NOCs.', status: 'roadmap' },
              { label: 'Penetration Testing', value: 'Annual third-party penetration test by certified firm (CREST/OSCP). First engagement target: Q2 2026.', status: 'roadmap' },
            ]} />

            <p className="font-medium text-foreground mt-4">Incident Response Process</p>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-sm space-y-3">
                <p className="text-muted-foreground">Documented incident response process aligned with SOC 2 and ISO 27001 requirements:</p>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs text-center">
                  Detection → Triage → Containment → Eradication → Recovery → Post-Mortem
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong className="text-foreground">Detection:</strong> Audit log anomaly monitoring, failed login spike alerts, API rate limit breach notifications</li>
                  <li><strong className="text-foreground">Triage:</strong> Severity classification (P1–P4) with defined response SLAs</li>
                  <li><strong className="text-foreground">Containment:</strong> Account suspension, API key revocation, tenant isolation capabilities already built</li>
                  <li><strong className="text-foreground">Recovery:</strong> DR runbook with defined RPO (1h) / RTO (4h) targets</li>
                  <li><strong className="text-foreground">Post-Mortem:</strong> Root cause analysis documented in audit log with corrective actions</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong className="text-foreground">Primary Contact:</strong> System Administrator — configure in admin settings
                </p>
              </CardContent>
            </Card>

            <p className="font-medium text-foreground mt-4">Gap Closure Recommendations</p>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-sm">
                <ol className="list-decimal pl-5 space-y-2">
                  <li><strong className="text-foreground">Formalize Least-Privilege Defaults:</strong> Implement default role template with minimal permissions for all new user registrations; require explicit elevation workflow.</li>
                  <li><strong className="text-foreground">Air-Gapped Deployment Package:</strong> Create offline installer bundle with pre-pulled Docker images, local container registry configuration, and offline documentation.</li>
                  <li><strong className="text-foreground">Engage SOC 2 Auditor:</strong> Select AICPA-accredited auditor; begin SOC 2 Type I readiness assessment targeting Q3 2026.</li>
                  <li><strong className="text-foreground">Commission Pen Test:</strong> Engage CREST-certified penetration testing firm for first annual assessment; scope: web application, API, and infrastructure.</li>
                  <li><strong className="text-foreground">ISO 27001 ISMS Foundation:</strong> Establish Information Security Management System documentation; appoint Information Security Officer; begin gap assessment against Annex A controls.</li>
                  <li><strong className="text-foreground">Incident Response SLAs:</strong> Define formal response time SLAs per severity level (P1: 15min, P2: 1h, P3: 4h, P4: 24h) and establish on-call rotation.</li>
                </ol>
              </CardContent>
            </Card>
          </Section>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground py-6 border-t border-border">
            <p>This is a living document maintained within the ORSH platform.</p>
            <p>Review and update quarterly alongside Access Certification Campaign cycles.</p>
            <p className="mt-1">Items marked <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 mx-1 text-xs">🔶 Roadmap</Badge> are mandatory for ORIP enterprise readiness and tracked in the compliance roadmap.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseSecurityDocument;
