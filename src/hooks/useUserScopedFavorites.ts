import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

/**
 * Persists a list of favorite IDs in localStorage, scoped to the current user.
 * Survives logout/login cycles without data loss.
 */
export const useUserScopedFavorites = (storagePrefix: string) => {
  const { user } = useAuth();
  const userId = user?.id;

  const getKey = (uid?: string) =>
    uid ? `${storagePrefix}-${uid}` : storagePrefix;

  const storageKey = getKey(userId);
  const prevKeyRef = useRef(storageKey);

  const readFromStorage = useCallback((key: string): string[] => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const userFavs = readFromStorage(storageKey);
    if (userFavs.length > 0) return userFavs;

    // Migrate legacy (non-scoped) data for newly scoped user
    if (userId) {
      const legacyFavs = readFromStorage(storagePrefix);
      if (legacyFavs.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(legacyFavs));
        localStorage.removeItem(storagePrefix);
        return legacyFavs;
      }
    }
    return [];
  });

  // Re-read when user changes (login/logout)
  useEffect(() => {
    if (prevKeyRef.current !== storageKey) {
      prevKeyRef.current = storageKey;
      const userFavs = readFromStorage(storageKey);
      if (userFavs.length > 0) {
        setFavorites(userFavs);
      } else if (userId) {
        const legacyFavs = readFromStorage(storagePrefix);
        if (legacyFavs.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(legacyFavs));
          localStorage.removeItem(storagePrefix);
          setFavorites(legacyFavs);
        } else {
          setFavorites([]);
        }
      } else {
        setFavorites([]);
      }
    }
  }, [storageKey, userId, readFromStorage, storagePrefix]);

  // Persist on change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(favorites));
  }, [favorites, storageKey]);

  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  return { favorites, toggleFavorite, isFavorite };
};
