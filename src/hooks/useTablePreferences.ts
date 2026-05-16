import { useCallback, useEffect, useState } from 'react';

export interface TablePreferences {
  order: string[];
  widths: Record<string, number>;
  hidden: string[];
}

const empty: TablePreferences = { order: [], widths: {}, hidden: [] };

export function useTablePreferences(key: string, defaults: TablePreferences) {
  const storageKey = `lov-table-prefs:${key}`;
  const [prefs, setPrefs] = useState<TablePreferences>(() => {
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<TablePreferences>;
      return {
        order: parsed.order?.length ? parsed.order : defaults.order,
        widths: { ...defaults.widths, ...(parsed.widths || {}) },
        hidden: parsed.hidden || defaults.hidden,
      };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    } catch {
      /* ignore quota */
    }
  }, [storageKey, prefs]);

  const reset = useCallback(() => setPrefs(defaults), [defaults]);

  return { prefs, setPrefs, reset, empty };
}
