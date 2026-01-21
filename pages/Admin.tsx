
import React, { useState, useEffect } from 'react';
import { 
  Database, Key, Save, ShieldCheck, CheckCircle2, XCircle, Loader2, Link as LinkIcon, 
  Server, Radio, Zap, ZapOff, RefreshCcw, ExternalLink, Cloud, Users, BarChart2, 
  Activity, AlertTriangle, Search, Briefcase, UserX, UserCheck, Code, Copy, 
  Mail, Terminal, HardDrive, Image as ImageIcon, LayoutGrid, Cpu, Smartphone, Settings,
  Webhook, ArrowRight, ToggleRight, Lock
} from 'lucide-react';
import { authService, DEMO_USER_EMAIL } from '../services/authService';
import { databaseService } from '../services/databaseService';
import { useNavigate } from 'react-router-dom';
import { Profile } from '../types';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const isSuperUser = authService.isSuperAdmin();
  const [activeTab, setActiveTab] = useState<'infra' | 'users' | 'sql'>('infra');
  
  const [url, setUrl] = useState(localStorage.getItem('SUPABASE_URL') || '');
  const [anonKey, setAnonKey] = useState(localStorage.getItem('SUPABASE_ANON_KEY') || '');
  const [masterBrevoKey, setMasterBrevoKey] = useState(localStorage.getItem('MASTER_BREVO_KEY') || '');
  
  // URL par défaut mise à jour
  const [edgeFunctionUrl, setEdgeFunctionUrl] = useState(localStorage.getItem('EDGE_FUNCTION_URL') || 'https://jssfgxhacpjiefkgalyz.supabase.co/functions/v1/clever-worker');
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [testingFunction, setTestingFunction] = useState(false);
  const [functionStatus, setFunctionStatus] = useState<{success: boolean, message: string} | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperUser) {
      navigate('/dashboard');
    }
    if (activeTab === 'users') loadUsers();
  }, [isSuperUser, navigate, activeTab]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await databaseService.fetchAllProfiles();
      setUsers(data || []);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSaveInfra = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    localStorage.setItem('SUPABASE_URL', url.trim());
    localStorage.setItem('SUPABASE_ANON_KEY', anonKey.trim());
    localStorage.setItem('MASTER_BREVO_KEY', masterBrevoKey.trim());
    
    await databaseService.updateProfile({ brevo_api_key: masterBrevoKey.trim() });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    setIsSaving(false);
  };

  const handleEdgeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEdgeFunctionUrl(val);
    localStorage.setItem('EDGE_FUNCTION_URL', val);
  };

  const handleTestEdgeFunction = async () => {
    if (!edgeFunctionUrl) return;
    setTestingFunction(true);
    setFunctionStatus(null);
    const result = await databaseService.testEdgeFunction(edgeFunctionUrl);
    setFunctionStatus(result);
    setTestingFunction(false);
  };

  // Génère le lien direct vers le dashboard Supabase
  const getSupabaseDashboardLink = () => {
    try {
      const urlObj = new URL(edgeFunctionUrl);
      // ex: jssfgxhacpjiefkgalyz.supabase.co -> projectRef = jssfgxhacpjiefkgalyz
      const projectRef = urlObj.hostname.split('.')[0];
      // ex: /functions/v1/clever-worker -> name = clever-worker
      const parts = urlObj.pathname.split('/');
      const functionName = parts[parts.length - 1];
      
      return `https://supabase.com/dashboard/project/${projectRef}/functions/${functionName}`;
    } catch (e) {
      return "https://supabase.com/dashboard";
    }
  };

  const sqlFullInit = `-- 1. EXTENSION DE LA TABLE BRANDS
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS desired_perception TEXT,
ADD COLUMN IF NOT EXISTS skills_strengths TEXT,
ADD COLUMN IF NOT EXISTS values_beliefs TEXT,
ADD COLUMN IF NOT EXISTS differentiation TEXT,
ADD COLUMN IF NOT EXISTS career_story TEXT,
ADD COLUMN IF NOT EXISTS achievements TEXT,
ADD COLUMN IF NOT EXISTS inspirations TEXT,
ADD COLUMN IF NOT EXISTS daily_life TEXT,
ADD COLUMN IF NOT EXISTS cta_config TEXT,
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS sender_email TEXT,
ADD COLUMN IF NOT EXISTS brevo_list_id BIGINT,
ADD COLUMN IF NOT EXISTS brevo_sender_id BIGINT;

-- 2. EXTENSION DE LA TABLE NEWSLETTERS (FOOTER)
ALTER TABLE public.newsletters 
ADD COLUMN IF NOT EXISTS footer_content TEXT;

-- 3. GESTION DE LA TABLE PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  avatar TEXT,
  brevo_api_key TEXT,
  sender_name TEXT,
  sender_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger : Création auto User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Politiques Brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can view own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can insert own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete own brands" ON public.brands;

CREATE POLICY "Users can view own brands" ON public.brands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brands" ON public.brands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brands" ON public.brands FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brands" ON public.brands FOR DELETE USING (auth.uid() = user_id);

-- 4. TABLE CONTACTS (Brevo Sync)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  attributes JSONB DEFAULT '{}'::jsonb,
  brevo_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, email)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Nettoyage anciennes politiques conflictuelles
DROP POLICY IF EXISTS "Users can view their brands contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can manage their brands contacts" ON public.contacts;

-- Politiques Contacts SÉPARÉES (Fix Error 42601)
CREATE POLICY "Users can view contacts" ON public.contacts
  FOR SELECT USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert contacts" ON public.contacts
  FOR INSERT WITH CHECK (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update contacts" ON public.contacts
  FOR UPDATE USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete contacts" ON public.contacts
  FOR DELETE USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex items-center justify-between bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gray-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl">
            <ShieldCheck size={32} className="text-primary" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase">Master Console</h2>
            <p className="text-gray-400 font-medium">Administration globale de l'infrastructure SaaS.</p>
          </div>
        </div>
        <div className="flex bg-gray-50 p-2 rounded-3xl gap-2">
           <button onClick={() => setActiveTab('infra')} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'infra' ? 'bg-gray-950 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Infrastructure</button>
           <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-gray-950 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Utilisateurs</button>
           <button onClick={() => setActiveTab('sql')} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'sql' ? 'bg-gray-950 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Laboratoire SQL</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {activeTab === 'infra' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10">
                <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                   <Server className="text-primary" size={28} />
                   <h3 className="text-2xl font-black uppercase tracking-tight">Configuration Maître</h3>
                </div>
                <form onSubmit={handleSaveInfra} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Supabase Endpoint URL</label>
                        <input type="text" value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-mono text-sm" placeholder="https://xyz.supabase.co" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Supabase Anon Key</label>
                        <input type="password" value={anonKey} onChange={e => setAnonKey(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-mono text-sm" placeholder="public-anon-key..." />
                      </div>
                   </div>
                   <div className="p-10 bg-blue-50/50 rounded-[3rem] border border-blue-100/50 space-y-6">
                      <div className="flex items-center gap-4">
                        <Mail className="text-blue-600" size={24} />
                        <div>
                          <h4 className="font-black text-blue-900 uppercase">Clé API Brevo Partagée (Master)</h4>
                          <p className="text-blue-500 text-xs">Cette clé sera utilisée par TOUS les utilisateurs de la plateforme.</p>
                        </div>
                      </div>
                      <input type="password" value={masterBrevoKey} onChange={e => setMasterBrevoKey(e.target.value)} className="w-full bg-white border border-blue-100 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-200 outline-none transition-all font-mono text-sm" placeholder="xkeysib-..." />
                   </div>
                   <button type="submit" disabled={isSaving} className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all ${isSaved ? 'bg-green-600 text-white' : 'bg-gray-950 text-white hover:bg-black shadow-gray-200'}`}>
                      {isSaving ? <Loader2 className="animate-spin" size={20} /> : isSaved ? <CheckCircle2 size={20} /> : <Save size={20} />} 
                      {isSaving ? 'Synchronisation...' : isSaved ? 'Configuration Activée' : 'Enregistrer la configuration globale'}
                   </button>
                </form>
             </div>

             <div className="bg-gray-950 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />
                <div className="flex items-center gap-4 relative z-10 text-white">
                   <Webhook className="text-primary" size={28} />
                   <h3 className="text-2xl font-black uppercase tracking-tight">Configuration Edge Function</h3>
                </div>
                
                <div className="relative z-10 space-y-6">
                   <div className="p-5 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between text-white">
                         <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-primary text-black rounded-full flex items-center justify-center font-bold text-[10px]">1</div>
                            <h4 className="font-bold text-sm">Désactiver la sécurité JWT</h4>
                         </div>
                         <a 
                           href={getSupabaseDashboardLink()} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="px-4 py-2 bg-primary hover:bg-[#ffca28] text-gray-900 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"
                         >
                           <ExternalLink size={12} /> Ouvrir réglages Supabase
                         </a>
                      </div>
                      <div className="pl-9 text-gray-400 text-xs space-y-3">
                        <p>Supabase active la sécurité par défaut. Pour que l'admin fonctionne, vous devez :</p>
                        <ul className="space-y-2 list-disc list-inside">
                           <li>Cliquer sur le bouton jaune ci-dessus.</li>
                           <li>Chercher l'option <span className="text-white font-mono bg-white/10 px-1 rounded">Enforce JWT Verification</span>.</li>
                           <li>Passer l'interrupteur sur <span className="text-red-400 font-bold">OFF</span> (Désactivé).</li>
                           <li>Cliquer sur "Save" en bas de page.</li>
                        </ul>
                      </div>
                   </div>
                   
                   <div className="p-5 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                      <div className="flex items-center gap-3 text-white">
                         <div className="w-6 h-6 bg-primary text-black rounded-full flex items-center justify-center font-bold text-[10px]">2</div>
                         <h4 className="font-bold text-sm">Tester la connexion</h4>
                      </div>
                      <div className="pl-9 flex gap-4">
                        <input 
                           type="text" 
                           value={edgeFunctionUrl} 
                           onChange={handleEdgeUrlChange} 
                           placeholder="https://.../functions/v1/clever-worker" 
                           className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs"
                        />
                        <button 
                           onClick={handleTestEdgeFunction}
                           disabled={testingFunction || !edgeFunctionUrl}
                           className="px-6 bg-primary hover:bg-[#ffca28] text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                           {testingFunction ? <Loader2 className="animate-spin" /> : "Tester"}
                        </button>
                      </div>
                   </div>

                   {functionStatus && (
                      <div className={`ml-9 p-6 rounded-2xl border flex items-start gap-4 ${functionStatus.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                         {functionStatus.success ? <CheckCircle2 size={24} className="shrink-0" /> : <Lock size={24} className="shrink-0" />}
                         <div>
                            <h4 className="font-bold text-sm uppercase tracking-wider mb-1">{functionStatus.success ? "Connexion Réussie" : "Accès Refusé"}</h4>
                            <p className="text-xs font-mono whitespace-pre-line leading-relaxed">{functionStatus.message}</p>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                   <Users className="text-primary" size={28} />
                   <h3 className="text-2xl font-black uppercase tracking-tight">Base Utilisateurs</h3>
                </div>
                <button onClick={loadUsers} className="p-3 hover:bg-gray-50 rounded-2xl transition-all"><RefreshCcw size={20} className={isLoadingUsers ? 'animate-spin' : ''}/></button>
             </div>
             <div className="overflow-hidden rounded-[2rem] border border-gray-50">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-gray-50">
                         <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400">Utilisateur</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400">ID Unique</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400">Status Infra</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-xs">{u.name?.[0]}</div>
                                 <div>
                                    <p className="font-bold text-sm text-gray-900">{u.name}</p>
                                    <p className="text-xs text-gray-400">{u.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6 font-mono text-[10px] text-gray-400">{u.id}</td>
                           <td className="px-8 py-6">
                              <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase border border-green-100 tracking-widest">Actif</span>
                           </td>
                           <td className="px-8 py-6">
                              <button className="p-2 text-gray-300 hover:text-red-500 transition-colors"><UserX size={18} /></button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-gray-950 p-12 rounded-[4rem] shadow-2xl space-y-8 overflow-hidden relative border border-white/5">
                <div className="absolute top-0 right-0 p-40 bg-primary/5 rounded-full blur-[100px]" />
                <div className="flex items-center justify-between relative z-10">
                   <div className="flex items-center gap-4 text-white">
                      <Terminal className="text-primary" size={32} />
                      <div>
                        <h3 className="text-2xl font-black uppercase">Initialisation Master Base</h3>
                        <p className="text-gray-500 text-sm">Copiez ce script dans l'éditeur SQL de votre Dashboard Supabase.</p>
                      </div>
                   </div>
                   <button onClick={() => copyToClipboard(sqlFullInit, 'sql-init')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${copied === 'sql-init' ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>
                      {copied === 'sql-init' ? <CheckCircle2 size={16} /> : <Copy size={16} />} {copied === 'sql-init' ? 'Copié !' : 'Copier Script'}
                   </button>
                </div>
                <div className="relative group rounded-[2.5rem] overflow-hidden">
                   <div className="absolute top-4 right-4 bg-gray-800 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-all">Supabase SQL V3.5</div>
                   <pre className="bg-black/40 p-10 rounded-[2.5rem] text-primary font-mono text-xs border border-white/5 overflow-x-auto leading-relaxed h-[500px] custom-scrollbar">
                      {sqlFullInit}
                   </pre>
                </div>
                <div className="p-8 bg-amber-950/30 border border-amber-500/20 rounded-[2rem] flex items-center gap-6">
                   <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-amber-500 shrink-0"><AlertTriangle size={28} /></div>
                   <div>
                      <h4 className="font-black text-amber-500 uppercase text-xs mb-1 tracking-widest">Action Requise</h4>
                      <p className="text-amber-200/60 text-[11px] leading-relaxed">Ce script est complet et idempotent. Il va créer les tables Contacts, Brands, Newsletters et Profiles si elles n'existent pas, et mettre à jour les colonnes manquantes sans erreur.</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
