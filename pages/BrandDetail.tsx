
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  User,
  Zap,
  Loader2,
  CheckCircle2,
  FileText,
  Upload,
  X,
  Image as ImageIcon,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  Link as LinkIcon,
  Plus,
  Trash2,
  Mail,
  Info,
  Users,
  Search,
  FileUp,
  MoreHorizontal,
  UserPlus,
  Download,
  Filter,
  BarChart3,
  Eye,
  MousePointer2
} from 'lucide-react';
import { generateNewsletterStrategy, generateWritingFramework } from '../services/geminiService';
import { databaseService } from '../services/databaseService';
import { authService } from '../services/authService';
import { mailService } from '../services/mailService';
import { Brand, StructuredStrategy, StrategyCTA, Contact } from '../types';
import UpgradeModal from '../components/UpgradeModal';
import AlertModal from '../components/AlertModal';
import AnalyticsCard from '../components/AnalyticsCard';

const BrandDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États globaux
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'audience' | 'subscription'>('identity');

  // États Identité & Stratégie
  const [isLoading, setIsLoading] = useState<{ strategy: boolean; framework: boolean }>({ strategy: false, framework: false });
  const [sections, setSections] = useState({ intro: true, context: true, ctas: false, strategy: false });
  const [brand, setBrand] = useState<Brand | null>(null);
  const [strategy, setStrategy] = useState<StructuredStrategy | null>(null);
  const [manualCTAs, setManualCTAs] = useState<StrategyCTA[]>([]);

  // États Page d'Inscription
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    title: "",
    subtitle: "",
    button_text: "",
    primary_color: "#0F172A",
    logo_visible: true
  });
  const [brandSlug, setBrandSlug] = useState("");

  // États Audience & Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contact>>({});
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null); // New Profile State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false); // Upgrade Modal State

  const [alertState, setAlertState] = useState<{ isOpen: boolean, message: string, type: 'info' | 'error' | 'success' }>({
    isOpen: false, message: '', type: 'info'
  });

  // États Statistiques
  const [brandStats, setBrandStats] = useState<{ campaignsCount: number, totalSent: number, globalOpenRate: number, globalClickRate: number } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Charger les stats quand la marque est chargée
  useEffect(() => {
    if (brand?.id && activeTab === 'audience') {
      const loadStats = async () => {
        setIsLoadingStats(true);
        try {
          const stats = await mailService.getBrandStats(brand.id);
          setBrandStats(stats);
        } catch (e) {
          console.error("Failed to load brand stats", e);
        } finally {
          setIsLoadingStats(false);
        }
      };
      loadStats();
    }
  }, [brand?.id, activeTab]);

  const currentUser = authService.getCurrentUser();
  const isDemo = false;

  // CHARGEMENT INITIAL
  useEffect(() => {
    const loadBrand = async () => {
      if (!id) return;
      setIsPageLoading(true);
      const data = await databaseService.fetchBrandById(id);
      if (data) {
        setBrand(data);
        if (data.newsletter_strategy) {
          try {
            setStrategy(JSON.parse(data.newsletter_strategy));
          } catch (e) {
            console.error("Format de stratégie obsolète");
          }
        }
        if (data.cta_config) {
          try {
            setManualCTAs(JSON.parse(data.cta_config));
          } catch (e) {
            setManualCTAs([]);
          }
        }
        if (data.subscription_settings) {
          setSubscriptionSettings(data.subscription_settings);
        } else {
          // Default init
          setSubscriptionSettings({
            title: "Rejoignez ma newsletter",
            subtitle: "Recevez mes meilleurs conseils chaque semaine.",
            button_text: "S'inscrire",
            primary_color: "#0F172A",
            logo_visible: true
          });
        }
        setBrandSlug(data.slug || "");

        // Initialize logo_alt if empty to make it editable
        if (!data.logo_alt && data.brand_name) {
          setBrand(prev => prev ? { ...prev, logo_alt: `image du logo de la marque : ${data.brand_name}` } : null);
        }
      }
      setIsPageLoading(false);
    };
    loadBrand();
    databaseService.fetchMyProfile().then(setUserProfile);
  }, [id]);

  // CHARGEMENT CONTACTS (Lazy load sur l'onglet audience)
  useEffect(() => {
    if (activeTab === 'audience' && brand?.id) {
      loadContacts();
    }
  }, [activeTab, brand?.id]);

  const loadContacts = async () => {
    if (!brand?.id) return;
    setIsLoadingContacts(true);
    try {
      const data = await databaseService.fetchContacts(brand.id);
      setContacts(data || []);
    } catch (e) {
      console.error("Erreur chargement contacts", e);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!brand || !id) return;
    setIsSaving(true);

    // Default logo_alt if missing
    const finalLogoAlt = brand.logo_alt || `image du logo de la marque : ${brand.brand_name}`;

    try {
      const payload: Partial<Brand> = {
        brand_name: brand.brand_name,
        description: brand.description,
        target_audience: brand.target_audience,
        editorial_tone: brand.editorial_tone,
        logo_url: brand.logo_url,
        logo_alt: finalLogoAlt,
        desired_perception: brand.desired_perception,
        skills_strengths: brand.skills_strengths,
        values_beliefs: brand.values_beliefs,
        differentiation: brand.differentiation,
        career_story: brand.career_story,
        achievements: brand.achievements,
        inspirations: brand.inspirations,
        daily_life: brand.daily_life,
        newsletter_strategy: strategy ? JSON.stringify(strategy) : brand.newsletter_strategy,
        cta_config: JSON.stringify(manualCTAs),
        sender_name: brand.sender_name,
        sender_email: brand.sender_email,
        slug: brandSlug,
        subscription_settings: subscriptionSettings
      };

      const updatedBrand = await databaseService.updateBrand(id, payload);
      if (updatedBrand) {
        setBrand(updatedBrand);
        setAlertState({ isOpen: true, message: "Sauvegarde réussie !", type: 'success' });
      } else {
        throw new Error("Echec sauvegarde (API Error)");
      }
    } catch (e) {
      console.error("Save failure:", e);
      setAlertState({
        isOpen: true,
        message: "Erreur de sauvegarde. Avez-vous exécuté le script SQL de migration ?",
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrand(prev => prev ? { ...prev, logo_url: reader.result as string } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateStrategy = async () => {
    if (!brand) return;
    if (isDemo) {
      setAlertState({ isOpen: true, message: "⚠️ Mode Démo : IA inactive.", type: 'info' });
      return;
    }

    // CREDIT CHECK
    const currentCredits = userProfile?.credits ?? 0;
    if (currentCredits <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    setIsLoading(p => ({ ...p, strategy: true }));
    try {
      const result = await generateNewsletterStrategy(brand);

      // DEDUCT CREDIT
      const success = await databaseService.deductUserCredit(currentUser?.id || '');
      if (success) {
        setUserProfile((prev: any) => ({ ...prev, credits: Math.max(0, (prev?.credits || 0) - 1) }));
      }

      setStrategy(result);
      setSections(prev => ({ ...prev, strategy: true }));
      await databaseService.updateBrand(brand.id, {
        newsletter_strategy: JSON.stringify(result)
      });
    } catch (e) {
      console.error("Strategy generation error:", e);
    } finally {
      setIsLoading(p => ({ ...p, strategy: false }));
    }
  };

  // --- CTA MANAGEMENT ---
  const addCTA = () => {
    const newCTA: StrategyCTA = {
      id: `cta_${Date.now()}`,
      label: 'Nouveau bouton',
      url: '',
      enabled: true
    };
    setManualCTAs([...manualCTAs, newCTA]);
  };

  const updateManualCTA = (ctaId: string, updates: Partial<StrategyCTA>) => {
    setManualCTAs(prev => prev.map(cta => cta.id === ctaId ? { ...cta, ...updates } : cta));
  };

  const removeCTA = (ctaId: string) => {
    setManualCTAs(prev => prev.filter(cta => cta.id !== ctaId));
  };

  // --- CONTACTS MANAGEMENT ---
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand?.id) return;
    setIsSavingContact(true);
    try {
      // 1. Sauvegarde locale Supabase
      if (editingContact.id) {
        await databaseService.updateContact(editingContact.id, editingContact);
      } else {
        await databaseService.createContact({ ...editingContact, brand_id: brand.id, status: 'subscribed' });
      }

      // 2. Synchronisation Brevo
      try {
        let listId = brand.brevo_list_id;

        // Si la marque n'a pas encore de liste Brevo, on la crée
        if (!listId) {
          try {
            const folderId = await mailService.createBrevoFolder("NewsletterAI");

            // Standard Naming Convention: [Profile Name] - [Brand Name]
            const profileName = userProfile?.name || 'Utilisateur';
            const listName = `${profileName} - ${brand.brand_name}`;

            listId = await mailService.createBrevoList(listName, folderId);

            // Mise à jour de la marque avec l'ID de liste
            await databaseService.updateBrand(brand.id, { brevo_list_id: listId });

            // Mise à jour locale du state brand
            setBrand(prev => prev ? { ...prev, brevo_list_id: listId } : null);
          } catch (e) {
            console.error("Erreur création liste Brevo", e);
            // On ne bloque pas tout, mais l'ajout contact Brevo échouera probablement
          }
        }

        // Synchronisation Contact Brevo (Ajout ou Suppression)
        if (listId && editingContact.email) {
          if (editingContact.status === 'unsubscribed') {
            // Modification demandée : on ne retire plus de la liste, on blacklist pour empêcher les envois sans perdre l'historique
            await mailService.blacklistContactInBrevo(editingContact.email);
          } else {
            // Cas réabonnement : on s'assure qu'il n'est plus blacklisté
            await mailService.whitelistContactInBrevo(editingContact.email);

            await mailService.addContactToBrevoList(listId, editingContact.email, {
              PRENOM: editingContact.first_name || '',
              NOM: editingContact.last_name || ''
            });
          }
        }
      } catch (brevoError) {
        console.error("Erreur Sync Brevo general:", brevoError);
      }

      await loadContacts();
      setIsContactModalOpen(false);
      setEditingContact({});
    } catch (error) {
      console.error("Erreur sauvegarde contact", error);
      setAlertState({ isOpen: true, message: "Erreur lors de la sauvegarde.", type: 'error' });
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (window.confirm("Supprimer ce contact définitivement ?")) {
      const contactToDelete = contacts.find(c => c.id === contactId);

      // 1. Sync Brevo Suppression
      if (brand?.brevo_list_id && contactToDelete?.email) {
        try {
          await mailService.removeContactFromBrevoList(brand.brevo_list_id, [contactToDelete.email]);
        } catch (e) {
          console.error("Erreur sync suppression Brevo", e);
        }
      }

      // 2. Suppression locale
      await databaseService.deleteContact(contactId);
      await loadContacts();
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  if (isPageLoading) {
    return <div className="flex flex-col items-center justify-center h-screen gap-4">
      <Loader2 className="animate-spin text-primary" size={48} />
      <p className="text-gray-400 font-medium animate-pulse uppercase tracking-widest text-[10px]">Chargement de l'identité...</p>
    </div>;
  }

  if (!brand) return null;

  const SectionHeader = ({ title, icon: Icon, sectionKey }: { title: string, icon: any, sectionKey: keyof typeof sections }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex justify-between items-center p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
          <Icon size={20} />
        </div>
        <h3 className="text-lg font-bold uppercase tracking-tight">{title}</h3>
      </div>
      {sections[sectionKey] ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/brands')} className="p-3 hover:bg-white rounded-2xl shadow-sm border border-gray-100 transition-all"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">{brand.brand_name}</h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{brand.target_audience}</p>
          </div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex p-1.5 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('identity')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'identity' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Sparkles size={14} /> 🧬 Identité & Stratégie
        </button>
        <button
          onClick={() => setActiveTab('audience')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'audience' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Users size={14} /> 👥 Audience & Diffusion
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'subscription' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Zap size={14} /> 🚀 Page d'Inscription
        </button>
      </div>

      {/* CONTENU ONGLET IDENTITY */}
      {activeTab === 'identity' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Identité & Logo */}
          <div>
            <SectionHeader title="Identité & Logo" icon={User} sectionKey="intro" />
            {sections.intro && (
              <div className="p-8 space-y-8">
                <div className="flex flex-col md:flex-row gap-10">
                  <div className="w-full md:w-1/3 space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Logo de la marque</label>
                    <div onClick={() => fileInputRef.current?.click()} className="aspect-square w-full max-w-[200px] border-3 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 transition-all group overflow-hidden relative border-spacing-4">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} className="w-full h-full object-contain p-6" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-300">
                          <Upload size={32} />
                          <span className="text-[9px] font-black uppercase tracking-widest">Importer</span>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    </div>
                    {/* Logo Alt Text Field */}
                    <div className="space-y-2 mt-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Texte alternatif (Logo)</label>
                      <input
                        type="text"
                        value={brand.logo_alt || ""}
                        onChange={e => setBrand({ ...brand, logo_alt: e.target.value })}
                        placeholder={`image du logo de la marque : ${brand.brand_name}`}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <p className="text-[9px] text-gray-400 font-medium px-1">Essentiel pour le SEO et l'accessibilité.</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom</label>
                        <input type="text" value={brand.brand_name} onChange={e => setBrand({ ...brand, brand_name: e.target.value })} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Audience</label>
                        <input type="text" value={brand.target_audience} onChange={e => setBrand({ ...brand, target_audience: e.target.value })} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                      <textarea rows={4} value={brand.description} onChange={e => setBrand({ ...brand, description: e.target.value })} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 font-bold resize-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Détails du Persona */}
          <div>
            <SectionHeader title="Détails du Persona" icon={Target} sectionKey="context" />
            {sections.context && (
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                {[
                  { label: 'PERCEPTION DÉSIRÉE', field: 'desired_perception' },
                  { label: 'COMPÉTENCES & FORCES', field: 'skills_strengths' },
                  { label: 'VALEURS & CROYANCES', field: 'values_beliefs' },
                  { label: 'DIFFÉRENCIATION', field: 'differentiation' },
                  { label: 'PARCOURS / HISTOIRE', field: 'career_story' },
                  { label: 'RÉALISATIONS', field: 'achievements' },
                  { label: 'INSPIRATIONS', field: 'inspirations' },
                  { label: 'QUOTIDIEN', field: 'daily_life' },
                ].map(item => (
                  <div key={item.field} className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{item.label}</label>
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 hover:bg-white hover:shadow-sm transition-all">
                      <textarea
                        rows={4}
                        value={brand[item.field as keyof Brand] as string || ''}
                        onChange={e => setBrand({ ...brand, [item.field]: e.target.value })}
                        className="w-full bg-transparent border-none outline-none text-slate-700 text-sm font-medium leading-relaxed resize-none focus:ring-0"
                        placeholder="Saisissez les détails ici..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appels à l'action */}
          <div>
            <SectionHeader title="Appels à l'action" icon={Zap} sectionKey="ctas" />
            {sections.ctas && (
              <div className="p-8 bg-[#0f172a] space-y-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <h4 className="text-white font-bold uppercase text-xs tracking-widest">Boutons de conversion</h4>
                    <p className="text-slate-500 text-[10px]">Configurez vos liens de redirection fixes pour vos newsletters.</p>
                  </div>
                  <button
                    onClick={addCTA}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    <Plus size={16} /> Ajouter un CTA
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {manualCTAs.map(cta => (
                    <div key={cta.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5 group relative">
                      <button
                        onClick={() => removeCTA(cta.id)}
                        className="absolute top-4 right-4 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Label du bouton</label>
                          <input
                            type="text"
                            value={cta.label}
                            onChange={e => updateManualCTA(cta.id, { label: e.target.value })}
                            className="bg-transparent border-none outline-none text-white font-bold text-base w-full focus:ring-0"
                            placeholder="Ex: Réserver un appel"
                          />
                        </div>
                        <button
                          onClick={() => updateManualCTA(cta.id, { enabled: !cta.enabled })}
                          className={`p-1.5 rounded-xl transition-all ${cta.enabled ? 'text-indigo-400' : 'text-slate-600'}`}
                        >
                          {cta.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Lien de redirection</label>
                        <div className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-3 border border-white/5">
                          <LinkIcon size={14} className="text-indigo-400 shrink-0" />
                          <input
                            type="text"
                            value={cta.url}
                            onChange={e => updateManualCTA(cta.id, { url: e.target.value })}
                            className="bg-transparent border-none outline-none text-indigo-100 text-[11px] w-full focus:ring-0 font-mono"
                            placeholder="https://votre-calendly.com"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stratégie Newsletter (IA) */}
          <div>
            <SectionHeader title="Stratégie Newsletter (IA)" icon={Sparkles} sectionKey="strategy" />
            {sections.strategy && (
              <div className="p-8 bg-slate-50/50 space-y-6">
                {strategy ? (
                  <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Ton de communication</p>
                        <p className="text-lg font-bold text-slate-900">{strategy.tone}</p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Fréquence optimale</p>
                        <p className="text-lg font-bold text-slate-900">{strategy.frequency}</p>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-6">Piliers de contenu thématiques</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {strategy.pillars.map((p, idx) => (
                          <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-3">
                            <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]">{idx + 1}</div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm mb-1 uppercase tracking-tight">{p.title}</h4>
                              <p className="text-[11px] text-slate-500 leading-relaxed">{p.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={handleGenerateStrategy} disabled={isLoading.strategy} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-all ml-2">
                      {isLoading.strategy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Re-générer la stratégie éditoriale
                    </button>
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-6 bg-white rounded-[3rem] border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><Sparkles size={40} /></div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black uppercase tracking-tight">Analyse Stratégique</h4>
                      <p className="text-slate-400 text-xs max-w-xs mx-auto">L'IA analysera votre Persona pour définir vos piliers éditoriaux.</p>
                    </div>
                    <button onClick={handleGenerateStrategy} disabled={isLoading.strategy} className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-3 mx-auto transition-all hover:-translate-y-1">
                      {isLoading.strategy ? <Loader2 className="animate-spin" /> : <Zap size={18} />} Générer la stratégie
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENU ONGLET AUDIENCE */}
      {activeTab === 'audience' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* PERFORMANCE GLOBALE */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 p-6 border-b border-gray-50">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><BarChart3 size={20} /></div>
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight">Performance Globale</h3>
                <p className="text-xs text-gray-400 font-medium">Moyenne calculée sur {brandStats?.campaignsCount || 0} campagnes envoyées</p>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AnalyticsCard
                  label="Taux d'ouverture Moyen"
                  value={brandStats ? `${brandStats.globalOpenRate}%` : '-'}
                  subtext="Moyenne globale"
                  icon={Eye}
                  color="text-emerald-600"
                  isLoading={isLoadingStats}
                />
                <AnalyticsCard
                  label="Taux de Clic Moyen (CTR)"
                  value={brandStats ? `${brandStats.globalClickRate}%` : '-'}
                  subtext="Moyenne globale"
                  icon={MousePointer2}
                  color="text-blue-600"
                  isLoading={isLoadingStats}
                />
                <AnalyticsCard
                  label="Volume Total Envoyé"
                  value={brandStats?.totalSent || 0}
                  subtext="Emails délivrés au total"
                  icon={Mail}
                  color="text-violet-600"
                  isLoading={isLoadingStats}
                />
              </div>
            </div>
          </div>

          {/* SECTION EXPÉDITEUR BREVO */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 p-6 border-b border-gray-50">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Mail size={20} /></div>
              <h3 className="text-lg font-bold uppercase tracking-tight">Configuration Expéditeur</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4 items-start">
                <Info size={18} className="text-blue-500 mt-1 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase text-blue-600 tracking-widest">Paramètres d'envoi</p>
                  <p className="text-[11px] text-blue-800 leading-relaxed italic">
                    Ces réglages priment sur vos paramètres globaux lors de l'envoi de newsletters pour cette marque.
                    <strong>L'adresse email doit impérativement être validée dans vos "Senders" sur Brevo.</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nom du sender</label>
                  <input
                    type="text"
                    value={brand.sender_name || ''}
                    onChange={e => setBrand({ ...brand, sender_name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-bold focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Ex: Sophie de MyBrand"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email du sender</label>
                  <input
                    type="email"
                    value={brand.sender_email || ''}
                    onChange={e => setBrand({ ...brand, sender_email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-bold focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                    placeholder="sophie@mon-domaine.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION BASE CONTACTS */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Users size={20} /></div>
                <h3 className="text-lg font-bold uppercase tracking-tight">Base de Contacts</h3>
              </div>
              <div className="flex gap-2">
                <button className="p-3 hover:bg-gray-50 rounded-xl border border-gray-100 text-gray-400 transition-all"><FileUp size={18} /></button>
                <button onClick={() => { setEditingContact({}); setIsContactModalOpen(true); }} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all">
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="p-4 bg-gray-50/50 flex gap-4 items-center border-b border-gray-50">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Rechercher par email ou nom..."
                  className="w-full bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-500 hover:text-gray-900 transition-all">
                <Filter size={14} /> Filtres
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-500 hover:text-gray-900 transition-all">
                <Download size={14} /> Export
              </button>
            </div>

            {/* TABLEAU */}
            <div className="flex-1 overflow-x-auto">
              {isLoadingContacts ? (
                <div className="flex flex-col items-center justify-center h-40 gap-4">
                  <Loader2 className="animate-spin text-emerald-500" size={32} />
                </div>
              ) : filteredContacts.length > 0 ? (
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Nom Complet</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredContacts.map(contact => (
                      <tr key={contact.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm text-gray-900">{contact.email}</td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-500">{contact.first_name} {contact.last_name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${contact.status === 'subscribed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            contact.status === 'unsubscribed' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                              'bg-red-50 text-red-600 border-red-100'
                            }`}>
                            {contact.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingContact(contact); setIsContactModalOpen(true); }} className="p-2 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-gray-900 shadow-sm transition-all"><MoreHorizontal size={14} /></button>
                            <button onClick={() => handleDeleteContact(contact.id)} className="p-2 bg-white border border-gray-100 rounded-lg text-red-400 hover:text-red-600 shadow-sm transition-all"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300"><Users size={32} /></div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900">Aucun contact trouvé</p>
                    <p className="text-xs text-gray-400">Importez votre liste ou ajoutez un contact manuellement.</p>
                  </div>
                  <button onClick={() => { setEditingContact({}); setIsContactModalOpen(true); }} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Ajouter le premier</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET PAGE INSCRIPTION */}
      {activeTab === 'subscription' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-4 p-6 border-b border-gray-50">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><LinkIcon size={20} /></div>
            <h3 className="text-lg font-bold uppercase tracking-tight">Configuration Page Publique</h3>
          </div>

          <div className="p-8 space-y-8">
            {/* Aperçu Lien */}
            <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Lien public</span>
                {brandSlug && (
                  <a
                    href={`/#/subscribe/${brandSlug}`}
                    target="_blank"
                    className="text-[10px] font-bold text-purple-600 hover:underline flex items-center gap-1"
                  >
                    Voir la page <Info size={12} />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white px-4 py-3 rounded-xl border border-purple-100 text-sm font-mono text-purple-900 overflow-hidden text-ellipsis whitespace-nowrap">
                  {window.location.origin}/#/subscribe/{brandSlug || '...'}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/#/subscribe/${brandSlug}`);
                    setAlertState({ isOpen: true, message: "Lien copié !", type: 'success' });
                  }}
                  className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20"
                >
                  <LinkIcon size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Colonne Gauche : Paramètres URL & Textes */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identifiant URL (Slug)</label>
                  <input
                    type="text"
                    value={brandSlug}
                    onChange={e => setBrandSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
                    placeholder="ma-super-newsletter"
                  />
                  <p className="text-[10px] text-gray-400 ml-1">Caractères alphanumériques et tirets uniquement.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Titre de la page</label>
                  <input
                    type="text"
                    value={subscriptionSettings.title}
                    onChange={e => setSubscriptionSettings({ ...subscriptionSettings, title: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sous-titre / Description</label>
                  <textarea
                    rows={3}
                    value={subscriptionSettings.subtitle}
                    onChange={e => setSubscriptionSettings({ ...subscriptionSettings, subtitle: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm resize-none"
                  />
                </div>
              </div>

              {/* Colonne Droite : Apparence */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Texte du bouton</label>
                  <input
                    type="text"
                    value={subscriptionSettings.button_text}
                    onChange={e => setSubscriptionSettings({ ...subscriptionSettings, button_text: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Couleur Principale</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={subscriptionSettings.primary_color}
                      onChange={e => setSubscriptionSettings({ ...subscriptionSettings, primary_color: e.target.value })}
                      className="h-12 w-20 rounded-xl cursor-pointer border-none bg-transparent"
                    />
                    <input
                      type="text"
                      value={subscriptionSettings.primary_color}
                      onChange={e => setSubscriptionSettings({ ...subscriptionSettings, primary_color: e.target.value })}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-mono text-sm font-bold uppercase"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Afficher le Logo</label>
                  <button
                    onClick={() => setSubscriptionSettings({ ...subscriptionSettings, logo_visible: !subscriptionSettings.logo_visible })}
                    className={`text-2xl transition-colors ${subscriptionSettings.logo_visible ? 'text-purple-600' : 'text-gray-300'}`}
                  >
                    {subscriptionSettings.logo_visible ? <ToggleRight /> : <ToggleLeft />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/80 backdrop-blur-xl px-10 py-5 rounded-[2.5rem] shadow-2xl border border-gray-100 z-50">
        <button onClick={handleSave} disabled={isSaving} className="bg-gray-950 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 transition-all hover:-translate-y-1 active:scale-95">
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Sauvegarder
        </button>
      </div>

      {/* MODAL CONTACT */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <UserPlus size={24} className="text-emerald-500" />
                  {editingContact.id ? 'Modifier Contact' : 'Nouveau Contact'}
                </h3>
                <button onClick={() => setIsContactModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveContact} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                  <input required type="email" value={editingContact.email || ''} onChange={e => setEditingContact({ ...editingContact, email: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-emerald-100 transition-all text-sm font-bold" placeholder="email@exemple.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prénom</label>
                    <input value={editingContact.first_name || ''} onChange={e => setEditingContact({ ...editingContact, first_name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-emerald-100 transition-all text-sm font-bold" placeholder="Jean" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nom</label>
                    <input value={editingContact.last_name || ''} onChange={e => setEditingContact({ ...editingContact, last_name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-emerald-100 transition-all text-sm font-bold" placeholder="Dupont" />
                  </div>
                </div>
                {editingContact.id && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Statut</label>
                    <select value={editingContact.status} onChange={e => setEditingContact({ ...editingContact, status: e.target.value as any })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-emerald-100 transition-all text-sm font-bold">
                      <option value="subscribed">Abonné</option>
                      <option value="unsubscribed">Désabonné</option>
                      <option value="bounced">Rejeté (Bounce)</option>
                    </select>
                  </div>
                )}
                <button type="submit" disabled={isSavingContact} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-2 mt-4">
                  {isSavingContact ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Enregistrer
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          type="credits"
          currentPlan={userProfile?.subscription_plan || 'free'}
        />
      )}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        message={alertState.message}
        type={alertState.type}
      />
    </div>
  );
};

export default BrandDetail;
