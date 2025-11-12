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
                    <Route path="/safe-startup" element={<Index />} />
                    <Route path="/users" element={<Index />} />
                    <Route path="/manage-checklist" element={<Index />} />
                    <Route path="/admin-tools" element={<Index />} />
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
