import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppProvider } from "@/store";
import { Spinner } from "@/components/ui/Spinner";
import { ProjectLayout } from "@/components/layout/ProjectLayout";
import { NavSidebarProvider } from "@/components/layout/NavSidebarContext";
import { NavSidebar } from "@/components/layout/NavSidebar";
import { useSession } from "@/lib/auth";

const Login = React.lazy(() => import("./pages/Login"));
const Home = React.lazy(() => import("./pages/Home"));
const Projects = React.lazy(() => import("./pages/Projects"));
const DataManager = React.lazy(() => import("./pages/DataManager"));
const LabelingInterface = React.lazy(() => import("./pages/LabelingInterface"));
const ProjectSettings = React.lazy(() => import("./pages/ProjectSettings"));
const ProjectDashboard = React.lazy(() => import("./pages/ProjectDashboard"));
const ProjectMembers = React.lazy(() => import("./pages/ProjectMembers"));
const OrganizationMembersPage = React.lazy(() => import("./pages/OrganizationMembersPage"));
const PerformanceDashboardPage = React.lazy(() => import("./pages/PerformanceDashboardPage"));
const AccountSettings = React.lazy(() => import("./pages/AccountSettings"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size={40} />
    </div>
  );
}

/** Gates all protected routes. Shows the nav sidebar only when authenticated. */
function RequireAuth() {
  const { data: session, isPending } = useSession();

  if (isPending) return <LoadingFallback />;
  if (!session?.user) return <Navigate to="/login" replace />;

  return (
    <NavSidebarProvider>
      <NavSidebar />
      <Outlet />
    </NavSidebarProvider>
  );
}

const App = () => (
  <AppProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected — requires an active session */}
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Home />} />
                <Route path="/projects" element={<Projects />} />

                <Route path="/projects/:projectId" element={<ProjectLayout />}>
                  <Route index element={<DataManager />} />
                  <Route path="data" element={<DataManager />} />
                  <Route path="dashboard" element={<ProjectDashboard />} />
                  <Route path="members" element={<ProjectMembers />} />
                  <Route path="settings" element={<ProjectSettings />} />
                  <Route path="label/:taskId?" element={<LabelingInterface />} />
                </Route>

                <Route path="/organization/members" element={<OrganizationMembersPage />} />
                <Route path="/performance/members" element={<PerformanceDashboardPage />} />
                <Route path="/account/settings" element={<AccountSettings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppProvider>
);

export default App;
