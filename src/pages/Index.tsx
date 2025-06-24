
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
          {/* BGC Logo with Text */}
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
              alt="BGC Logo" 
              className="h-16 w-auto mr-4"
            />
            <div className="flex flex-col">
              <h1 className="font-bold text-white mb-1 text-3xl">Basrah Gas Company</h1>
              <p className="text-2xl text-white" dir="rtl">شركة البصرة للغاز</p>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-8 drop-shadow-lg">Welcome to the Project-to-Asset Management System</h1>
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
