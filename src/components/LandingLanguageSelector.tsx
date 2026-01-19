import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

interface LandingLanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const LandingLanguageSelector: React.FC<LandingLanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  const languages = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "ar", name: "Arabic", nativeName: "العربية" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "zh", name: "Chinese", nativeName: "中文" },
    { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
    { code: "kk", name: "Kazakh", nativeName: "Қазақша" }
  ];

  const getLanguageCode = (languageName: string) => {
    const lang = languages.find(l => l.name === languageName || l.nativeName === languageName);
    return lang ? lang.code.toUpperCase() : 'EN';
  };

  const getCurrentLanguageNative = () => {
    const lang = languages.find(l => l.name === selectedLanguage || l.nativeName === selectedLanguage);
    return lang ? lang.nativeName : 'English';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-10 px-4 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-300 text-white shadow-lg"
        >
          <Globe className="w-4 h-4 mr-2" />
          <span className="text-sm font-semibold">{getLanguageCode(selectedLanguage)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-52 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
      >
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => onLanguageChange(language.name)}
            className={`cursor-pointer transition-all duration-200 text-white hover:bg-white/20 focus:bg-white/20 focus:text-white ${
              selectedLanguage === language.name || selectedLanguage === language.nativeName
                ? 'bg-white/20' 
                : ''
            }`}
          >
            <span className="font-medium">{language.nativeName}</span>
            <span className="ml-2 text-white/60 text-xs">({language.name})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LandingLanguageSelector;
