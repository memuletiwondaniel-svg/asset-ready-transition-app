import { useState, useCallback, useEffect } from 'react';

export interface FavoritePage {
  path: string;
  label: string;
}

const STORAGE_KEY = 'orsh-favorite-pages';

export const useFavoritePages = () => {
const [favorites, setFavorites] = useState<FavoritePage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      }
      
      return result;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

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
