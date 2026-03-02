

# Plan: Add Architecture Portability & Deployment Sections to Living Documents

## What Changes

### 1. Enterprise Security Document — New Section 15: "Architecture Portability & Data Sovereignty"
Add before the footer (after section 14), covering:
- **Data Ownership & Control** — Full PostgreSQL ownership, exportable via `pg_dump`, standard connection strings
- **Hosting Flexibility** — Current Supabase Cloud (AWS), portable to any PostgreSQL host or cloud provider
- **Regional Data Residency** — Support for Middle East hosting (AWS Bahrain `me-south-1`, UAE `me-central-1`)
- **On-Premises Deployment** — Self-hostable via Docker (Supabase has official Docker images for PostgREST, GoTrue, Realtime, Storage)
- **Kubernetes & Containerization** — Container-ready architecture with Helm chart support; Nginx for frontend, standard K8s services for backend
- **Zero Vendor Lock-In** — 100% open-source stack (React, TypeScript, Vite, PostgreSQL), no proprietary components

Use a `StatusTable` with rows showing each capability and its status.

### 2. Platform Guide Document — New Section 16: "Deployment Architecture & Portability"
Add before the footer (after section 15), covering:
- **Technology Stack Summary** — React 18 + Vite + TypeScript + Tailwind (frontend), Supabase PostgreSQL + Edge Functions (backend)
- **Export & Migration Path** — GitHub clone, `pg_dump` for data, Edge Functions portable to Deno Deploy / any Deno runtime
- **Supported Deployment Models** — Table listing Cloud (Supabase), Self-Hosted (Docker), On-Prem, Kubernetes with descriptions
- **Containerization Architecture** — Diagram of services: Frontend (Nginx), API (PostgREST), Auth (GoTrue), Realtime, Storage, PostgreSQL
- **Regional Hosting Options** — Middle East regions and compliance note

Update TOC arrays in both files to include the new sections.

### Files Modified
- `src/components/admin-tools/EnterpriseSecurityDocument.tsx`
- `src/components/admin-tools/PlatformGuideDocument.tsx`

