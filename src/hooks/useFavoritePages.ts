import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface FavoritePage {
  path: string;
  label: string;
}

const STORAGE_KEY_PREFIX = 'orsh-favorite-pages';
const LEGACY_STORAGE_KEY = 'orsh-favorite-pages';

const getStorageKey = (userId?: string) => 
  userId ? `${STORAGE_KEY_PREFIX}-${userId}` : LEGACY_STORAGE_KEY;

export const useFavoritePages = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const storageKey = getStorageKey(userId);
  const prevStorageKeyRef = useRef(storageKey);

  const readFromStorage = useCallback((key: string): FavoritePage[] => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      const parsed: FavoritePage[] = JSON.parse(stored);
      
      // Migrate stale /admin-tools entries to correct virtual paths
      const LABEL_TO_PATH: Record<string, string> = {
        'User Management': '/admin-tools/users',
        'Users': '/admin-tools/users',
        'Activity Log': '/admin-tools/activity-log',
        'API Management': '/admin-tools/apis',
        'ORA Plan': '/admin-tools/ora-configuration',
        'Manage ORA Plans': '/admin-tools/ora-configuration',
        'SSO Configuration': '/admin-tools/sso',
        'Role & Permissions': '/admin-tools/roles-permissions',
        'Audit Logs': '/admin-tools/audit-logs',
        'API Keys': '/admin-tools/api-keys',
        'Data Export': '/admin-tools/data-export',
        'Audit Retention': '/admin-tools/audit-retention',
        'Handover Management': '/admin-tools/handover-management',
        'Manage Handover': '/admin-tools/handover-management',
        'AI Agents': '/admin/ai-agents',
        'AI Agents Hub': '/admin/ai-agents',
      };
      
      let migrated = false;
      const result = parsed.map(fav => {
        if (fav.path === '/admin-tools' && LABEL_TO_PATH[fav.label]) {
          migrated = true;
          return { ...fav, path: LABEL_TO_PATH[fav.label] };
        }
        return fav;
      });
      
      if (migrated) {
        localStorage.setItem(key, JSON.stringify(result));
      }
      
      return result;
    } catch {
      return [];
    }
  }, []);

  const [favorites, setFavorites] = useState<FavoritePage[]>(() => {
    // On first mount, try user-scoped key, then migrate from legacy key
    const userFavs = readFromStorage(storageKey);
    if (userFavs.length > 0) return userFavs;
    
    // Migrate legacy (non-scoped) favorites to user-scoped key
    if (userId) {
      const legacyFavs = readFromStorage(LEGACY_STORAGE_KEY);
      if (legacyFavs.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(legacyFavs));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return legacyFavs;
      }
    }
    return [];
  });

  // Re-read favorites when user changes (login/logout)
  useEffect(() => {
    if (prevStorageKeyRef.current !== storageKey) {
      prevStorageKeyRef.current = storageKey;
      const userFavs = readFromStorage(storageKey);
      if (userFavs.length > 0) {
        setFavorites(userFavs);
      } else if (userId) {
        // Migrate legacy favorites for newly logged-in user
        const legacyFavs = readFromStorage(LEGACY_STORAGE_KEY);
        if (legacyFavs.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(legacyFavs));
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          setFavorites(legacyFavs);
        } else {
          setFavorites([]);
        }
      } else {
        setFavorites([]);
      }
    }
  }, [storageKey, userId, readFromStorage]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(favorites));
  }, [favorites, storageKey]);

  const isFavorite = useCallback((path: string) => {
    return favorites.some(f => f.path === path);
  }, [favorites]);

  const toggleFavorite = useCallback((path: string, label: string) => {
    setFavorites(prev => {
      if (prev.some(f => f.path === path)) {
        return prev.filter(f => f.path !== path);
      }
      return [...prev, { path, label }];
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
};
