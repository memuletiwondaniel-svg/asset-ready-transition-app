import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PSSRSummaryPage from "@/components/PSSRSummaryPage";
import AdminToolsPage from "@/components/AdminToolsPage";
import UserManagement from "@/pages/UserManagement";

export const PssrRoutePage = () => {
  const navigate = useNavigate();
  const handleBack = useCallback(() => navigate("/home"), [navigate]);

  return <PSSRSummaryPage onBack={handleBack} />;
};

export const AdminToolsRoutePage = () => {
  const navigate = useNavigate();
  const handleBack = useCallback(() => navigate("/home"), [navigate]);

  return <AdminToolsPage onBack={handleBack} />;
};

export const AdminUsersRoutePage = () => <UserManagement />;