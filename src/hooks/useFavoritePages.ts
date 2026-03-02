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
