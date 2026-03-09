import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentTranslations, isRTL } from '@/utils/translations';

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
    
    setIsChangingLanguage(true);
    
    setTimeout(() => {
      setLanguageState(newLanguage);
      const newTranslations = getCurrentTranslations(newLanguage);
      setTranslations(newTranslations);
      
      // Set RTL direction for Arabic
      document.documentElement.dir = isRTL(newLanguage) ? 'rtl' : 'ltr';
      
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
