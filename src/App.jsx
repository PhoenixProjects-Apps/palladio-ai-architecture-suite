import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import React, { Suspense } from 'react';
import About from './pages/About';
import Contact from './pages/Contact';
import AgentBible from './pages/AgentBible';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import PageLoader from '@/components/PageLoader';

const Floorplan3D = React.lazy(() => import('./pages/Floorplan3D'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AnimatedRouteWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.2 }}
    className="min-h-full flex flex-col w-full"
  >
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  </motion.div>
);

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  const publicPages = ['Home', 'About', 'Contact', 'PrivacyPolicy', 'TermsOfService', 'AgentBible', 'PalladioPricing'];
  
  const UnauthenticatedFallback = () => (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 text-center z-50">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <LogIn size={32} className="text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Sign in to continue</h2>
      <p className="text-muted-foreground max-w-md mb-8">Create an account or sign in to access your private data.</p>
      <Button onClick={navigateToLogin} variant="default" className="px-8 py-6 rounded-xl font-semibold text-lg">
        Sign In / Sign Up
      </Button>
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <AnimatedRouteWrapper><MainPage /></AnimatedRouteWrapper>
          </LayoutWrapper>
        } />
        
        {Object.entries(Pages).map(([path, Page]) => {
          const isPublic = publicPages.includes(path);
          const element = (
            <LayoutWrapper currentPageName={path}>
              <AnimatedRouteWrapper><Page /></AnimatedRouteWrapper>
            </LayoutWrapper>
          );
        
        if (isPublic) {
          return <Route key={path} path={`/${path}`} element={element} />;
        }
        
        return (
          <Route key={path} path={`/${path}`} element={
            <ProtectedRoute unauthenticatedElement={<UnauthenticatedFallback />}>
              {element}
            </ProtectedRoute>
          } />
        );
      })}
      
      <Route path="/about" element={<LayoutWrapper currentPageName="About"><AnimatedRouteWrapper><About /></AnimatedRouteWrapper></LayoutWrapper>} />
      <Route path="/contact" element={<LayoutWrapper currentPageName="Contact"><AnimatedRouteWrapper><Contact /></AnimatedRouteWrapper></LayoutWrapper>} />
      <Route path="/AgentBible" element={<LayoutWrapper currentPageName="AgentBible"><AnimatedRouteWrapper><AgentBible /></AnimatedRouteWrapper></LayoutWrapper>} />
      <Route path="/PrivacyPolicy" element={<LayoutWrapper currentPageName="PrivacyPolicy"><AnimatedRouteWrapper><PrivacyPolicy /></AnimatedRouteWrapper></LayoutWrapper>} />
      <Route path="/TermsOfService" element={<LayoutWrapper currentPageName="TermsOfService"><AnimatedRouteWrapper><TermsOfService /></AnimatedRouteWrapper></LayoutWrapper>} />
      <Route path="/Floorplan3D" element={<LayoutWrapper currentPageName="Floorplan3D"><AnimatedRouteWrapper><Floorplan3D /></AnimatedRouteWrapper></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </AnimatePresence>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App