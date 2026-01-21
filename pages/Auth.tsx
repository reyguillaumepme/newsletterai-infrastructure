import React, { useState, useTransition } from 'react';
import { Mail, Lock, Loader2, ArrowRight, Sparkles, Shield, User, ChevronRight, AlertTriangle, ExternalLink, Settings, Database, PlayCircle, UserX, Zap, Info, Copy, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';
import { databaseService } from '../services/databaseService';

interface AuthProps {
  onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [appMode, setAppMode] = useState<'demo' | 'production'>('production');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initialisation...');
  const [isPending, startTransition] = useTransition();
  
  const [formData, setFormData] = useState({ 
    email: 'rey.guillaume.pme@gmail.com', 
    password: '' 
  });
  
  const [error, setError] = useState('');

  const handleDemoLogin = async () => {
    setIsGoogleLoading(true);
    setLoadingMessage('Préparation du bac à sable démo...');
    setError('');
    
    try {
      const user = await authService.signInWithGoogle('cloud.demo@nwsletteria.online', 'demo');
      
      if (user && 'id' in user) {
        setLoadingMessage('Génération des données mockup...');
        await databaseService.initializeDemoData(user.id);
      }
      
      setLoadingMessage('Entrée dans l\'interface...');
      // On attend un court délai pour l'effet visuel puis on transitionne
      setTimeout(() => {
        startTransition(() => {
          onLoginSuccess();
        });
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Échec de l\'initialisation du mode démo.');
      setIsGoogleLoading(false);
    }
  };

  const startGoogleFlow = async () => {
    if (appMode === 'demo') {
      await handleDemoLogin();
      return;
    }

    setIsGoogleLoading(true);
    setLoadingMessage('Redirection vers Google...');
    setError('');

    try {
      await authService.signInWithGoogle(undefined, 'production');
    } catch (err: any) {
      console.error("Auth Error Object:", err);
      setError(err.message || 'Échec de la connexion Google OAuth.');
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        await authService.signIn(formData.email, formData.password, appMode);
        startTransition(() => {
          onLoginSuccess();
        });
      } else {
        await authService.signUp(formData.email, formData.password, appMode);
        startTransition(() => {
          setIsLogin(true);
          setIsLoading(false);
          setError("Compte créé. Connectez-vous maintenant.");
        });
      }
    } catch (err: any) {
      setError(err.message || 'Erreur d\'authentification.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFDFD] p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
        
        <div className="flex justify-center mb-4">
          <div className="bg-white border border-gray-100 p-1.5 rounded-2xl shadow-sm flex gap-1">
            <button 
              onClick={() => startTransition(() => setAppMode('production'))}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${appMode === 'production' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Database size={14} /> Infrastructure (Prod)
            </button>
            <button 
              onClick={handleDemoLogin}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${appMode === 'demo' ? 'bg-primary text-gray-900 shadow-lg' : 'text-gray-400 hover:text-gray-900 bg-gray-50'}`}
            >
              <Zap size={14} fill={appMode === 'demo' ? 'currentColor' : 'none'} className={appMode === 'demo' ? '' : 'text-primary'} /> 
              Lancer la Démo (Instantané)
            </button>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight font-['Sora']">
            Newsletter<span className="text-primary">AI</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            {appMode === 'production' ? 'Infrastructure SaaS connectée via Supabase.' : 'Accès instantané au bac à sable IA.'}
          </p>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
          
          <div className="space-y-6">
            <button 
              onClick={startGoogleFlow} 
              disabled={isGoogleLoading || isPending}
              className="w-full py-4 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl font-bold shadow-sm transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {(isGoogleLoading || isPending) ? (
                <Loader2 className="animate-spin text-primary" size={20} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              {appMode === 'demo' ? 'Entrer en Mode Démo' : 'Continuer avec Google'}
            </button>

            <div className="relative flex items-center justify-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">ou identifiants</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="nom@entreprise.com" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-primary/20 transition-all font-medium text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Mot de passe</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-primary/20 transition-all font-medium text-sm" />
              </div>
              
              {error && (
                <div className="p-3 rounded-xl border flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300 bg-red-50 border-red-100 text-red-600">
                  <AlertTriangle size={14} className="shrink-0" />
                  <p className="text-[10px] font-bold leading-tight">{error}</p>
                </div>
              )}

              <button type="submit" disabled={isLoading || isPending} className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold shadow-xl shadow-gray-200 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-3 disabled:opacity-50">
                {(isLoading || isPending) ? <Loader2 className="animate-spin" size={18} /> : <>{isLogin ? 'Se connecter' : 'Créer un compte'} <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>

          <div className="flex justify-center mt-6">
            <button 
              onClick={() => startTransition(() => setIsLogin(!isLogin))}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
            >
              {isLogin ? "Créer un compte professionnel" : "Déjà un compte ? Se connecter"}
            </button>
          </div>

          {(isGoogleLoading || isPending) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm z-50 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 relative">
                 <Loader2 className="animate-spin text-primary absolute" size={40} strokeWidth={3} />
                 {appMode === 'demo' ? <Zap className="text-primary" size={20} fill="currentColor" /> : <Database className="text-primary" size={20} />}
              </div>
              <p className="font-bold text-gray-900 text-sm text-center px-8">{loadingMessage}</p>
              <button onClick={() => window.location.reload()} className="mt-4 text-[10px] font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest">Annuler / Recharger</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;