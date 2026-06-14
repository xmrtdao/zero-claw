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
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Credentials from "./pages/Credentials";
import Council from "./pages/Council";
import Governance from "./pages/Governance";
import Licensing from "./pages/Licensing";
import Admin from "./pages/Admin";
import Earn from "./pages/Earn";
import MiningDashboard from "./pages/MiningDashboard";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import InboxPage from "./pages/Inbox";
import AuthCallback from "./pages/AuthCallback";
import Chat from "./pages/Chat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <TooltipProvider>
            {/* Skip Navigation Link for Accessibility */}
            <a
              href="#main-content"
              className="skip-link"
              aria-label="Skip to main content"
            >
              Skip to main content
            </a>

            <HashRouter>
              <ErrorBoundary>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Protected routes - require authentication */}
                  <Route element={<ProtectedLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/council" element={<Council />} />
                    <Route path="/earn" element={<Earn />} />
                    <Route path="/mining-dashboard" element={<MiningDashboard />} />
                    <Route path="/governance" element={<Governance />} />
                    <Route path="/licensing" element={<Licensing />} />
                    <Route path="/credentials" element={<Credentials />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/inbox" element={<InboxPage />} />
                    <Route path="/chat" element={<Chat />} />
                    {/* Legacy redirects */}
                    <Route path="/treasury" element={<Earn />} />
                    <Route path="/contributors" element={<Earn />} />
                  </Route>
                </Routes>
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
