import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/enhanced-auth/AuthProvider";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import { WidgetSizeProvider } from "@/contexts/WidgetSizeContext";
import { PageTransition } from "@/components/PageTransition";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { ORPLandingPage } from "@/components/orp/ORPLandingPage";
import { ORPDetailsPage } from "@/components/orp/ORPDetailsPage";
import { ORPAnalyticsPage } from "@/components/orp/ORPAnalyticsPage";
import { P2ALandingPage } from "@/components/p2a/P2ALandingPage";
import { P2ADetailsPage } from "@/components/p2a/P2ADetailsPage";
import { P2AAnalyticsPage } from "@/components/p2a/P2AAnalyticsPage";
import { ORMLandingPage } from "@/components/orm/ORMLandingPage";
import { ORMDetailsPage } from "@/components/orm/ORMDetailsPage";
import { ORMAnalyticsDashboard } from "@/components/orm/ORMAnalyticsDashboard";
import { ORMResourceCapacityDashboard } from "@/components/orm/ORMResourceCapacityDashboard";
import { ORMNotificationPreferences } from "@/components/orm/ORMNotificationPreferences";
import ProjectManagementPage from "@/components/project/ProjectManagementPage";
import ProjectDetailsPage from "@/pages/ProjectDetailsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="orsh-theme">
      <AuthProvider>
        <WidgetSizeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <BreadcrumbProvider>
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/pssr" element={<Index />} />
                    <Route path="/users" element={<Index />} />
                    <Route path="/manage-checklist" element={<Index />} />
                    <Route path="/admin-tools" element={<Index />} />
                    <Route path="/projects" element={<Index />} />
                    <Route path="/project/:id" element={<ProjectDetailsPage />} />
        <Route path="/operation-readiness" element={<ORPLandingPage />} />
        <Route path="/operation-readiness/analytics" element={<ORPAnalyticsPage />} />
        <Route path="/operation-readiness/:id" element={<ORPDetailsPage />} />
            <Route path="/p2a-handover" element={<P2ALandingPage />} />
            <Route path="/p2a-handover/analytics" element={<P2AAnalyticsPage />} />
            <Route path="/p2a-handover/:id" element={<P2ADetailsPage />} />
            <Route path="/or-maintenance" element={<ORMLandingPage />} />
            <Route path="/or-maintenance/analytics" element={<ORMAnalyticsDashboard />} />
          <Route path="/or-maintenance/resources" element={<ORMResourceCapacityDashboard />} />
          <Route path="/or-maintenance/notifications" element={<ORMNotificationPreferences />} />
            <Route path="/or-maintenance/:id" element={<ORMDetailsPage />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PageTransition>
              </BreadcrumbProvider>
            </BrowserRouter>
          </TooltipProvider>
        </WidgetSizeProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
