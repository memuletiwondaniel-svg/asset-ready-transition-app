import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LandingPage from "@/components/LandingPage";

const HomePage = () => {
  const navigate = useNavigate();

  const handleNavigate = useCallback((section: string) => {
    const routes: Record<string, string> = {
      home: "/home",
      "operation-readiness": "/operation-readiness",
    };

    navigate(routes[section] || `/${section}`);
  }, [navigate]);

  return <LandingPage onBack={() => undefined} onNavigate={handleNavigate} />;
};

export default HomePage;