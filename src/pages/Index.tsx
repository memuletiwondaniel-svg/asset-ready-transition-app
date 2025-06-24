import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import AuthenticationModal from "@/components/AuthenticationModal";
import PSSRModule from "@/components/PSSRModule";
import LandingPage from "@/components/LandingPage";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";

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
    <div className="min-h-screen relative flex items-center justify-center">
      <BackgroundSlideshow showFunFacts={showAuth} />
      
      {/* Language Selector - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
              <Languages className="h-4 w-4 mr-2" />
              {selectedLanguage}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white">
            {languages.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => setSelectedLanguage(language.name)}
                className="cursor-pointer"
              >
                {language.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {!showAuth && (
        <div className="relative z-10 text-center text-white bg-gray-900/30 backdrop-blur-sm rounded-lg p-8 shadow-lg">
          {/* BGC Logo with Text */}
          <div className="flex items-center justify-center mb-6">
            <img src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" alt="BGC Logo" className="h-16 w-auto mr-4" />
            <div className="flex flex-col">
              <h1 className="font-bold text-white mb-1 text-2xl">Basrah Gas Company</h1>
              <p dir="rtl" className="text-xl text-white text-left">شركة البصرة للغاز</p>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-8 drop-shadow-lg">Welcome to the Project-to-Asset Management System</h1>
          <Button onClick={() => setShowAuth(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg shadow-lg">
            GET STARTED &gt;
          </Button>
        </div>
      )}

      <AuthenticationModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
};

export default Index;
