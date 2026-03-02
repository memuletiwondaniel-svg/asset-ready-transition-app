

# Plan: Update Enterprise Security Document — Gap Analysis & ORIP Readiness

## Gap Analysis Summary

Analyzing the 25 requirements against the current document:

| # | Requirement | Current Status | Gap |
|---|---|---|---|
| a | SSO (Entra/Okta/SAP IAM) | SAML/OIDC documented | Missing explicit Entra ID, Okta, SAP IAM callouts |
| b | RBAC | Fully documented | No gap |
| c | Multi-Tenancy | Fully documented | No gap |
| d | Single-tenant Deployment | Not mentioned | **Gap** — needs new content |
| e | On-prem compatible | Mentioned briefly in §15 | Needs dedicated treatment |
| f | Regional Data Hosting | Mentioned in §15 | Adequate, minor enhancement |
| g | API Isolation per Tenant | Not mentioned | **Gap** — RLS covers data, but API-level isolation not documented |
| h | Cloud-agnostic | Listed in §15 | Adequate |
| i | Containerized (Docker) | Listed in §15 | Adequate |
| j | Kubernetes-deployable | Listed in §15 | Adequate |
| k | Air-gapped capable | Not mentioned | **Gap** — needs new content |
| l | Data Segregation | RLS documented, but not framed as "data segregation" | Needs explicit framing |
| m | Disaster Recovery (RPO/RTO) | Documented (4h/1h) | No gap |
| n | CI/CD | "Build → Test → Publish" documented | Needs framing as CI/CD pipeline |
| o | Documented Response Process | Not mentioned | **Gap** — incident response process needed |
| p.i | Audit log immutability | Mentioned as "tamper-proof" | Needs stronger language |
| p.ii | Tenant data isolation at DB level | RLS documented | Needs explicit "not just UI filtering" statement |
| p.iii | Encryption at rest (AES-256) | "Encryption at rest (Supabase)" | Needs AES-256 specification |
| p.iv | Encryption in transit (TLS 1.2+) | "TLS in transit" | Needs TLS 1.2+ specification |
| p.v | Role inheritance controls | Not mentioned | **Gap** — needs new content |
| p.vi | Least-privilege defaults | Not mentioned | **Gap** — needs new content |
| p.vii | SOC 2 Type I → II | Not mentioned | **Gap** — mandatory for ORIP |
| p.viii | Pen Test | Not mentioned | **Gap** — mandatory for ORIP |
| p.ix | ISO 27001 | Not mentioned | **Gap** — mandatory for ORIP |

## Changes to `EnterpriseSecurityDocument.tsx`

### 1. Add new TOC entry: "Enterprise SaaS Architecture Readiness" (new §16)
A comprehensive new section that consolidates all architecture/deployment requirements in one enterprise-grade table with gap status indicators.

### 2. Add new TOC entry: "Security Controls & Hardening" (new §17)
Covers the security controls sub-items: audit log immutability, DB-level tenant isolation, AES-256 at rest, TLS 1.2+, role inheritance, least-privilege defaults.

### 3. Add new TOC entry: "Compliance Certifications & ORIP Roadmap" (new §18)
Mandatory ORIP items: SOC 2 Type I → II roadmap, ISO 27001 certification path, penetration testing schedule, incident response process.

### 4. Enhance existing sections
- **§1 (Auth)**: Add explicit Entra ID, Okta, SAP IAM to SSO row descriptions
- **§3 (Multi-Tenancy)**: Add "Data Segregation" and "API Isolation per Tenant" rows
- **§14 (Compliance Summary)**: Add rows for SOC 2, ISO 27001, Pen Test, Air-gapped, Single-tenant

### 5. Add a new Badge status: `'roadmap'`
For items that are planned/mandatory for ORIP but not yet implemented (displayed as amber/orange badge with "🔶 Roadmap" label).

### Files Modified
- `src/components/admin-tools/EnterpriseSecurityDocument.tsx`

