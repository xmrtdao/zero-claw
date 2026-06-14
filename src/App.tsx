import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// ALL pages lazy-loaded to minimize initial bundle
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
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

const PageLoader = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-[#06060a]">
    <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
  </div>
);

// Simple wrapper that provides contexts without heavy providers
function MinimalProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <MinimalProviders>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
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
            </Routes>
          </Suspense>
        </MinimalProviders>
      </ErrorBoundary>
    </HashRouter>
  );
}
