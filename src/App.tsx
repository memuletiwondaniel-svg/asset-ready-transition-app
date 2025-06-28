
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UsersProvider } from "@/contexts/UsersContext";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProjectList from "./pages/ProjectList";
import UserList from "./pages/UserList";
import PSSRChecklistPage from "./pages/PSSRChecklistPage";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <UsersProvider>
          <ProjectsProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/projects" element={<ProjectList />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/pssr-checklists" element={<PSSRChecklistPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ProjectsProvider>
        </UsersProvider>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
