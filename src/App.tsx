import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";

// Eagerly load Landing (first page users see)
import Landing from "./pages/Landing";

// Lazy load all other pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Credentials = lazy(() => import("./pages/Credentials"));
const Council = lazy(() => import("./pages/Council"));
const Governance = lazy(() => import("./pages/Governance"));
const Licensing = lazy(() => import("./pages/Licensing"));
const Admin = lazy(() => import("./pages/Admin"));
const Earn = lazy(() => import("./pages/Earn"));
const MiningDashboard = lazy(() => import("./pages/MiningDashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const InboxPage = lazy(() => import("./pages/Inbox"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Chat = lazy(() => import("./pages/Chat"));

// Simple loading fallback for lazy routes
const PageLoader = () => (
  <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-[#06060a]">
    <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <TooltipProvider>
            <a href="#main-content" className="skip-link" aria-label="Skip to main content">
              Skip to main content
            </a>

            <HashRouter>
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />

                    {/* Protected routes */}
                    <Route element={<ProtectedLayout />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/council" element={<Council />} />
                      <Route path="/earn" element={<Earn />} />
                      <Route path="/mining-dashboard" element={<MiningDashboard />} />
                      <Route path="/governance" element={<Governance />} />
                      <Route path="/licensing" element={<Licensing />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/inbox" element={<InboxPage />} />
                      <Route path="/chat" element={<Chat />} />
                    </Route>
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </HashRouter>

            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AudioProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
