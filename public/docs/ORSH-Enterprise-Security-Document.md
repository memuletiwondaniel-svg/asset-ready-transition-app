# ORSH Platform — Enterprise Security, Data Protection & Change Management

**Document Version:** 1.0  
**Date:** 2 March 2026  
**Classification:** Internal — Confidential  
**Prepared by:** ORSH Platform Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Authentication & Identity Management](#2-authentication--identity-management)
3. [Role-Based Access Control (RBAC)](#3-role-based-access-control-rbac)
4. [Multi-Tenancy & Data Isolation](#4-multi-tenancy--data-isolation)
5. [Session Management & Brute-Force Protection](#5-session-management--brute-force-protection)
6. [User Lifecycle Management](#6-user-lifecycle-management)
7. [API Security & Integration Protection](#7-api-security--integration-protection)
8. [Audit Logging & Compliance](#8-audit-logging--compliance)
9. [Data Protection & Sensitive Field Handling](#9-data-protection--sensitive-field-handling)
10. [Backup, Recovery & Disaster Recovery](#10-backup-recovery--disaster-recovery)
11. [Change Management & Deployment Workflow](#11-change-management--deployment-workflow)
12. [Tenant Feature Flags & Controlled Rollouts](#12-tenant-feature-flags--controlled-rollouts)
13. [Single Sign-On (SSO) Infrastructure](#13-single-sign-on-sso-infrastructure)
14. [Database Security Architecture](#14-database-security-architecture)
15. [Summary of Enterprise Compliance](#15-summary-of-enterprise-compliance)

---

## 1. Executive Summary

The Operations Readiness & Start-up Hub (ORSH) is a multi-tenant, enterprise-grade web application built for managing complex operational readiness workflows in the oil & gas sector. This document details the comprehensive security architecture, data protection measures, and change management processes that ensure ORSH meets enterprise requirements for:

- **Confidentiality** — Data isolation between tenants, encrypted connections, sensitive field protection
- **Integrity** — Immutable audit trails, server-side authorization, database-level enforcement
- **Availability** — Automated backups, disaster recovery runbook, controlled deployments
- **Compliance** — Audit logging, access certification campaigns, data retention policies

---

## 2. Authentication & Identity Management

### 2.1 Authentication Methods

| Method | Description | Status |
|--------|-------------|--------|
| **Email/Password** | Standard credential-based login with server-side validation | ✅ Active |
| **SAML 2.0 SSO** | Enterprise SSO via Supabase SAML integration | ✅ Active |
| **OIDC SSO** | OpenID Connect for compatible identity providers | ✅ Active |
| **Two-Factor Authentication (2FA)** | TOTP-based 2FA with authenticator apps (Google Authenticator, etc.) | ✅ Active |

### 2.2 Two-Factor Authentication (2FA)

- **TOTP-based** using industry-standard `otplib` library
- **QR code provisioning** for easy setup with authenticator apps
- **8 single-use backup codes** generated per user for account recovery
- **Admin-controlled disable** — administrators can reset 2FA for locked-out users
- 2FA secrets are stored securely and excluded from all public-facing views

### 2.3 Password Security

- Server-side password hashing managed by Supabase Auth (bcrypt)
- Admin-initiated password resets via secure, time-limited tokens (1-hour expiry)
- Expired and used tokens are automatically cleaned up
- Temporary passwords are cleared from the database after use

---

## 3. Role-Based Access Control (RBAC)

### 3.1 Architecture

ORSH implements a **granular, permission-based RBAC system** with three layers:

```
Roles (roles table)
  └── Role Permissions (role_permissions table → app_permission enum)
       └── User Assignment (profiles.role → roles.id)
```

**Critical security principle:** Roles are stored in a dedicated `user_roles` table and `roles` table — **never** on the user profile directly — preventing privilege escalation attacks.

### 3.2 Permission Matrix

The `app_permission` enum defines granular permissions:

| Permission | Description |
|-----------|-------------|
| `create_project` | Create new projects |
| `create_vcr` | Create Vendor Completion Reports |
| `create_pssr` | Create Pre-Startup Safety Reviews |
| `approve_pssr` | Overall PSSR approval (Engr. Manager Asset only) |
| `approve_sof` | Statement of Fitness approval |
| `manage_users` | User administration |
| `access_admin` | Admin tools access |
| `view_reports` | Director-level reporting |
| `create_ora_plan` | ORA Plan creation |
| `manage_p2a` | P2A Handover management |
| `manage_orm` | ORM Plan management |
| `create_p2a_plan` | P2A Plan creation |

### 3.3 Role Hierarchy Examples

| Role Category | Example Roles | Key Permissions |
|--------------|---------------|-----------------|
| **ORA Engineers** | ORA Engr., Snr. ORA Engr. | create_project, create_vcr, create_ora_plan |
| **Technical Authorities** | Process TA2 - Project, Electrical TA2 - Asset | Item-level review (Asset), VCR-focused (Project) |
| **Directors** | P&E Director, HSE Director | approve_sof, view_reports only |
| **Engineering Manager** | Engr. Manager Asset | approve_pssr (exclusive) |
| **Admin** | System Administrator | Full access via `user_is_admin()` function |

### 3.4 Server-Side Enforcement

All permission checks use **PostgreSQL security-definer functions** that bypass RLS to prevent recursive policy evaluation:

- `has_permission(_user_id, _permission)` — Checks if a user has a specific permission
- `user_is_admin(user_uuid)` — Validates admin status server-side
- `get_user_permissions(_user_id)` — Returns all permissions for a user

**Edge function authorization:** The `admin-create-user` edge function independently verifies the caller's admin role via the `user_roles` table before processing any request.

---

## 4. Multi-Tenancy & Data Isolation

### 4.1 Architecture Pattern

ORSH uses an **SAP-style row-level multi-tenancy** pattern:

- A `tenant_id` column exists on all core tables (profiles, projects, plans, tasks, etc.)
- **Row Level Security (RLS)** policies enforce tenant isolation at the database level
- A `security definer` function `get_user_tenant_id()` resolves the current user's organization

### 4.2 Automatic Tenant Stamping

A database trigger (`set_tenant_id_from_user`) automatically assigns the correct `tenant_id` to every new record, preventing data leakage between organizations.

### 4.3 Subdomain Resolution

Tenants are resolved from subdomains (e.g., `bgc.orsh.app`) before login, enabling:
- Branded login screens per tenant
- SSO provider auto-detection
- Tenant-specific feature flags

### 4.4 Tenant Mismatch Detection

The `TenantContext` detects and warns when a user's profile tenant doesn't match their subdomain tenant, preventing unauthorized cross-tenant access.

---

## 5. Session Management & Brute-Force Protection

### 5.1 Session Timeout

- **Configurable inactivity timeout** — Default: 30 minutes
- Automatic logout with audit log entry on timeout
- User activity tracking (mouse movement, keyboard, clicks) resets the timer
- Warning notification before session expiry

### 5.2 Brute-Force Protection

- **Progressive account lockout** via `check_account_lockout()` database function
- Failed login attempts are tracked and rate-limited
- Account lockout after repeated failures
- All failed login attempts are recorded in the audit log

### 5.3 JWT Configuration

- JWT tokens expire after 3600 seconds (1 hour) as configured in Supabase
- Automatic token refresh via Supabase client library
- Token validation on every API request

---

## 6. User Lifecycle Management

### 6.1 User Registration & Approval

```
Registration Request → Admin Review → Approval/Rejection → Account Activation
```

- Self-registration creates accounts in `awaiting authentication` status
- Admin approval required before access is granted
- Rejection with reason tracking
- Welcome email sent upon approval

### 6.2 User Offboarding

A formal offboarding workflow (`offboard_user()` function) performs:

1. ✅ Account suspension (status → inactive, account_status → suspended)
2. ✅ All pending tasks cancelled
3. ✅ API keys deactivated
4. ✅ Role assignments removed
5. ✅ Offboarding notes recorded
6. ✅ Full audit trail entry created

**Security guard:** Only users with the `admin` system role can execute offboarding.

### 6.3 Stale Account Detection

- Automated flagging of accounts inactive for 90+ days
- Visual indicators in Admin Tools for stale accounts
- Admins can review and offboard stale accounts

### 6.4 Access Certification Campaigns

- **Quarterly access reviews** — Admins certify that user permissions remain appropriate
- Campaign tracking with completion percentages
- Audit trail for all certification decisions

---

## 7. API Security & Integration Protection

### 7.1 API Key Management

| Feature | Implementation |
|---------|---------------|
| **Key Storage** | SHA-256 hashed (never stored in plaintext) |
| **Key Prefix** | First 8 characters stored for identification |
| **Scoped Permissions** | Per-key permission arrays |
| **Rate Limiting** | Configurable per-minute limits via `check_api_rate_limit()` |
| **IP Restrictions** | CIDR/IP allowlists per key |
| **Expiry** | Optional expiration dates |
| **Rotation Reminders** | Configurable rotation reminder periods |
| **Request Logging** | All API requests logged with response times, status codes |

### 7.2 Webhook Security

- **HMAC signature verification** for incoming webhooks
- Configurable signing algorithms (SHA-256, SHA-512)
- Per-webhook secret keys (hashed at rest)
- Custom signature header names
- Source system tracking

### 7.3 Request Logging

All API requests are logged in `api_request_logs`:
- Endpoint, method, status code
- Response time (ms)
- IP address and user agent
- Error messages for failed requests
- Automatic cleanup of logs older than 30 days

---

## 8. Audit Logging & Compliance

### 8.1 Comprehensive Audit Trail

ORSH maintains an immutable audit log covering:

| Category | Events Logged |
|----------|---------------|
| **Authentication** | Login success/failure, logout, session timeout, SSO authentication |
| **User Management** | Account creation, approval, rejection, offboarding, role changes |
| **PSSR Workflow** | Status changes, approver decisions (approve/reject with comments) |
| **SoF Workflow** | Approver decisions with full comment trails |
| **P2A Workflow** | Approver decisions, handover status changes |
| **Data Operations** | Profile updates, project changes, data exports |
| **Security Events** | Failed logins, account lockouts, API key operations |
| **Feature Flags** | Tenant feature flag changes (automated trigger) |

### 8.2 Audit Log Schema

Each audit entry captures:
- **Who** — `user_id`, `user_email`, `user_name`
- **What** — `action`, `category`, `description`
- **Where** — `entity_type`, `entity_id`, `entity_label`
- **When** — `timestamp`
- **How** — `ip_address`, `user_agent`
- **Details** — `old_values`, `new_values` (JSON diff)
- **Severity** — `info`, `warning`, `critical`
- **Tenant** — `tenant_id` for multi-tenant filtering

### 8.3 Database-Triggered Auditing

Critical workflows use PostgreSQL triggers for tamper-proof audit trails:
- `audit_pssr_status_change` — Logs every PSSR status transition
- `audit_pssr_approver_decision` — Logs approval/rejection decisions
- `audit_sof_approver_decision` — Logs SoF approvals
- `audit_p2a_approver_decision` — Logs P2A approvals
- `trg_audit_feature_flag_change` — Logs feature flag toggles

### 8.4 Audit Log Retention

- **Configurable retention period** — Managed via Admin Tools
- **Automated purge** via `purge_old_audit_logs()` function with configurable retention days
- **Weekly scheduled cleanup** via `pg_cron`
- Retention statistics visible in the Admin UI (total logs, logs beyond retention)

---

## 9. Data Protection & Sensitive Field Handling

### 9.1 Sensitive Field Protection

The following fields are **never exposed** through public views or data exports:

| Field | Protection Method |
|-------|-------------------|
| `two_factor_secret` | Excluded from `profiles_safe` view |
| `two_factor_backup_codes` | Excluded from `profiles_safe` view |
| `password hashes` | Managed by Supabase Auth, never in public schema |
| `temporary_password` | Cleared after use; column purged of plaintext values |

### 9.2 Safe Profile Access

- **`profiles_safe` view** — Public-facing view that excludes all sensitive columns
- **`get_safe_profile_data()` function** — Security-definer function returning only non-sensitive profile data
- **`get_public_profile_info()` function** — Returns minimal info for team selection UIs

### 9.3 Data Export Controls

- Export utility filters sensitive fields automatically
- Maximum 10,000 records per export (prevents bulk data extraction)
- All export actions logged in the security audit log
- CSV and JSON format support

---

## 10. Backup, Recovery & Disaster Recovery

### 10.1 Automated Backups

Supabase provides:
- **Daily automated backups** with point-in-time recovery
- Backups stored in geographically separated infrastructure
- Encryption at rest for all backup data

### 10.2 Disaster Recovery Runbook

An integrated **Disaster Recovery Runbook** is available in Admin Tools, defining:

| Parameter | Target |
|-----------|--------|
| **Recovery Time Objective (RTO)** | 4 hours |
| **Recovery Point Objective (RPO)** | 1 hour |
| **Primary Contact** | Daniel Memuletiwon (memuletiwondaniel@gmail.com) |

### 10.3 Recovery Procedure

1. Access Supabase Dashboard → Backups
2. Select the most recent backup before the incident
3. Initiate restore (creates a new database instance)
4. Verify data integrity — Check critical tables (projects, pssrs, profiles, audit_logs)
5. Verify RLS policies are intact after restore
6. Update connection strings if restored to a new project

### 10.4 Admin-Driven Data Export

- CSV/JSON export of critical tables for offline backup
- Sensitive field filtering applied automatically
- Tables available for export: profiles, projects, PSSRs, audit logs, roles, user activity logs

---

## 11. Change Management & Deployment Workflow

### 11.1 Deployment Pipeline

ORSH uses a streamlined **Build → Test → Publish** workflow:

```
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│  1. BUILD & CHANGE │────▶│  2. TEST & VERIFY  │────▶│  3. PUBLISH        │
│  Make changes in   │     │  Preview URL auto-  │     │  Pre-publish       │
│  Lovable platform  │     │  updates. Verify    │     │  checklist →       │
│                    │     │  on preview.        │     │  Deploy to prod.   │
└────────────────────┘     └────────────────────┘     └────────────────────┘
```

### 11.2 Pre-Publish Checklist

Before every deployment, the following must be verified:

| # | Check Item |
|---|-----------|
| 1 | ✅ Preview tested and verified |
| 2 | ✅ Database migration reviewed |
| 3 | ✅ RLS policies verified |
| 4 | ✅ Edge functions tested |
| 5 | ✅ User permissions checked |
| 6 | ✅ Mobile responsiveness verified |
| 7 | ✅ No console errors |
| 8 | ✅ Rollback plan identified |

### 11.3 Deployment Logging

Every deployment is recorded in the `deployment_log` table:

- **Version label** (e.g., `v2026.03.02.1430`)
- **Deployed by** — User name and ID
- **Release notes** — Description of changes
- **Changes summary** — JSON object of what was modified
- **Environment** — Target environment (production/staging)
- **Status** — Deployment status tracking
- **Rollback reference** — Link to previous version for rollback

### 11.4 Rollback Capability

- Lovable provides built-in version history with one-click rollback
- Previous deployment versions recorded in the deployment log
- Database migrations are incremental and forward-compatible

### 11.5 Frontend vs Backend Deployment

| Change Type | Deployment Behavior |
|-------------|-------------------|
| **Frontend** (UI, styling, client code) | Requires explicit "Publish → Update" action |
| **Backend** (edge functions, migrations) | Deploys immediately and automatically |

---

## 12. Tenant Feature Flags & Controlled Rollouts

### 12.1 Feature Flag System

ORSH supports **per-tenant feature flags** enabling controlled rollouts:

| Feature Key | Description |
|------------|-------------|
| `ora_module` | ORA Planning module |
| `pssr_module` | PSSR module |
| `p2a_module` | P2A Handover module |
| `orm_module` | ORM module |
| `training_module` | Training management |
| `ai_chat` | AI assistant |
| `sso_enabled` | Single Sign-On |
| `two_factor_required` | Mandatory 2FA |
| `data_export` | Data export functionality |
| `api_integration` | API key management |
| `advanced_reporting` | Advanced analytics |
| `bulk_operations` | Bulk user/data operations |

### 12.2 Controlled Rollout Process

1. **Develop** — Build new feature in Lovable
2. **Test** — Verify on preview URL
3. **Flag** — Enable feature flag for a single tenant (e.g., BGC)
4. **Monitor** — Observe usage and stability
5. **Roll out** — Enable for remaining tenants
6. **Audit** — All flag changes logged automatically via database trigger

### 12.3 Technical Implementation

- `is_feature_enabled(p_feature_key)` — PostgreSQL function checking tenant-level flags
- `useFeatureFlag(key)` — React hook for frontend feature gating
- Automatic audit logging on every flag toggle

---

## 13. Single Sign-On (SSO) Infrastructure

### 13.1 Supported Protocols

| Protocol | Status |
|----------|--------|
| **SAML 2.0** | ✅ Supported |
| **OIDC (OpenID Connect)** | ✅ Supported |

### 13.2 Per-Tenant Configuration

Each tenant can configure:
- **Entity ID** — SAML Identity Provider identifier
- **SSO URL** — Identity Provider login endpoint
- **Certificate** — X.509 certificate for signature validation
- **Metadata URL** — Auto-configuration endpoint

### 13.3 Enforcement Modes

| Mode | Behavior |
|------|----------|
| `disabled` | SSO not available; email/password only |
| `optional` | SSO available alongside email/password login |
| `required` | SSO mandatory; email/password disabled |

### 13.4 Branded Login Experience

- Subdomain-based tenant resolution triggers branded login screens
- Dynamic SSO button display based on tenant configuration
- Automatic redirect to Identity Provider when SSO is required

---

## 14. Database Security Architecture

### 14.1 Row Level Security (RLS)

- **Enabled on all tables** containing user or tenant data
- Policies use `security definer` functions to prevent recursive evaluation
- All views use `security_invoker = true` to enforce RLS through views

### 14.2 Security Definer Functions

Critical security functions run with elevated privileges but controlled scope:

| Function | Purpose |
|----------|---------|
| `user_is_admin()` | Server-side admin verification |
| `has_permission()` | Permission check against role_permissions |
| `get_user_tenant_id()` | Tenant resolution |
| `offboard_user()` | Secure user deactivation |
| `write_audit_log()` | Tamper-proof audit entries |
| `approve_user_account()` | Account activation |
| `reject_user_account()` | Account rejection with reason |

### 14.3 Edge Function Security

- All edge functions validate the caller's JWT token
- Admin operations require server-side role verification via `user_roles` table
- Service role key used only server-side; never exposed to the client
- CORS headers configured for authorized origins

### 14.4 Data Access Patterns

```
Client (anon key) → RLS Policy → Tenant Filter → Data
                  ↓
         Security Definer Function (bypasses RLS for auth checks)
                  ↓
         user_roles / role_permissions (authorization)
```

---

## 15. Summary of Enterprise Compliance

| Requirement | ORSH Implementation | Status |
|------------|-------------------|--------|
| **Authentication** | Email/password, SAML SSO, OIDC, 2FA | ✅ |
| **Authorization** | Granular RBAC with permission matrix | ✅ |
| **Multi-Tenancy** | Row-level isolation with RLS | ✅ |
| **Audit Trail** | Comprehensive, database-triggered, immutable | ✅ |
| **Session Security** | Configurable timeout, brute-force protection | ✅ |
| **API Security** | Hashed keys, rate limiting, IP restrictions | ✅ |
| **Webhook Security** | HMAC signature verification | ✅ |
| **Data Protection** | Sensitive field filtering, safe views | ✅ |
| **Backup & Recovery** | Daily backups, DR runbook (RTO: 4h, RPO: 1h) | ✅ |
| **Change Management** | Pre-publish checklist, deployment logging | ✅ |
| **Feature Flags** | Per-tenant controlled rollouts | ✅ |
| **SSO** | SAML 2.0 / OIDC with per-tenant enforcement | ✅ |
| **User Lifecycle** | Registration → Approval → Active → Offboarding | ✅ |
| **Access Reviews** | Quarterly access certification campaigns | ✅ |
| **Data Retention** | Configurable audit log retention with auto-purge | ✅ |
| **Encryption** | TLS in transit, encryption at rest (Supabase) | ✅ |

---

**Document End**

*This document should be reviewed and updated quarterly alongside the Access Certification Campaign cycle.*
