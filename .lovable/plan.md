

## API Configuration Wizard

### Overview
When clicking any API card in the API Management page, a multi-step configuration wizard dialog will open. The wizard starts by asking the user to choose between two interface methods: **API** or **RPA (Robotic Process Automation)**. For GoCompletions specifically, the existing RPA credentials configuration (username, password, portal URL) currently embedded in the P2A Plan wizard will be moved here, making API Management the single source of truth for all connection settings.

### How It Works

**Step 1 -- Interface Method Selection**
- Two options presented as selectable cards: "API" and "RPA"
- API: For direct API-to-API integration (standard REST/SOAP endpoints, API keys, OAuth tokens)
- RPA: For screen-scraping / web-automation integrations (requires credentials like username + password)

**Step 2 -- Configuration (varies by method)**
- **If API selected**: Form fields for API endpoint URL, authentication type (API Key, OAuth, Basic Auth), and relevant credentials
- **If RPA selected**: Form fields for Portal URL, Username, Password (with show/hide toggle), and a "Remember credentials" checkbox -- mirroring the existing GoCompletions/GoHub configuration

**Step 3 -- Test Connection**
- A "Test Connection" button that validates the entered credentials work
- Shows success/error feedback inline

**Step 4 -- Summary**
- Displays configured settings with a "Save" action
- Card badge changes from "Not configured" to "Configured" (green) once saved

### GoCompletions Migration
- The existing `CMSImportModal.tsx` credential fields (portal URL, username, password) and localStorage persistence (`gohub-credentials` key) will be **reused** by the new wizard for the GoCompletions card
- The P2A Plan wizard's "CMS Import" button will **no longer** show the credentials modal. Instead, it will:
  - Check if GoCompletions is configured (read from the same localStorage key)
  - If configured: immediately invoke the `gohub-import` edge function with saved credentials
  - If not configured: show a message directing the user to configure GoCompletions in Administration > APIs

### Technical Details

**New Files**
- `src/components/admin-tools/APIConfigWizard.tsx` -- The main wizard dialog component with step navigation
- `src/components/admin-tools/wizard-steps/InterfaceMethodStep.tsx` -- Step 1: API vs RPA selection
- `src/components/admin-tools/wizard-steps/RPAConfigStep.tsx` -- RPA credentials form (portal URL, username, password)
- `src/components/admin-tools/wizard-steps/APIConfigStep.tsx` -- API credentials form (endpoint, auth type, key/token)
- `src/components/admin-tools/wizard-steps/TestConnectionStep.tsx` -- Connection test and summary
- `src/lib/api-config-storage.ts` -- Shared utility for reading/writing API configurations to localStorage (extracts and generalizes the existing `gohub-credentials` pattern)

**Modified Files**
- `src/components/admin-tools/APIManagement.tsx` -- Add onClick handler to cards that opens the wizard for the selected API; track configuration status per API; update badge to show "Configured" when applicable
- `src/components/widgets/p2a-wizard/steps/CMSImportModal.tsx` -- Refactor to use shared credential storage from `api-config-storage.ts`; simplify to auto-use saved credentials
- `src/components/widgets/p2a-wizard/steps/SystemsImportStep.tsx` -- Update the CMS Import button to check if GoCompletions is configured and either import directly or show a "not configured" toast

**Data Model**
- Configurations stored in localStorage under key `api-config-{apiId}` (e.g., `api-config-gocompletions`)
- Each config stores: `{ interfaceMethod: 'api' | 'rpa', credentials: {...}, configuredAt: timestamp, status: 'configured' | 'not_configured' }`
- The existing `gohub-credentials` key will be migrated to `api-config-gocompletions` for consistency

**Wizard Dialog Style**
- Uses existing Dialog component at `max-w-2xl`
- Header shows the API logo + name
- Step indicator follows the same compact numbered-step pattern used in other wizards
- Navigation uses Back/Next buttons consistent with `WizardNavigation.tsx` patterns

