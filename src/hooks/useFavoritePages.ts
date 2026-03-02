import { useState, useCallback, useEffect } from 'react';

export interface FavoritePage {
  path: string;
  label: string;
  section: string;
}

const STORAGE_KEY = 'orsh-favorite-pages';

// Map of known pages that can be favorited
export const FAVORITABLE_PAGES: Record<string, { label: string; section: string }> = {
  '/vcrs': { label: 'P2A', section: 'projects' },
  '/pssr': { label: 'PSSR', section: 'pssr' },
  '/my-tasks': { label: 'My Tasks', section: 'my-tasks' },
  '/or-maintenance': { label: 'OR Maintenance', section: 'or-maintenance' },
  '/ask-orsh': { label: 'Ask Bob', section: 'ask-orsh' },
  '/admin-tools': { label: 'Administration', section: 'admin-tools' },
};

export const useFavoritePages = () => {
  const [favorites, setFavorites] = useState<FavoritePage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
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

  const toggleFavorite = useCallback((path: string) => {
    const pageInfo = FAVORITABLE_PAGES[path];
    if (!pageInfo) return;

    setFavorites(prev => {
      if (prev.some(f => f.path === path)) {
        return prev.filter(f => f.path !== path);
      }
      return [...prev, { path, label: pageInfo.label, section: pageInfo.section }];
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
};
