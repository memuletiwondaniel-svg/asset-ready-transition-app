

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
      case 'safe-startup':
        return <PSSRModule onBack={handleBackToLanding} />;
      case 'users':
        return <UserManagement onBack={handleBackToLanding} />;
      case 'p2o':
        // Placeholder for P2O Module - can be implemented later
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Project-to-Operations (P2O)</h1>
              <p className="text-gray-600 mb-6">PAC and FAC workflows - Coming Soon...</p>
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
      
      {/* Top Navigation Bar with Fluent acrylic effect */}
      <div className="absolute top-0 left-0 right-0 z-20 fluent-acrylic border-b border-border/30">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Language and Contact */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="fluent-acrylic text-white hover:bg-white/20 transition-all duration-300 rounded-lg px-4 py-2 border border-white/20">
                  <Languages className="h-4 w-4 mr-2" />
                  {selectedLanguage}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="fluent-acrylic border border-border/30 shadow-xl rounded-lg z-50">
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => setSelectedLanguage(language.name)}
                    className="cursor-pointer hover:bg-accent/80 transition-colors"
                  >
                    {language.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" className="fluent-acrylic text-white hover:bg-white/20 transition-all duration-300 rounded-lg px-4 py-2 border border-white/20">
              <Phone className="h-4 w-4 mr-2" />
              Contact
            </Button>
          </div>

          {/* BGC Logo and Text */}
          <div className="flex items-center fluent-acrylic rounded-lg p-3 border border-white/20">
            <img src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" alt="BGC Logo" className="h-10 w-auto mr-3" />
            <div className="flex flex-col text-right">
              <h1 className="font-semibold text-white text-lg">Basrah Gas Company</h1>
              <p dir="rtl" className="text-sm text-white/90">شركة البصرة للغاز</p>
            </div>
          </div>
        </div>
      </div>
      
      {!showAuth && (
        <div className="relative z-10 ml-16 max-w-3xl animate-slide-up">
          {/* Main Heading with Microsoft Typography */}
          <div className="mb-12">
            <h1 className="text-7xl font-light text-white leading-tight mb-4 drop-shadow-2xl">
              Operation Readiness
            </h1>
            <h2 className="text-6xl font-light text-white leading-tight drop-shadow-2xl mb-4">
              & Start-up Handover
            </h2>
            <p className="text-xl text-white/90 font-light mt-6 drop-shadow-lg">
              Seamless transition from project to asset operation with Microsoft Fluent Design
            </p>
          </div>
          
          <Button 
            onClick={() => setShowAuth(true)} 
            className="bg-primary hover:bg-primary-hover text-primary-foreground px-8 py-4 text-lg font-medium shadow-fluent-medium hover:shadow-fluent-high transform hover:scale-105 transition-all duration-300 rounded-lg"
          >
            GET STARTED →
          </Button>
        </div>
      )}

      <AuthenticationModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
};

export default Index;

