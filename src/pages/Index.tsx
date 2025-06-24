
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AuthenticationModal from "@/components/AuthenticationModal";
import PSSRModule from "@/components/PSSRModule";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";

const Index = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setShowAuth(false);
  };

  const handleBack = () => {
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return <PSSRModule onBack={handleBack} />;
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <BackgroundSlideshow showFunFacts={showAuth} />
      
      {!showAuth && (
        <div className="relative z-10 text-center text-white bg-gray-900/30 backdrop-blur-sm rounded-lg p-8 shadow-lg">
          {/* BGC Logo - Text Version */}
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Basrah Gas Company</h1>
            <p className="text-2xl text-white" dir="rtl">شركة البصرة للغاز</p>
          </div>
          
          <h1 className="text-4xl font-bold mb-8 drop-shadow-lg">
            Welcome to BGC's Project-to-Asset Management System
          </h1>
          <Button 
            onClick={() => setShowAuth(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg shadow-lg"
          >
            Access the P2A Application
          </Button>
        </div>
      )}

      <AuthenticationModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
};

export default Index;
