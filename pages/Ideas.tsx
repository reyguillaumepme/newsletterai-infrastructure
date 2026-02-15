import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import ReactQuill from 'react-quill';
import {
  Search,
  LayoutGrid,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Plus,
  X,
  Sparkles,
  Save,
  Wand2,
  Palette,
  Trash2,
  AlertTriangle,
  Zap,
  Monitor,
  Smartphone,
  Check,
  ChevronRight,
  Maximize2,
  Briefcase,
  Layers,
  ArrowRight,
  Copy,
  FileText,
  Upload,
  Sliders,
  Sun,
  Contrast,
  Droplets,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { authService } from '../services/authService';
import { enhanceIdeaWithAI, generateImageFromPrompt } from '../services/geminiService';
import DeleteIdeaModal from '../components/DeleteIdeaModal';
import { Idea, Brand, Newsletter } from '../types';
import UpgradeModal from '../components/UpgradeModal';
import IdeaEditModal from '../components/IdeaEditModal';


const Ideas: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null); // New Profile State
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [deleteIdeaState, setDeleteIdeaState] = useState<{ isOpen: boolean; idea: Idea | null; newsletter: Newsletter | null }>({
    isOpen: false, idea: null, newsletter: null
  });

  const [newIdea, setNewIdea] = useState({ title: '', brand_id: '', content: '' });

  const user = authService.getCurrentUser();
  const isDemo = false;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [iData, bData, pData] = await Promise.all([
        databaseService.fetchIdeas(),
        databaseService.fetchBrands(),
        databaseService.fetchMyProfile()
      ]);
      setIdeas(iData || []);
      setBrands(bData || []);
      setUserProfile(pData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSelectIdea = (idea: Idea) => {
    startTransition(() => {
      setSelectedIdea(idea);
    });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter Logic
  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea => {
      const matchesBrand = selectedBrandId === 'all' || idea.brand_id === selectedBrandId;
      const matchesSearch = !searchQuery || idea.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBrand && matchesSearch;
    });
  }, [ideas, selectedBrandId, searchQuery]);

  // Group by Status (Used vs Unused)
  // Logic: "Used" if it has a newsletter_id OR used=true
  const unusedIdeas = filteredIdeas.filter(i => !i.newsletter_id && !i.used);
  const usedIdeas = filteredIdeas.filter(i => i.newsletter_id || i.used);

  // Helper for Brand Colors (Consistent with Newsletters)
  const getBrandColor = (brandName: string): string => {
    let hash = 0;
    for (let i = 0; i < brandName.length; i++) {
      hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 95%)`;
  };

  const getBrandTextColor = (brandName: string): string => {
    let hash = 0;
    for (let i = 0; i < brandName.length; i++) {
      hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 45%)`;
  };

  const BrandBadge: React.FC<{ brandId: string }> = ({ brandId }) => {
    const brand = brands.find(b => b.id === brandId);
    if (!brand) return null;
    const bgColor = getBrandColor(brand.brand_name);
    const textColor = getBrandTextColor(brand.brand_name);

    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: bgColor, color: textColor }}>
        {brand.logo_url && <img src={brand.logo_url} className="w-4 h-4 rounded-full object-cover" />}
        <span>{brand.brand_name}</span>
      </div>
    );
  };

  const StatusSection: React.FC<{ title: string; count: number; children: React.ReactNode; collapsible?: boolean; defaultCollapsed?: boolean }> = ({ title, count, children, collapsible, defaultCollapsed }) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed || false);
    if (count === 0) return null;
    return (
      <div className="space-y-6">
        <div className={`flex items-center justify-between ${collapsible ? 'cursor-pointer' : ''}`} onClick={() => collapsible && setIsCollapsed(!isCollapsed)}>
          <h3 className="text-xl font-black uppercase text-gray-900 flex items-center gap-3">
            {title} <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-sm">{count}</span>
          </h3>
          {collapsible && (
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          )}
        </div>
        {!isCollapsed && children}
      </div>
    );
  };

  const IdeaCardCompact: React.FC<{ idea: Idea }> = ({ idea }) => {
    return (
      <div onClick={() => handleSelectIdea(idea)} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col overflow-hidden hover:-translate-y-1 h-full min-h-[320px]">
        {/* Image Section - Aspect Ratio 16/9 */}
        <div className="relative aspect-video bg-gray-100 overflow-hidden shrink-0">
          {idea.image_url ? (
            <img src={idea.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ImageIcon size={32} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />

          <div className="absolute top-3 left-3">
            <BrandBadge brandId={idea.brand_id} />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-5 flex flex-col">
          <div className="mb-2">

            <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors leading-tight line-clamp-2">{idea.title}</h3>
          </div>

          <div className="flex-1 mb-4">
            <div className="text-gray-500 text-xs leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: idea.content || '' }} />
          </div>

          <div className="pt-3 border-t border-gray-50 flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
              {idea.image_prompt && <span className="flex items-center gap-1 text-purple-500 bg-purple-50 px-2 py-1 rounded-md"><Sparkles size={10} /> Prompt Généré</span>}
            </div>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                let nl: Newsletter | null = null;
                if (idea.newsletter_id) {
                  nl = await databaseService.fetchNewsletterById(idea.newsletter_id);
                }
                setDeleteIdeaState({ isOpen: true, idea: idea, newsletter: nl });
              }}
              className="text-gray-300 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };


  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await databaseService.createIdea({
        title: newIdea.title,
        brand_id: newIdea.brand_id,
        content: newIdea.content,
        source: 'Manuel',
        source_type: 'description'
      });
      startTransition(() => {
        setIsCreatingModalOpen(false);
        setNewIdea({ title: '', brand_id: '', content: '' });
      });
      await loadData();
    } finally { setIsSaving(false); }
  };

  const handleSaveIdea = async (updatedIdea: Idea) => {
    await loadData();
    setSelectedIdea(null);
  };


  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className={`space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 ${isPending && !selectedIdea ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Banque d'Idées</h2>
          <p className="text-gray-500 font-medium mt-1">Vos concepts de contenu pour vos futures newsletters.</p>
        </div>
        <button onClick={() => startTransition(() => setIsCreatingModalOpen(true))} className="bg-primary hover:bg-[#ffca28] text-gray-900 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1 flex items-center gap-2">
          <Plus size={20} /> Nouveau Concept
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-4 z-30">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une idée..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {/* Brand Filter */}
          <div className="relative">
            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-all appearance-none bg-white cursor-pointer min-w-[200px] font-bold text-sm"
            >
              <option value="all">Toutes les marques</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="space-y-16">

        {/* --- SECTION 1: NON UTILISÉES --- */}
        <StatusSection title="💡 Idées Disponibles (Non Utilisées)" count={unusedIdeas.length}>
          {unusedIdeas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {unusedIdeas.map(idea => (
                <IdeaCardCompact key={idea.id} idea={idea} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-[2rem] p-12 text-center text-gray-400">
              <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-bold">Aucune idée en attente pour le moment.</p>
              <button onClick={() => setIsCreatingModalOpen(true)} className="text-primary font-black uppercase text-xs mt-4 hover:underline">Créer une idée</button>
            </div>
          )}
        </StatusSection>

        {/* --- SECTION 2: UTILISÉES --- */}
        <StatusSection title="✅ Idées Utilisées" count={usedIdeas.length} collapsible defaultCollapsed={unusedIdeas.length > 0}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 opacity-75">
            {usedIdeas.map(idea => (
              <IdeaCardCompact key={idea.id} idea={idea} />
            ))}
          </div>
        </StatusSection>

      </div>


      {selectedIdea && (
        <IdeaEditModal
          idea={selectedIdea}
          brands={brands}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          onSave={handleSaveIdea}
          onClose={() => setSelectedIdea(null)}
        />
      )}

      {/* CREATE MODAL */}
      {isCreatingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase text-gray-900">Nouvelle Idée</h3>
              <button onClick={() => setIsCreatingModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateIdea} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500">Titre (obligatoire)</label>
                <input
                  required
                  className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Ex: Les 5 tendances 2024..."
                  value={newIdea.title}
                  onChange={e => setNewIdea({ ...newIdea, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500">Marque (obligatoire)</label>
                <select
                  required
                  className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  value={newIdea.brand_id}
                  onChange={e => setNewIdea({ ...newIdea, brand_id: e.target.value })}
                >
                  <option value="">Sélectionner une marque...</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500">Description / Notes</label>
                <textarea
                  className="w-full p-4 bg-gray-50 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  rows={4}
                  placeholder="Notez vos premières idées ici..."
                  value={newIdea.content}
                  onChange={e => setNewIdea({ ...newIdea, content: e.target.value })}
                />
              </div>
              <button type="submit" disabled={isSaving || !newIdea.title || !newIdea.brand_id} className="w-full py-4 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin" /> : 'Créer le concept'}
              </button>
            </form>
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
      {/* DELETE IDEA MODAL */}
      <DeleteIdeaModal
        isOpen={deleteIdeaState.isOpen}
        onClose={() => setDeleteIdeaState(prev => ({ ...prev, isOpen: false }))}
        idea={deleteIdeaState.idea}
        associatedNewsletter={deleteIdeaState.newsletter}
        onConfirm={async () => {
          if (deleteIdeaState.idea) {
            await databaseService.deleteIdea(deleteIdeaState.idea.id);
            setDeleteIdeaState(prev => ({ ...prev, isOpen: false }));
            await loadData();
          }
        }}
      />
    </div>
  );
};

export default Ideas;