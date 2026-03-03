import React, { useState } from 'react';
import { ArrowLeft, Download, Container, GitBranch, Server, Copy, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { toast } from 'sonner';

interface DeploymentConfigsProps {
  onBack: () => void;
}

const DOCKER_COMPOSE_SINGLE_TENANT = `# ORSH Single-Tenant / Air-Gapped Docker Compose
# Usage: docker compose -f docker-compose.orsh.yml up -d
version: "3.8"

services:
  # PostgreSQL Database
  db:
    image: supabase/postgres:15.1.1.78
    restart: unless-stopped
    ports:
      - "\${POSTGRES_PORT:-5432}:5432"
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
      JWT_SECRET: \${JWT_SECRET}
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Supabase Auth (GoTrue)
  auth:
    image: supabase/gotrue:v2.151.0
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: \${API_EXTERNAL_URL:-http://localhost:8000}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD}@db:5432/postgres?sslmode=disable
      GOTRUE_SITE_URL: \${SITE_URL:-http://localhost:3000}
      GOTRUE_JWT_SECRET: \${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
    ports:
      - "9999:9999"

  # PostgREST API
  rest:
    image: postgrest/postgrest:v12.2.0
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgres://postgres:\${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: \${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
    ports:
      - "3001:3000"

  # Supabase Realtime
  realtime:
    image: supabase/realtime:v2.29.15
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: \${POSTGRES_PASSWORD}
      DB_NAME: postgres
      PORT: 4000
      JWT_SECRET: \${JWT_SECRET}
      REPLICATION_MODE: RLS
      SECURE_CHANNELS: "true"
    ports:
      - "4000:4000"

  # Supabase Storage
  storage:
    image: supabase/storage-api:v1.0.6
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      ANON_KEY: \${ANON_KEY}
      SERVICE_KEY: \${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: \${JWT_SECRET}
      DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD}@db:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: local
      GLOBAL_S3_BUCKET: stub
    volumes:
      - storage-data:/var/lib/storage
    ports:
      - "5000:5000"

  # ORSH Frontend (Nginx)
  frontend:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "\${FRONTEND_PORT:-3000}:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro

volumes:
  db-data:
  storage-data:
`;

const ENV_TEMPLATE = `# ORSH Environment Configuration
# Copy to .env and fill in values

# Database
POSTGRES_PASSWORD=your-super-secret-password-here
POSTGRES_PORT=5432

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-jwt-secret-min-32-chars

# Supabase Keys (generate from JWT_SECRET)
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key

# URLs
API_EXTERNAL_URL=http://localhost:8000
SITE_URL=http://localhost:3000
FRONTEND_PORT=3000
`;

const GITHUB_ACTIONS_CI = `# .github/workflows/orsh-ci.yml
name: ORSH CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  # Stage 1: Build & Lint
  build:
    name: Build & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: \${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: \${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  # Stage 2: Test
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --run
        env:
          VITE_SUPABASE_URL: \${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: \${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

  # Stage 3: Security Scan
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: true

  # Stage 4: Deploy (main branch only)
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build, test, security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: Deploy
        run: |
          echo "🚀 Deploying ORSH to production..."
          echo "Build artifact ready in ./dist"
          # Add your deployment command here:
          # e.g., aws s3 sync, az storage blob upload, gcloud app deploy
`;

const DeploymentConfigs: React.FC<DeploymentConfigsProps> = ({ onBack }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const CopyButton: React.FC<{ content: string; id: string }> = ({ content, id }) => (
    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(content, id)}>
      {copiedId === id ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Deployment Configs" favoritePath="/admin-tools/deployment-configs" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Container className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Deployment Configurations</h1>
              <p className="text-sm text-muted-foreground">Docker Compose, CI/CD pipeline, and environment templates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          <Tabs defaultValue="docker" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="docker" className="flex items-center gap-2">
                <Container className="h-4 w-4" /> Docker Compose
              </TabsTrigger>
              <TabsTrigger value="cicd" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" /> CI/CD Pipeline
              </TabsTrigger>
              <TabsTrigger value="env" className="flex items-center gap-2">
                <Server className="h-4 w-4" /> Environment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="docker" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Single-Tenant / Air-Gapped Docker Compose</CardTitle>
                      <CardDescription>
                        Complete self-contained deployment — PostgreSQL, Auth, API, Realtime, Storage, and Frontend.
                        Suitable for on-premises, single-tenant, and air-gapped environments.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <CopyButton content={DOCKER_COMPOSE_SINGLE_TENANT} id="docker" />
                      <Button variant="outline" size="sm" onClick={() => downloadFile(DOCKER_COMPOSE_SINGLE_TENANT, 'docker-compose.orsh.yml')}>
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/50 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-[500px] overflow-y-auto">
                    {DOCKER_COMPOSE_SINGLE_TENANT}
                  </pre>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm">
                  <p className="font-medium text-foreground mb-2">Air-Gapped Deployment Notes</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Pre-pull all Docker images and load into a local registry</li>
                    <li>Export SQL migrations from <code className="bg-muted px-1 rounded text-xs">supabase/migrations/</code></li>
                    <li>Build frontend with <code className="bg-muted px-1 rounded text-xs">npm run build</code> and place in <code className="bg-muted px-1 rounded text-xs">./dist</code></li>
                    <li>No external network dependencies at runtime</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cicd" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">GitHub Actions CI/CD Pipeline</CardTitle>
                      <CardDescription>
                        4-stage pipeline: Build → Test → Security Audit → Deploy. 
                        Runs on push to main/staging and on PRs.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <CopyButton content={GITHUB_ACTIONS_CI} id="cicd" />
                      <Button variant="outline" size="sm" onClick={() => downloadFile(GITHUB_ACTIONS_CI, 'orsh-ci.yml')}>
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/50 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-[500px] overflow-y-auto">
                    {GITHUB_ACTIONS_CI}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="env" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Environment Template</CardTitle>
                      <CardDescription>Required environment variables for self-hosted deployment</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <CopyButton content={ENV_TEMPLATE} id="env" />
                      <Button variant="outline" size="sm" onClick={() => downloadFile(ENV_TEMPLATE, '.env.example')}>
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/50 rounded-lg p-4 text-xs font-mono overflow-x-auto">
                    {ENV_TEMPLATE}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DeploymentConfigs;
