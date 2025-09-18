import React from 'react';
import LanguageSelector from './LanguageSelector';
import UserProfileDropdown from './UserProfileDropdown';

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
        <div className="flex items-center space-x-4">
          {children}
        </div>
        
        {/* Center - ORSH Logo */}
        <div className="flex-1 flex justify-center">
          <div className="transition-all duration-300 hover:scale-110 hover:drop-shadow-lg">
            <img 
              src="/images/orsh-logo.png" 
              alt="ORSH Logo" 
              className="h-40 w-auto filter drop-shadow-sm" 
            />
          </div>
        </div>
        
        {/* Right side - Language selector and User profile */}
        <div className="flex items-center space-x-3">
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