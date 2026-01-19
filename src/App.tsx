import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/enhanced-auth/AuthProvider";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import { WidgetSizeProvider } from "@/contexts/WidgetSizeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AuthenticatedLayout from "@/components/layouts/AuthenticatedLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { ORPLandingPage } from "@/components/orp/ORPLandingPage";
import { ORPDetailsPage } from "@/components/orp/ORPDetailsPage";
import { ORPAnalyticsPage } from "@/components/orp/ORPAnalyticsPage";
import { P2ALandingPage } from "@/components/p2a/P2ALandingPage";
import { P2ADetailsPage } from "@/components/p2a/P2ADetailsPage";

import { ORMLandingPage } from "@/components/orm/ORMLandingPage";
import { ORMDetailsPage } from "@/components/orm/ORMDetailsPage";
import { ORMAnalyticsDashboard } from "@/components/orm/ORMAnalyticsDashboard";
import { ORMResourceCapacityDashboard } from "@/components/orm/ORMResourceCapacityDashboard";
import { ORMNotificationPreferences } from "@/components/orm/ORMNotificationPreferences";
import ProjectManagementPage from "@/components/project/ProjectManagementPage";
import ProjectDetailsPage from "@/pages/ProjectDetailsPage";
import PSSRApproverDashboard from "@/pages/PSSRApproverDashboard";
import PSSRItemReview from "@/pages/PSSRItemReview";
import PSSRApprovalPage from "@/pages/PSSRApprovalPage";
import PSSRDetailsPage from "@/pages/PSSRDetailsPage";

// Create QueryClient outside component to prevent recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="orsh-theme">
      <LanguageProvider>
        <AuthProvider>
          <WidgetSizeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <BreadcrumbProvider>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/auth" element={<AuthPage />} />
                    
                    {/* Root handles both welcome (unauthenticated) and home (authenticated) */}
                    <Route path="/" element={<Index />} />
                    
                    {/* Authenticated routes with persistent sidebar layout */}
                    <Route element={<AuthenticatedLayout />}>
                      <Route path="/home" element={<Index />} />
                      <Route path="/pssr" element={<Index />} />
                      <Route path="/users" element={<Index />} />
                      <Route path="/manage-checklist" element={<Index />} />
                      <Route path="/admin-tools" element={<Index />} />
                      <Route path="/projects" element={<Index />} />
                      <Route path="/project-management" element={<ProjectManagementPage />} />
                      <Route path="/project/:id" element={<ProjectDetailsPage />} />
                      <Route path="/pssr/approver-dashboard" element={<PSSRApproverDashboard />} />
                      <Route path="/pssr-reviews" element={<PSSRApproverDashboard />} />
                      <Route path="/my-tasks" element={<PSSRApproverDashboard />} />
                      <Route path="/pssr/:id/review" element={<PSSRItemReview />} />
                      <Route path="/pssr/:id/approve" element={<PSSRApprovalPage />} />
                      <Route path="/pssr/:id" element={<PSSRDetailsPage />} />
                      <Route path="/operation-readiness" element={<ORPLandingPage />} />
                      <Route path="/operation-readiness/analytics" element={<ORPAnalyticsPage />} />
                      <Route path="/operation-readiness/:id" element={<ORPDetailsPage />} />
                      <Route path="/p2a-handover" element={<P2ALandingPage />} />
                      <Route path="/p2a-handover/:id" element={<P2ADetailsPage />} />
                      <Route path="/or-maintenance" element={<ORMLandingPage />} />
                      <Route path="/or-maintenance/analytics" element={<ORMAnalyticsDashboard />} />
                      <Route path="/or-maintenance/resources" element={<ORMResourceCapacityDashboard />} />
                      <Route path="/or-maintenance/notifications" element={<ORMNotificationPreferences />} />
                      <Route path="/or-maintenance/:id" element={<ORMDetailsPage />} />
                    </Route>
                    
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BreadcrumbProvider>
              </BrowserRouter>
            </TooltipProvider>
          </WidgetSizeProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
