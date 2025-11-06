import React from 'react';
import LanguageSelector from './LanguageSelector';
import UserProfileDropdown from './UserProfileDropdown';
import { ThemeToggle } from './ThemeToggle';
import OrshLogo from '@/components/ui/OrshLogo';

interface AdminHeaderProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  translations: any;
  children?: React.ReactNode;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  selectedLanguage,
  onLanguageChange,
  translations,
  children
}) => {
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-20 items-center">
        {/* Left side - Navigation content (back button, etc.) */}
        <div className="flex items-center space-x-4 flex-1">
          {children}
        </div>
        
        {/* Right side - ORSH Logo, Theme toggle, Language selector and User profile */}
        <div className="flex items-center space-x-3">
          <OrshLogo size="medium" />
          <ThemeToggle />
          <LanguageSelector 
            selectedLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
          />
          <UserProfileDropdown translations={translations} />
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;