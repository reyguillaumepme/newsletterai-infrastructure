import React, { useState, useTransition } from 'react';
import { Loader2, ArrowRight, Database, AlertTriangle } from 'lucide-react';
import { authService } from '../services/authService';

interface AuthProps {
  onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initialisation...');
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState('');

  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 5) score++;
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    setPasswordStrength(score);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setFormData({ ...formData, password: newVal });
    checkPasswordStrength(newVal);
  };

  const startGoogleFlow = async () => {
    setIsGoogleLoading(true);
    setLoadingMessage('Redirection vers Google...');
    setError('');

    try {
      await authService.signInWithGoogle(undefined);
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
        await authService.signIn(formData.email, formData.password);
        startTransition(() => {
          onLoginSuccess();
        });
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }
        if (passwordStrength < 2) {
          throw new Error("Le mot de passe est trop faible.");
        }
        await authService.signUp(formData.email, formData.password);
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

        <div className="text-center space-y-2 mt-12">
          <h1 className="text-4xl font-extrabold tracking-tight font-['Sora']">
            Newsletter<span className="text-primary">AI</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Infrastructure SaaS connectée via Supabase.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">

          <div className="space-y-6">
            <button
              onClick={startGoogleFlow}
              disabled={isGoogleLoading || isPending}
              className="w-full py-3.5 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl font-bold shadow-sm transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {(isGoogleLoading || isPending) ? (
                <Loader2 className="animate-spin text-primary" size={20} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
              )}
              Continuer avec Google
            </button>

            <div className="relative flex items-center justify-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">ou identifiants</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            {!isLogin && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-3 bg-primary/10 border border-primary text-center rounded-xl cursor-not-allowed opacity-100 scale-105 shadow-md shadow-primary/10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">DÉPART</div>
                  <div className="font-extrabold text-gray-900">Gratuit</div>
                </div>
                <div className="p-3 bg-gray-50 border border-transparent text-center rounded-xl opacity-60 grayscale">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">PRO</div>
                  <div className="font-bold text-gray-400">29€</div>
                </div>
                <div className="p-3 bg-gray-50 border border-transparent text-center rounded-xl opacity-60 grayscale">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">ELITE</div>
                  <div className="font-bold text-gray-400">99€</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="nom@entreprise.com" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-primary/20 transition-all font-medium text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Mot de passe</label>
                <input required type="password" value={formData.password} onChange={handlePasswordChange} placeholder="••••••••" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-primary/20 transition-all font-medium text-sm" />

                {!isLogin && formData.password && (
                  <div className="px-2 pt-1 flex gap-1 h-1.5">
                    <div className={`flex-1 rounded-full ${passwordStrength > 0 ? 'bg-red-400' : 'bg-gray-100'}`}></div>
                    <div className={`flex-1 rounded-full ${passwordStrength > 1 ? 'bg-yellow-400' : 'bg-gray-100'}`}></div>
                    <div className={`flex-1 rounded-full ${passwordStrength > 2 ? 'bg-green-400' : 'bg-gray-100'}`}></div>
                    <div className={`flex-1 rounded-full ${passwordStrength > 3 ? 'bg-green-500' : 'bg-gray-100'}`}></div>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Confirmation</label>
                  <input required type="password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Répétez le mot de passe" className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 transition-all font-medium text-sm ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'ring-2 ring-red-100 bg-red-50' : 'focus:ring-primary/20'}`} />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl border flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300 bg-red-50 border-red-100 text-red-600">
                  <AlertTriangle size={14} className="shrink-0" />
                  <p className="text-[10px] font-bold leading-tight">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || isPending}
                className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-3 disabled:opacity-50 ${isLogin ? 'bg-gray-900 hover:bg-black text-white shadow-gray-200' : 'bg-primary hover:bg-primary/90 text-gray-900 shadow-primary/30'}`}
              >
                {(isLoading || isPending) ? <Loader2 className="animate-spin" size={18} /> : <>{isLogin ? 'Se connecter' : 'Créer mon compte'} <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => startTransition(() => { setIsLogin(!isLogin); setError(''); setFormData({ email: '', password: '', confirmPassword: '' }); })}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
            >
              {isLogin ? "Créer un compte professionnel" : "Déjà un compte ? Se connecter"}
            </button>
          </div>

          {(isGoogleLoading || isPending) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm z-50 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 relative">
                <Loader2 className="animate-spin text-primary absolute" size={40} strokeWidth={3} />
                <Database className="text-primary" size={20} />
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