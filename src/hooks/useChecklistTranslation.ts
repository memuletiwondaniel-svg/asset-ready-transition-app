import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface TranslationCache {
  [key: string]: {
    [language: string]: string;
  };
}

// Global cache persisted across component instances
const translationCache: TranslationCache = {};

// Load cache from localStorage on init
const CACHE_KEY = 'pssr_checklist_translations';
try {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    Object.assign(translationCache, JSON.parse(stored));
  }
} catch (e) {
  // Ignore localStorage errors
}

// Save cache to localStorage
const saveCache = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(translationCache));
  } catch (e) {
    // Ignore localStorage errors
  }
};

// Language code mapping
const languageCodeMap: { [key: string]: string } = {
  'English': 'en',
  'Arabic': 'ar',
  'French': 'fr',
  'Malay': 'ms',
  'Kazakh': 'kk',
};

export interface TranslatableItem {
  id: string;
  description?: string;
  question?: string;
  category?: string;
  name?: string;
  supporting_evidence?: string;
}

export const useChecklistTranslation = <T extends TranslatableItem>(
  items: T[] | undefined,
  fields: (keyof T)[] = ['description', 'question', 'category', 'name']
) => {
  const { language } = useLanguage();
  const [translatedItems, setTranslatedItems] = useState<T[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Stable reference for items to prevent infinite loops
  const itemsRef = useRef<T[] | undefined>(items);
  const fieldsRef = useRef(fields);
  
  // Only update refs when items actually change (by comparing IDs)
  const itemsKey = items?.map(i => i.id).join(',') || '';
  const prevItemsKeyRef = useRef(itemsKey);
  
  if (prevItemsKeyRef.current !== itemsKey) {
    prevItemsKeyRef.current = itemsKey;
    itemsRef.current = items;
  }
  
  // Update fields ref
  fieldsRef.current = fields;

  const getLanguageCode = useCallback((lang: string) => {
    return languageCodeMap[lang] || 'en';
  }, []);

  const translateText = useCallback(async (text: string, targetLang: string): Promise<string> => {
    if (!text || targetLang === 'en') return text;

    // Check cache first
    const cacheKey = `${text.substring(0, 50)}_${text.length}`;
    if (translationCache[cacheKey]?.[targetLang]) {
      return translationCache[cacheKey][targetLang];
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          text,
          targetLanguage: targetLang,
          sourceLanguage: 'en',
        },
      });

      if (error) throw error;

      const translatedText = data?.translatedText || text;

      // Cache the result
      if (!translationCache[cacheKey]) {
        translationCache[cacheKey] = {};
      }
      translationCache[cacheKey][targetLang] = translatedText;
      saveCache();

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original on error
    }
  }, []);

  const translateItems = useCallback(async () => {
    const currentItems = itemsRef.current;
    const currentFields = fieldsRef.current;
    
    if (!currentItems || currentItems.length === 0) {
      setTranslatedItems([]);
      return;
    }

    const langCode = getLanguageCode(language);

    // If English, just return original items
    if (langCode === 'en') {
      setTranslatedItems(currentItems);
      setIsTranslating(false);
      return;
    }

    // Cancel any ongoing translation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsTranslating(true);
    setTranslationProgress(0);

    const translated: T[] = [];
    const batchSize = 5; // Translate 5 items at a time
    let completed = 0;

    try {
      for (let i = 0; i < currentItems.length; i += batchSize) {
        const batch = currentItems.slice(i, i + batchSize);
        
        const translatedBatch = await Promise.all(
          batch.map(async (item) => {
            const translatedItem = { ...item };
            
            for (const field of currentFields) {
              const value = item[field];
              if (typeof value === 'string' && value) {
                (translatedItem as any)[field] = await translateText(value, langCode);
              }
            }
            
            return translatedItem;
          })
        );

        translated.push(...translatedBatch);
        completed += batch.length;
        setTranslationProgress(Math.round((completed / currentItems.length) * 100));

        // Update state progressively so users see translations appearing
        setTranslatedItems([...translated]);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Translation batch error:', error);
      }
    } finally {
      setIsTranslating(false);
      setTranslationProgress(100);
    }
  }, [language, getLanguageCode, translateText]);

  useEffect(() => {
    translateItems();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [translateItems, itemsKey]);

  // Return original items while translating if no translated items yet
  const displayItems = translatedItems.length > 0 ? translatedItems : (itemsRef.current || []);

  return {
    items: displayItems,
    isTranslating,
    translationProgress,
    isEnglish: getLanguageCode(language) === 'en',
  };
};

// Hook for translating a single text string
export const useTranslateText = () => {
  const { language } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);

  const getLanguageCode = (lang: string) => languageCodeMap[lang] || 'en';

  const translate = useCallback(async (text: string): Promise<string> => {
    const langCode = getLanguageCode(language);
    
    if (!text || langCode === 'en') return text;

    // Check cache first
    const cacheKey = `${text.substring(0, 50)}_${text.length}`;
    if (translationCache[cacheKey]?.[langCode]) {
      return translationCache[cacheKey][langCode];
    }

    setIsTranslating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          text,
          targetLanguage: langCode,
          sourceLanguage: 'en',
        },
      });

      if (error) throw error;

      const translatedText = data?.translatedText || text;

      // Cache the result
      if (!translationCache[cacheKey]) {
        translationCache[cacheKey] = {};
      }
      translationCache[cacheKey][langCode] = translatedText;
      saveCache();

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  return { translate, isTranslating, isEnglish: getLanguageCode(language) === 'en' };
};

// Clear translation cache
export const clearTranslationCache = () => {
  Object.keys(translationCache).forEach(key => delete translationCache[key]);
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    // Ignore
  }
};
