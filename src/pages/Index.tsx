import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, FileCheck, Headphones, ClipboardCheck, Key } from "lucide-react";
import { useAuth } from "@/components/enhanced-auth/AuthProvider";
import EnhancedAuthModal from "@/components/enhanced-auth/EnhancedAuthModal";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import OrshLogo from "@/components/ui/OrshLogo";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const [showAuth, setShowAuth] = useState(false);
  const { session, signOut } = useAuth();
  const isAuthenticated = !!session;
  const navigate = useNavigate();
  const location = useLocation();
  const { translations: t } = useLanguage();
  
  // Get current section from URL path
  const currentSection = location.pathname === '/' ? null : location.pathname.slice(1);
  
  const handleAuthenticated = () => {
    setShowAuth(false);
    // Navigate to home after authentication
    navigate('/home');
  };

  useEffect(() => {
    if (session && showAuth) {
      setShowAuth(false);
    }
  }, [session, showAuth]);

  // If authenticated and on root, redirect to /home (which has the sidebar layout)
  useEffect(() => {
    if (isAuthenticated && location.pathname === '/') {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  // If authenticated but on root, show nothing while redirecting
  if (isAuthenticated && location.pathname === '/') {
    return null;
  }

  // Show welcome screen before authentication
  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundSlideshow showFunFacts={false} />
      
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Empty spacer for layout balance */}
            <div className="w-24" />
            
            {/* ORSH Logo - Center */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <OrshLogo size="medium" />
            </div>
            
            {/* BGC Logo - Right */}
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/421778ce-4ffe-4e3b-b370-8d1bb24a3d51.png" 
                alt="BGC Logo" 
                className="h-12 w-auto drop-shadow-lg"
              />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      {!showAuth && (
        <main className="relative z-10 flex items-center justify-center min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            
            {/* Hero Text */}
            <div className="space-y-4 animate-fade-in">
              <h1 className="font-light text-white leading-tight">
                <span className="block text-5xl md:text-6xl lg:text-7xl font-extralight tracking-tight drop-shadow-2xl">
                  {t.welcomeTitle}
                </span>
                <span className="block text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-cyan-100 to-blue-100 bg-clip-text text-transparent mt-2 drop-shadow-xl">
                  {t.welcomeSubtitle}
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-white/85 font-light leading-relaxed max-w-2xl mx-auto">
                {t.welcomeDescription}
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* PSSR Card */}
              <div className="group relative p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02] transition-all duration-300 shadow-xl">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ClipboardCheck className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{t.safeStartup}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{t.safeStartupDesc}</p>
                </div>
              </div>
              
              {/* P2O Card */}
              <div className="group relative p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02] transition-all duration-300 shadow-xl">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Key className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{t.p2oHandover}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{t.p2oHandoverDesc}</p>
                </div>
              </div>
            </div>
            
            {/* CTA Button */}
            <div className="space-y-6">
              <Button 
                onClick={() => setShowAuth(true)} 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-10 py-6 text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 rounded-xl"
              >
                {t.accessButton}
                <ArrowRight className="h-5 w-5 ml-3" />
              </Button>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-white/75">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium">{t.enterpriseSecure}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{t.isoCompliant}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium">{t.support24}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      <EnhancedAuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
};

export default Index;
