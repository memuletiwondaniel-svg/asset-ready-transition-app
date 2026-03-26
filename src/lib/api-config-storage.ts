export type InterfaceMethod = 'api' | 'agent';

export type APIAuthType = 'api_key' | 'oauth' | 'basic_auth' | 'sso';

export interface RPACredentials {
  portalUrl: string;
  username: string;
  password: string;
}

export interface APICredentials {
  endpointUrl: string;
  authType: APIAuthType;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  username?: string;
  password?: string;
  ssoProject?: string;
  ssoDatabase?: string;
}

export interface APIConfig {
  interfaceMethod: InterfaceMethod;
  rpaCredentials?: RPACredentials;
  apiCredentials?: APICredentials;
  configuredAt: string;
  status: 'configured' | 'not_configured';
}

const STORAGE_PREFIX = 'api-config-';
const LEGACY_GOHUB_KEY = 'gohub-credentials';

function getKey(apiId: string) {
  return `${STORAGE_PREFIX}${apiId}`;
}

export function getAPIConfig(apiId: string): APIConfig | null {
  try {
    // For gocompletions, also check legacy key
    if (apiId === 'gocompletions') {
      const config = localStorage.getItem(getKey(apiId));
      if (config) return JSON.parse(config);

      // Migrate from legacy key
      const legacy = localStorage.getItem(LEGACY_GOHUB_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as { portalUrl: string; username: string; password: string };
        const migrated: APIConfig = {
          interfaceMethod: 'rpa',
          rpaCredentials: {
            portalUrl: parsed.portalUrl,
            username: parsed.username,
            password: parsed.password,
          },
          configuredAt: new Date().toISOString(),
          status: 'configured',
        };
        saveAPIConfig(apiId, migrated);
        localStorage.removeItem(LEGACY_GOHUB_KEY);
        return migrated;
      }
      return null;
    }

    const raw = localStorage.getItem(getKey(apiId));
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return null;
}

export function saveAPIConfig(apiId: string, config: APIConfig): void {
  try {
    localStorage.setItem(getKey(apiId), JSON.stringify(config));

    // Also keep legacy key in sync for gocompletions so edge function still works
    if (apiId === 'gocompletions' && config.rpaCredentials) {
      localStorage.setItem(LEGACY_GOHUB_KEY, JSON.stringify(config.rpaCredentials));
    }
  } catch (_) { /* ignore */ }
}

export function removeAPIConfig(apiId: string): void {
  try {
    localStorage.removeItem(getKey(apiId));
    if (apiId === 'gocompletions') {
      localStorage.removeItem(LEGACY_GOHUB_KEY);
    }
  } catch (_) { /* ignore */ }
}

export function isAPIConfigured(apiId: string): boolean {
  const config = getAPIConfig(apiId);
  return config?.status === 'configured';
}
