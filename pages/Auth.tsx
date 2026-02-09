import React, { useState, useTransition } from 'react';
import { Loader2, ArrowRight, Database, AlertTriangle, Mail, Lock, User, Check, X, Eye, EyeOff } from 'lucide-react';
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

  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    setPasswordStrength(score);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setFormData({ ...formData, password: newVal });
    checkPasswordStrength(newVal);
  };

  const getFriendlyErrorMessage = (err: any) => {
    const msg = err?.message || '';
    if (msg.includes('User already registered') || msg.includes('unique constraint')) {
      return "Cette adresse email est déjà associée à un compte. Veuillez vous connecter.";
    }
    if (msg.includes('Invalid login credentials')) {
      return "Email ou mot de passe incorrect.";
    }
    if (msg.includes('Password should be at least')) {
      return "Le mot de passe doit contenir au moins 6 caractères.";
    }
    if (msg.includes('rate limit')) {
      return "Trop de tentatives. Veuillez réessayer plus tard.";
    }
    return "Une erreur est survenue lors de l'authentification. Veuillez réessayer.";
  };

  const startGoogleFlow = async () => {
    setIsGoogleLoading(true);
    setLoadingMessage('Redirection vers Google...');
    setError('');

    try {
      await authService.signInWithGoogle(undefined);
    } catch (err: any) {
      console.error("Auth Error Object:", err);
      setError(getFriendlyErrorMessage(err));
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
          throw new Error("Le mot de passe est trop faible. Il doit contenir au moins 8 caractères, un chiffre ou une majuscule.");
        }

        // Check if user exists explicitly before signing up
        const userExists = await authService.checkUserExists(formData.email);
        if (userExists) {
          throw new Error("Cette adresse email est déjà associée à un compte. Veuillez vous connecter.");
        }



        await authService.signUp(formData.email, formData.password);
        startTransition(() => {
          setIsLogin(true);
          setIsLoading(false);
          setError("");
          setSuccessMessage("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
        });
      }
    } catch (err: any) {
      let friendlyMsg = getFriendlyErrorMessage(err);

      // Keep specific internal errors
      if (err.message === "Les mots de passe ne correspondent pas." ||
        err.message.includes("trop faible") ||
        err.message.includes("déjà associée")) {
        friendlyMsg = err.message;
      }

      setError(friendlyMsg);
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    startTransition(() => {
      setIsLogin(!isLogin);
      setError('');
      setSuccessMessage('');
      setFormData({ email: '', password: '', confirmPassword: '' });
      setPasswordStrength(0);
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFDFD] p-6 relative overflow-hidden font-sans">
      {/* Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-[420px] z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2 font-['Sora']">
            Newsletter<span className="text-blue-600">AI</span>
          </h1>
          <p className="text-gray-500 font-medium">Votre assistant intelligent de création</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">

          {/* Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-gray-50/50">
            <button
              onClick={() => !isLogin && toggleMode()}
              className={`py-3 text-sm font-bold rounded-xl transition-all duration-200 ${isLogin
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              Connexion
            </button>
            <button
              onClick={() => isLogin && toggleMode()}
              className={`py-3 text-sm font-bold rounded-xl transition-all duration-200 ${!isLogin
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              Inscription
            </button>
          </div>

          <div className="p-8 pt-6">
            {/* Google Button */}
            <button
              onClick={startGoogleFlow}
              disabled={isGoogleLoading || isPending}
              className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 group"
            >
              {(isGoogleLoading || isPending) ? (
                <Loader2 className="animate-spin text-blue-600" size={20} />
              ) : (
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
              )}
              <span>Google</span>
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase bg-white px-4 text-gray-400 font-bold tracking-wider">ou</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">Email professionnel</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nom@entreprise.com"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">Mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-11 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm text-gray-900 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {!isLogin && formData.password && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                    <div className="flex gap-1 h-1 mb-2">
                      <div className={`flex-1 rounded-full transition-all duration-300 ${passwordStrength > 0 ? 'bg-red-400' : 'bg-gray-200'}`}></div>
                      <div className={`flex-1 rounded-full transition-all duration-300 ${passwordStrength > 1 ? 'bg-orange-400' : 'bg-gray-200'}`}></div>
                      <div className={`flex-1 rounded-full transition-all duration-300 ${passwordStrength > 2 ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
                      <div className={`flex-1 rounded-full transition-all duration-300 ${passwordStrength > 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium text-right">
                      {passwordStrength <= 1 && "Faible"}
                      {passwordStrength === 2 && "Moyen"}
                      {passwordStrength === 3 && "Bon"}
                      {passwordStrength === 4 && "Excellent"}
                    </p>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-gray-500 ml-1">Confirmation</label>
                  <div className="relative group">
                    <Check className={`absolute left-4 top-3.5 transition-colors ${formData.confirmPassword && formData.password === formData.confirmPassword ? 'text-green-500' : 'text-gray-400 group-focus-within:text-blue-500'}`} size={18} />
                    <input
                      required
                      type="password"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Répétez le mot de passe"
                      className={`w-full bg-gray-50/50 border rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 transition-all font-medium text-sm ${formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-red-200 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20 text-red-900'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
                        }`}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                  <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-red-800 mb-0.5">Erreur</p>
                    <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
                    {error.includes("déjà associée") && (
                      <button
                        type="button"
                        onClick={toggleMode}
                        className="mt-2 text-xs font-bold text-red-700 underline decoration-red-300 underline-offset-2 hover:decoration-red-700 transition-all"
                      >
                        Se connecter à ce compte
                      </button>
                    )}
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                  <Check size={18} className="text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-green-800 mb-0.5">Succès</p>
                    <p className="text-xs text-green-600 font-medium leading-relaxed">{successMessage}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || isPending}
                className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-gray-900/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {(isLoading || isPending) ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {isLogin ? 'Se connecter' : 'Créer un compte'}
                    <ArrowRight size={18} className="opacity-80" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer of Card */}
          <div className="bg-gray-50/80 border-t border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400 font-medium">
              En continuant, vous acceptez nos <a href="#" className="underline hover:text-gray-600">Conditions</a> et notre <a href="#" className="underline hover:text-gray-600">Politique de confidentialité</a>.
            </p>
          </div>
        </div>

      </div>

      {/* Loading Overlay */}
      {(isGoogleLoading || isPending) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md z-50 animate-in fade-in duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="font-bold text-gray-900 text-sm">{loadingMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;