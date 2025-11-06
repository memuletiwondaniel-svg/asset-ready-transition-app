import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentTranslations } from '@/utils/translations';

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
  translations: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState('English');
  const [translations, setTranslations] = useState(getCurrentTranslations('English'));

  useEffect(() => {
    // Update translations whenever language changes
    const newTranslations = getCurrentTranslations(language);
    setTranslations(newTranslations);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
