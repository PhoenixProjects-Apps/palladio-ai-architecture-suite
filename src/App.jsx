import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import About from './pages/About';
import Contact from './pages/Contact';
import AgentBible from './pages/AgentBible';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
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
    <div className="fixed inset-0 bg-[#0f1117] flex flex-col items-center justify-center p-6 text-center z-50">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-6">
        <LogIn size={32} className="text-cyan-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Sign in to continue</h2>
      <p className="text-slate-400 max-w-md mb-8">Create an account or sign in to access your private data.</p>
      <Button onClick={navigateToLogin} className="bg-white text-black hover:bg-slate-200 px-8 py-6 rounded-xl font-semibold text-lg">
        Sign In / Sign Up
      </Button>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      
      {Object.entries(Pages).map(([path, Page]) => {
        const isPublic = publicPages.includes(path);
        const element = (
          <LayoutWrapper currentPageName={path}>
            <Page />
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
      
      <Route path="/about" element={<LayoutWrapper currentPageName="About"><About /></LayoutWrapper>} />
      <Route path="/contact" element={<LayoutWrapper currentPageName="Contact"><Contact /></LayoutWrapper>} />
      <Route path="/AgentBible" element={<LayoutWrapper currentPageName="AgentBible"><AgentBible /></LayoutWrapper>} />
      <Route path="/PrivacyPolicy" element={<LayoutWrapper currentPageName="PrivacyPolicy"><PrivacyPolicy /></LayoutWrapper>} />
      <Route path="/TermsOfService" element={<LayoutWrapper currentPageName="TermsOfService"><TermsOfService /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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