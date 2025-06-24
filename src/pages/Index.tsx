
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

  if (isAuthenticated) {
    return <PSSRModule />;
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <BackgroundSlideshow />
      
      <div className="relative z-10 text-center text-white">
        <h1 className="text-4xl font-bold mb-8 drop-shadow-lg">
          Welcome to P2A System
        </h1>
        <Button 
          onClick={() => setShowAuth(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg shadow-lg"
        >
          Access System
        </Button>
      </div>

      <AuthenticationModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
};

export default Index;
