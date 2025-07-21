

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with enhanced gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-card/5 to-secondary/5" />
      <BackgroundSlideshow showFunFacts={showAuth} />
      
      {/* Modern Navigation Header */}
      <header className="relative z-20">
        <div className="bg-card/10 border-b border-border/20 backdrop-blur-xl shadow-lg">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              {/* Left Navigation */}
              <nav className="flex items-center gap-8">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="lg"
                      className="fluent-acrylic text-white hover:bg-white/10 transition-all duration-300 rounded-2xl px-8 py-4 border border-white/10 backdrop-blur-md font-medium shadow-fluent-sm hover:shadow-fluent-md group"
                    >
                      <Languages className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
                      <span className="text-base">{selectedLanguage}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="fluent-acrylic border border-border/30 shadow-fluent-2xl rounded-2xl p-2 backdrop-blur-xl min-w-[200px]">
                    {languages.map((language) => (
                      <DropdownMenuItem
                        key={language.code}
                        onClick={() => setSelectedLanguage(language.name)}
                        className="cursor-pointer hover:bg-accent/20 transition-all duration-200 rounded-xl py-3 px-4 text-base font-medium"
                      >
                        {language.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="ghost" 
                  size="lg"
                  className="fluent-acrylic text-white hover:bg-white/10 transition-all duration-300 rounded-2xl px-8 py-4 border border-white/10 backdrop-blur-md font-medium shadow-fluent-sm hover:shadow-fluent-md group"
                >
                  <Phone className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-base">Support Center</span>
                </Button>
              </nav>

              {/* Center Logo - Enhanced */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <div className="flex items-center fluent-acrylic rounded-3xl py-4 px-8 border border-white/20 backdrop-blur-xl shadow-fluent-lg group hover:shadow-fluent-xl transition-all duration-300">
                  <div className="relative">
                    <img 
                      src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                      alt="BGC Logo" 
                      className="h-14 w-auto mr-6 animate-float group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute -inset-2 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="text-right">
                    <h1 className="font-bold text-white text-xl tracking-wide mb-1">Basrah Gas Company</h1>
                    <p dir="rtl" className="text-base text-white/90 font-medium">شركة البصرة للغاز</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {!showAuth && (
        <main className="relative z-10 flex items-center min-h-[calc(100vh-120px)] pt-8">
          <div className="max-w-7xl mx-auto px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Left Column - Hero Content */}
              <div className="space-y-12 animate-fade-in-up">
                {/* Hero Heading */}
                <div className="space-y-6">
                  <div className="inline-flex items-center px-6 py-3 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mr-3 animate-pulse" />
                    <span className="text-primary font-semibold text-sm tracking-wide uppercase">Microsoft Fluent Design</span>
                  </div>
                  
                  <h1 className="font-light text-white leading-none tracking-tight">
                    <span className="text-5xl lg:text-6xl">Operation Readiness</span>,
                    <span className="block text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-white to-primary/90 bg-clip-text text-transparent">
                      Start-Up & Handover
                    </span>
                  </h1>
                  
                  <p className="text-2xl text-white/85 font-light leading-relaxed max-w-2xl">
                    Transform your project handover experience with our comprehensive platform. 
                    Built for <span className="font-semibold text-white">Basrah Gas Company</span> with 
                    enterprise-grade security and compliance.
                  </p>
                </div>
                
                {/* Feature Highlights */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-card/20 border border-border/20 rounded-2xl p-6 backdrop-blur-sm hover:bg-card/30 transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <div className="w-6 h-6 rounded bg-gradient-to-br from-destructive to-destructive/80" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">Safe Start-Up</h3>
                    <p className="text-white/70 text-sm">PSSR compliance and safety protocols</p>
                  </div>
                  
                  <div className="bg-card/20 border border-border/20 rounded-2xl p-6 backdrop-blur-sm hover:bg-card/30 transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary/80" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">P2O Handover</h3>
                    <p className="text-white/70 text-sm">Seamless asset transition management</p>
                  </div>
                </div>
                
                {/* CTA Section */}
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <Button 
                      onClick={() => setShowAuth(true)} 
                      size="lg"
                      className="bg-primary hover:bg-primary-hover text-primary-foreground px-12 py-6 text-xl font-semibold shadow-fluent-2xl hover:shadow-fluent-2xl/60 transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 rounded-2xl group border-0 relative overflow-hidden"
                    >
                      {/* Button background effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-hover to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 flex items-center">
                        Access ORSH Platform
                        <ArrowLeft className="h-6 w-6 ml-4 rotate-180 group-hover:translate-x-2 transition-transform duration-300" />
                      </span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      size="lg"
                      className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 px-8 py-6 text-lg font-medium rounded-2xl backdrop-blur-sm transition-all duration-300"
                    >
                      Learn More
                    </Button>
                  </div>
                  
                  {/* Trust Indicators */}
                  <div className="flex items-center gap-8 text-white/70">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-success animate-pulse-subtle" />
                      <span className="text-lg font-medium">Enterprise Secure</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-primary animate-pulse-subtle" />
                      <span className="text-lg font-medium">ISO Compliant</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-warning animate-pulse-subtle" />
                      <span className="text-lg font-medium">24/7 Support</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Feature Cards */}
              <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                {/* Main Feature Card */}
                <div className="bg-card/20 border border-border/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl hover:shadow-3xl transition-all duration-500 group hover:bg-card/30">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-white">Platform Overview</h3>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary/80" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-2xl bg-card/30 border border-border/10 backdrop-blur-sm hover:bg-card/40 transition-colors duration-300">
                        <div className="text-3xl font-bold text-primary mb-1">2</div>
                        <div className="text-white/70 text-sm">Core Modules</div>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-card/30 border border-border/10 backdrop-blur-sm hover:bg-card/40 transition-colors duration-300">
                        <div className="text-3xl font-bold text-primary mb-1">SSO</div>
                        <div className="text-white/70 text-sm">Authentication</div>
                      </div>
                    </div>
                    
                    <p className="text-white/80 leading-relaxed">
                      Comprehensive operational readiness platform designed for energy sector compliance and safety management.
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-card/20 border border-border/20 rounded-2xl p-6 backdrop-blur-sm text-center hover:bg-card/30 transition-all duration-300 group">
                    <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">100%</div>
                    <div className="text-white/70">Compliance Ready</div>
                  </div>
                  <div className="bg-card/20 border border-border/20 rounded-2xl p-6 backdrop-blur-sm text-center hover:bg-card/30 transition-all duration-300 group">
                    <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">24/7</div>
                    <div className="text-white/70">System Availability</div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </main>
      )}

      <AuthenticationModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
};

export default Index;

