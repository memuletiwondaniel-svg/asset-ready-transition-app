import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentTranslations } from '@/utils/translations';

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
  translations: any;
  isChangingLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState('English');
  const [translations, setTranslations] = useState(getCurrentTranslations('English'));
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const setLanguage = (newLanguage: string) => {
    if (newLanguage === language) return;
    
    // Trigger fade out
    setIsChangingLanguage(true);
    
    // Wait for fade out animation, then change language
    setTimeout(() => {
      setLanguageState(newLanguage);
      const newTranslations = getCurrentTranslations(newLanguage);
      setTranslations(newTranslations);
      
      // Trigger fade in
      setTimeout(() => {
        setIsChangingLanguage(false);
      }, 50);
    }, 150);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations, isChangingLanguage }}>
      <div className={`transition-opacity duration-300 ${isChangingLanguage ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>
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
