import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Mail,
  Shield,
  Key,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Zap,
  ZapOff,
  FileKey,
  User,
  Info,
  Sparkles,
  Layout,
  MousePointer2,
  Terminal
} from 'lucide-react';
import { authService } from '../services/authService';
import { databaseService } from '../services/databaseService';
import { Profile } from '../types';

const Settings: React.FC = () => {
  const user = authService.getCurrentUser();
  const isDemo = false;

  const [profile, setProfile] = useState<Profile | null>(null);

  // États Locaux
  const [brevoKey, setBrevoKey] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(!isDemo);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDemo) {
      loadProfile();
    }
  }, [isDemo]);

  const loadProfile = async () => {
    setIsLoading(true);
    const data = await databaseService.fetchMyProfile();
    if (data) {
      setProfile(data);
      setBrevoKey(data.brevo_api_key || '');
      setSenderName(data.sender_name || data.name || '');
      setSenderEmail(data.sender_email || '');
    }
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) return;

    setIsSaving(true);
    setError(null);
    try {
      // Sauvegarde Cloud (Brevo + Identity)
      await databaseService.updateProfile({
        brevo_api_key: brevoKey.trim(),
        sender_name: senderName.trim(),
        sender_email: senderEmail.trim()
      });

      // Gemini Key management is removed from UI as it is handled exclusively via environment variables.

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setError("Erreur lors de la sauvegarde sur l'infrastructure Cloud.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isDemo) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center shadow-inner">
          <ZapOff size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Accès Restreint</h2>
          <p className="text-gray-400 max-w-sm font-medium">Les paramètres d'infrastructure sont désactivés en mode Démo. Connectez-vous avec votre compte personnel pour configurer Brevo.</p>
        </div>
        <button onClick={() => authService.signOut().then(() => window.location.reload())} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl">Se déconnecter</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <SettingsIcon size={32} className="text-gray-900" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Paramètres & API</h2>
            <p className="text-gray-500">Configurez vos clés pour connecter l'IA et l'Emailing.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-10">

            <form onSubmit={handleSave} className="space-y-10">

              {/* CONFIG IA (GEMINI) - Managed via Environment Variable as per guidelines */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-2">
                  <Sparkles className="text-amber-500" size={24} />
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Intelligence Artificielle</h3>
                </div>

                <div className="p-8 bg-amber-50/50 rounded-[2.5rem] border border-amber-100/50 space-y-4">
                  <div className="flex items-center gap-3 text-amber-700">
                    <CheckCircle2 size={20} />
                    <h4 className="font-bold">Gemini API Active</h4>
                  </div>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    L'intelligence artificielle de Google est connectée et sécurisée. L'authentification est gérée par l'infrastructure via <code>process.env.API_KEY</code>.
                  </p>
                </div>
              </div>

              {/* CONFIG EMAIL (BREVO) */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-2">
                  <Mail className="text-blue-500" size={24} />
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Emailing (Brevo)</h3>
                </div>

                {/* Clé API */}
                <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-blue-700">
                      <Key size={20} />
                      <h4 className="font-bold">Clé API (v3)</h4>
                    </div>
                  </div>
                  <input
                    type="password"
                    value={brevoKey}
                    onChange={(e) => setBrevoKey(e.target.value)}
                    placeholder="xkeysib-..."
                    className="w-full bg-white border border-blue-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-200 outline-none transition-all font-mono text-sm"
                  />
                </div>

                {/* Expéditeur */}
                <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100/50 space-y-6">
                  <div className="flex items-center gap-3 text-indigo-700">
                    <User size={20} />
                    <h4 className="font-bold">Expéditeur par défaut</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Nom</label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Ex: Jean"
                        className="w-full bg-white border border-indigo-100 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-200 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Email</label>
                      <input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="jean@domaine.com"
                        className="w-full bg-white border border-indigo-100 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-200 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white/60 rounded-2xl border border-indigo-100 flex gap-4 items-start">
                    <Info size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-indigo-600 font-medium leading-relaxed italic">
                      <strong>Important :</strong> L'adresse email doit être validée sur Brevo.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in shake">
                  <AlertTriangle size={20} />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${isSaved ? 'bg-green-500 text-white shadow-green-200' : 'bg-gray-950 text-white hover:bg-black shadow-gray-200'}`}
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : isSaved ? <CheckCircle2 size={18} /> : <FileKey size={18} />}
                {isSaving ? 'Synchronisation...' : isSaved ? 'Configuration Sauvegardée' : 'Sauvegarder les réglages'}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6 sticky top-8">
            <h3 className="font-bold flex items-center gap-3 text-lg"><Shield size={20} className="text-primary" /> Sécurité</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="p-2 bg-green-50 text-green-500 rounded-lg h-fit"><CheckCircle2 size={16} /></div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold">Variables d'Environnement</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">Les clés d'API sensibles ne sont plus gérées côté client.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-green-50 text-green-500 rounded-lg h-fit"><CheckCircle2 size={16} /></div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold">Cryptage Cloud (Brevo)</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">Votre clé Email est synchronisée via Supabase RLS.</p>
                </div>
              </div>
            </div>


            {/* DEBUG SECTION (Localhost Only) */}
            {window.location.hostname === 'localhost' && (
              <section className="space-y-6 pt-6 border-t border-gray-100">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Terminal size={16} />
                  Zone de Debug
                </h2>
                <div className="p-4 bg-gray-50 rounded-2xl space-y-4">
                  <button
                    onClick={async () => {
                      const success = await databaseService.deductUserCredit(user?.id || '');
                      alert(success ? "Succès ! 1 crédit déduit." : "Échec de la déduction. Vérifiez la console.");
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold"
                  >
                    Test Déduction Crédit
                  </button>
                </div>
              </section>
            )}

            <div className="pt-6 border-t border-gray-50 space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identité de session</p>
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                <p className="text-[11px] font-bold text-gray-900 truncate">{user?.email}</p>
                <p className="text-[9px] text-gray-400 font-mono">{user?.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;