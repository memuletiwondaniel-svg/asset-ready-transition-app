import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthProvider } from "@/components/enhanced-auth/AuthProvider";
import EnhancedAuthModal from "@/components/enhanced-auth/EnhancedAuthModal";
import SafeStartupSummaryPage from "@/components/SafeStartupSummaryPage";
import LandingPage from "@/components/LandingPage";
import UserManagement from "@/pages/UserManagement";
import AdminToolsPage from "@/components/AdminToolsPage";
import ManageChecklistPage from "@/components/ManageChecklistPage";

const Index = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);

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

  // Show specific section based on navigation
  if (isAuthenticated && currentSection) {
    switch (currentSection) {
      case 'safe-startup':
        return <SafeStartupSummaryPage onBack={handleBackToLanding} />;
      case 'users':
        return <UserManagement onBack={handleBackToLanding} />;
      case 'manage-checklist':
        return <ManageChecklistPage onBack={handleBackToLanding} />;
      case 'admin-tools':
        return <AdminToolsPage onBack={handleBackToLanding} />;
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

  // Show only authentication modal - no welcome screen
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <EnhancedAuthModal
          isOpen={true}
          onClose={() => {}}
          onAuthenticated={handleAuthenticated}
        />
      </div>
    </AuthProvider>
  );
};

export default Index;