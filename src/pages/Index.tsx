

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, Phone } from "lucide-react";
import { ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-card to-muted/30">
      <BackgroundSlideshow showFunFacts={showAuth} />
      
      {/* Modern Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 fluent-acrylic border-b border-border/20">
        <div className="flex items-center justify-between px-8 py-6">
          {/* Left Side Controls */}
          <div className="flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="fluent-acrylic text-white hover:bg-white/20 transition-all duration-300 rounded-xl px-6 py-3 border border-white/20 backdrop-blur-md font-medium shadow-fluent-sm hover:shadow-fluent-md"
                >
                  <Languages className="h-4 w-4 mr-3" />
                  {selectedLanguage}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="fluent-acrylic border border-border/30 shadow-fluent-xl rounded-xl z-50 backdrop-blur-xl">
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => setSelectedLanguage(language.name)}
                    className="cursor-pointer hover:bg-accent/80 transition-colors rounded-lg mx-1 my-1"
                  >
                    {language.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="ghost" 
              className="fluent-acrylic text-white hover:bg-white/20 transition-all duration-300 rounded-xl px-6 py-3 border border-white/20 backdrop-blur-md font-medium shadow-fluent-sm hover:shadow-fluent-md group"
            >
              <Phone className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
              Contact Support
            </Button>
          </div>

          {/* Center Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center fluent-acrylic rounded-2xl p-4 border border-white/20 backdrop-blur-md shadow-fluent-lg">
              <img 
                src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                alt="BGC Logo" 
                className="h-12 w-auto mr-4 animate-float" 
              />
              <div className="text-right">
                <h1 className="font-bold text-white text-lg tracking-wide">Basrah Gas Company</h1>
                <p dir="rtl" className="text-sm text-white/90 font-medium">شركة البصرة للغاز</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {!showAuth && (
        <div className="relative z-10 flex items-center min-h-screen">
          <div className="ml-20 max-w-4xl animate-slide-up">
            {/* Enhanced Hero Content */}
            <div className="mb-16 space-y-8">
              <div className="space-y-4">
                <h1 className="text-8xl font-light text-white leading-none tracking-tight drop-shadow-2xl">
                  Operation
                  <span className="block font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    Readiness
                  </span>
                </h1>
                <h2 className="text-6xl font-light text-white/95 leading-tight drop-shadow-xl">
                  & Start-up Handover
                </h2>
              </div>
              
              <div className="max-w-2xl">
                <p className="text-2xl text-white/90 font-light leading-relaxed drop-shadow-lg">
                  Experience seamless project-to-asset transitions with our comprehensive platform built on 
                  <span className="font-semibold text-white"> Microsoft Fluent Design</span>
                </p>
              </div>
            </div>
            
            {/* Enhanced CTA Section */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <Button 
                onClick={() => setShowAuth(true)} 
                className="bg-primary hover:bg-primary-hover text-primary-foreground px-10 py-5 text-xl font-semibold shadow-fluent-2xl hover:shadow-fluent-2xl/80 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 rounded-2xl group border-0"
              >
                Get Started
                <ArrowLeft className="h-5 w-5 ml-3 rotate-180 group-hover:translate-x-2 transition-transform duration-300" />
              </Button>
              
              <div className="flex items-center text-white/80 text-lg font-medium">
                <div className="w-3 h-3 rounded-full bg-success mr-3 animate-pulse-subtle shadow-fluent-sm" />
                Secure • Compliant • Ready
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthenticationModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
};

export default Index;

