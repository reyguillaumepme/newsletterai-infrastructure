import React, { useEffect, useState, useTransition } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Brands from './pages/Brands';
import BrandDetail from './pages/BrandDetail';
import Ideas from './pages/Ideas';
import Newsletters from './pages/Newsletters';
import NewsletterDetail from './pages/NewsletterDetail';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import Unsubscribe from './pages/Unsubscribe';
import { authService, getSupabaseClient } from './services/authService';
import { databaseService } from './services/databaseService';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const initSupabaseAuth = () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            authService.syncSupabaseUser(session.user).then(syncedUser => {
               if (syncedUser) {
                 startTransition(() => {
                   setUser(syncedUser);
                 });
               }
            });
          } else if (event === 'SIGNED_OUT') {
            startTransition(() => {
              setUser(null);
            });
          }
        });
      } catch (e) {
        console.error("Erreur init Supabase Auth Listener:", e);
      }
    }
  };

  const checkAuth = async () => {
    const currentUser = authService.getCurrentUser();
    
    if (currentUser) {
      const hasLocalConfig = localStorage.getItem('SUPABASE_URL');
      if (!hasLocalConfig) {
        await authService.restoreConfigFromCloud();
      }
      
      startTransition(() => {
        setUser(currentUser);
      });
      
      await databaseService.testConnection();
      initSupabaseAuth();
    }
  };

  useEffect(() => {
    const initApp = async () => {
      await checkAuth();
      startTransition(() => {
        setIsInitializing(false);
      });
    };
    initApp();
  }, []);

  const handleLoginSuccess = async () => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      await authService.restoreConfigFromCloud();
    }
    startTransition(() => {
      setUser(currentUser);
      initSupabaseAuth();
    });
  };

  const handleLogout = async () => {
    await authService.signOut();
    startTransition(() => {
      setUser(null);
    });
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-gray-400 animate-pulse text-[10px] uppercase tracking-widest">Initialisation...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        
        {!user ? (
          <>
            <Route path="/auth" element={<Auth onLoginSuccess={handleLoginSuccess} />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </>
        ) : (
          <Route path="*" element={
            <div className={`flex min-h-screen bg-[#FDFDFD] text-gray-900 transition-opacity duration-300 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
              <Sidebar onLogout={handleLogout} />
              <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
                <React.Suspense fallback={
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Chargement...</p>
                  </div>
                }>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/newsletters" element={<Newsletters />} />
                    <Route path="/newsletters/:id" element={<NewsletterDetail />} />
                    <Route path="/ideas" element={<Ideas />} />
                    <Route path="/brands" element={<Brands />} />
                    <Route path="/brands/:id" element={<BrandDetail />} />
                    <Route path="/statistics" element={<Statistics />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </React.Suspense>
              </main>
            </div>
          } />
        )}
      </Routes>
    </Router>
  );
};

export default App;