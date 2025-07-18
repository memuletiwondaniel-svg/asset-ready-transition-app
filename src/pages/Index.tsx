

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, Phone } from "lucide-react";
import AuthenticationModal from "@/components/AuthenticationModal";
import PSSRModule from "@/components/PSSRModule";
import LandingPage from "@/components/LandingPage";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import UserManagement from "@/pages/UserManagement";

const Index = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setShowAuth(false);
  };

  const handleBack = () => {
    setIsAuthenticated(false);
    setCurrentSection(null);
  };

  const handleNavigate = (section: string) => {
    setCurrentSection(section);
  };

  const handleBackToLanding = () => {
    setCurrentSection(null);
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "ar", name: "العربية" },
    { code: "fr", name: "Français" }
  ];

  // Show specific section based on navigation
  if (isAuthenticated && currentSection) {
    switch (currentSection) {
      case 'pssr':
        return <PSSRModule onBack={handleBackToLanding} />;
      case 'users':
        return <UserManagement onBack={handleBackToLanding} />;
      case 'assets':
        // Placeholder for Asset Management - can be implemented later
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Asset Management</h1>
              <p className="text-gray-600 mb-6">Coming Soon...</p>
              <Button onClick={handleBackToLanding}>Back to Dashboard</Button>
            </div>
          </div>
        );
      case 'analytics':
        // Placeholder for Analytics - can be implemented later
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Analytics & Reporting</h1>
              <p className="text-gray-600 mb-6">Coming Soon...</p>
              <Button onClick={handleBackToLanding}>Back to Dashboard</Button>
            </div>
          </div>
        );
      default:
        return <LandingPage onBack={handleBack} onNavigate={handleNavigate} />;
    }
  }

  // Show landing page after authentication
  if (isAuthenticated) {
    return <LandingPage onBack={handleBack} onNavigate={handleNavigate} />;
  }

  // Show welcome screen before authentication
  return (
    <div className="min-h-screen relative flex items-center">
      <BackgroundSlideshow showFunFacts={showAuth} />
      
      {/* Top Left - Language Selector and Contact */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-all duration-300 rounded-full px-6 py-2 shadow-lg">
              <Languages className="h-4 w-4 mr-2" />
              {selectedLanguage}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white/95 backdrop-blur-md border border-white/30 shadow-xl rounded-lg">
            {languages.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => setSelectedLanguage(language.name)}
                className="cursor-pointer hover:bg-gray-100/80 transition-colors"
              >
                {language.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="ghost" className="bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-all duration-300 rounded-full px-6 py-2 shadow-lg">
          <Phone className="h-4 w-4 mr-2" />
          Contact
        </Button>
      </div>

      {/* Top Middle - BGC Logo and Text */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex items-center bg-white/10 backdrop-blur-md rounded-lg p-4 shadow-lg">
          <img src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" alt="BGC Logo" className="h-12 w-auto mr-3" />
          <div className="flex flex-col text-right">
            <h1 className="font-bold text-white text-lg">Basrah Gas Company</h1>
            <p dir="rtl" className="text-sm text-white/90">شركة البصرة للغاز</p>
          </div>
        </div>
      </div>
      
      {!showAuth && (
        <div className="relative z-10 ml-16 max-w-2xl">
          {/* Main Heading - Split into two lines with large text */}
          <div className="mb-12">
            <h1 className="text-7xl font-bold text-white leading-tight mb-4 drop-shadow-2xl">
              Seamless Transition
            </h1>
            <h2 className="text-6xl font-bold text-white leading-tight drop-shadow-2xl">
              from Project to Asset Operation
            </h2>
          </div>
          
          <Button 
            onClick={() => setShowAuth(true)} 
            className="bg-red-600 hover:bg-red-700 text-white px-12 py-4 text-xl font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 rounded-lg"
          >
            GET STARTED &gt;
          </Button>
        </div>
      )}

      <AuthenticationModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
};

export default Index;

