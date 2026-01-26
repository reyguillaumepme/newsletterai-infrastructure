import React, { useState, useEffect, useMemo, useTransition } from 'react';
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
  FileText
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { authService, DEMO_USER_EMAIL } from '../services/authService';
import { enhanceIdeaWithAI, generateImageFromPrompt } from '../services/geminiService';
import { Idea, Brand } from '../types';

const QUILL_MODULES = {
  toolbar: [
    [{ 'font': [false, 'serif', 'monospace'] }, { 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'clean']
  ],
};

const VISUAL_STYLES = [
  { id: 'editorial', name: 'Photo Éditoriale', prefix: 'High-end professional editorial photography, cinematic lighting, ultra-realistic, 8k.', preview: 'https://images.pexels.com/photos/167533/pexels-photo-167533.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1&fit=crop' },
  { id: 'storybook', name: 'Livre pour enfant', prefix: 'Children book illustration, soft watercolor, whimsical.', preview: 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1&fit=crop' },
  { id: 'isometric', name: 'Isométrie 3D', prefix: '3D isometric clay render, vibrant SaaS colors, 4k.', preview: 'https://images.pexels.com/photos/4513222/pexels-photo-4513222.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1&fit=crop' }
];

const Ideas: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // STUDIO VISUEL STATES
  const [showImageModal, setShowImageModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [studioImagePreview, setStudioImagePreview] = useState<string | null>(null);
  const [studioPrompt, setStudioPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("16:9");

  const [newIdea, setNewIdea] = useState({ title: '', brand_id: '', content: '' });

  const user = authService.getCurrentUser();
  const isDemo = user?.email?.toLowerCase() === DEMO_USER_EMAIL;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [iData, bData] = await Promise.all([databaseService.fetchIdeas(), databaseService.fetchBrands()]);
      setIdeas(iData || []);
      setBrands(bData || []);
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

  const handleOpenStudio = () => {
    if (!selectedIdea) return;
    startTransition(() => {
      setStudioPrompt(selectedIdea.image_prompt || selectedIdea.title);
      setShowImageModal(true);
    });
  };

  const groupedIdeas = useMemo(() => {
    return brands.map(brand => {
      const brandIdeas = ideas.filter(i => i.brand_id === brand.id);
      return { ...brand, ideas: brandIdeas };
    }).filter(b => b.ideas.length > 0 || brands.length === 1);
  }, [brands, ideas]);

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

  const handleSaveIdea = async () => {
    if (!selectedIdea) return;
    setIsSaving(true);
    await databaseService.updateIdea(selectedIdea.id, selectedIdea);
    await loadData();
    setIsSaving(false);
  };

  const handleEnhanceWithAI = async () => {
    if (!selectedIdea || isDemo) return;
    setIsAILoading(true);
    try {
      const brand = brands.find(b => b.id === selectedIdea.brand_id);
      const enhanced = await enhanceIdeaWithAI(selectedIdea, brand);
      startTransition(() => {
        setSelectedIdea(prev => prev ? { ...prev, ...enhanced } : null);
      });
    } catch (error: any) {
      alert(error.message || "Erreur lors de la génération IA");
    } finally { setIsAILoading(false); }
  };

  const handleGenerateImage = async () => {
    if (!studioPrompt || isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const url = await generateImageFromPrompt(studioPrompt, selectedStyle.prefix, aspectRatio);
      setStudioImagePreview(url);
    } catch (e) {
      alert("Erreur de génération.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const applyGeneratedImage = async () => {
    if (!studioImagePreview || !selectedIdea) return;
    setIsSaving(true);
    try {
      const updated = await databaseService.updateIdea(selectedIdea.id, {
        image_url: studioImagePreview,
        image_prompt: studioPrompt
      });
      startTransition(() => {
        if (updated) setSelectedIdea(updated);
        setShowImageModal(false);
        setStudioImagePreview(null);
      });
      await loadData();
    } finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className={`space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 ${isPending && !selectedIdea ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Banque d'Idées</h2>
          <p className="text-gray-500 font-medium mt-1">Vos concepts de contenu regroupés par univers de marque.</p>
        </div>
        <button onClick={() => startTransition(() => setIsCreatingModalOpen(true))} className="bg-primary hover:bg-[#ffca28] text-gray-900 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1">
          <Plus size={20} className="mr-2" /> Nouveau Concept
        </button>
      </div>

      <div className="space-y-16">
        {groupedIdeas.map(brandGroup => (
          <div key={brandGroup.id} className="space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                  {brandGroup.logo_url ? <img src={brandGroup.logo_url} className="w-full h-full object-contain p-2" /> : <Briefcase size={24} className="text-gray-300" />}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">{brandGroup.brand_name}</h3>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">{brandGroup.ideas.length} concept{brandGroup.ideas.length > 1 ? 's' : ''} actif{brandGroup.ideas.length > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {brandGroup.ideas.map(idea => (
                <div key={idea.id} onClick={() => handleSelectIdea(idea)} className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer h-full flex flex-col group hover:-translate-y-1 relative overflow-hidden">
                  <div className="relative aspect-video rounded-3xl overflow-hidden mb-6 bg-gray-50 border border-gray-100/50 shadow-inner">
                    {idea.image_url ? (
                      <img src={idea.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <ImageIcon size={40} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 tracking-tight group-hover:text-primary transition-colors">{idea.title}</h3>
                  <div className="text-gray-400 text-sm line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: idea.content || '' }} />
                  <button onClick={(e) => { e.stopPropagation(); startTransition(() => databaseService.deleteIdea(idea.id).then(loadData)); }} className="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur-md rounded-2xl text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-500 hover:text-white"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>


      {selectedIdea && !showImageModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">

            {/* Hero Image Section - Full Width */}
            <div className="relative w-full h-64 bg-gray-900 overflow-hidden group">
              {selectedIdea.image_url ? (
                <img
                  src={selectedIdea.image_url}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={selectedIdea.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <ImageIcon size={80} className="text-gray-700" />
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* Close Button - Top Right */}
              <button
                onClick={() => startTransition(() => setSelectedIdea(null))}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all shadow-xl border border-white/20 hover:scale-110"
              >
                <X size={20} />
              </button>

              {/* Studio Button - Bottom Center */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                <button
                  onClick={handleOpenStudio}
                  className="px-8 py-4 bg-primary text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 hover:-translate-y-1 transition-all active:scale-95"
                >
                  <Wand2 size={16} /> Ouvrir Studio Visuel
                </button>
              </div>
            </div>

            {/* Content Area - Sidebar + Editor */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

              {/* Sidebar - 30% */}
              <div className="w-full md:w-[30%] lg:w-[350px] bg-gray-50 border-r border-gray-100 flex flex-col relative shrink-0 overflow-y-auto custom-scrollbar">
                <div className="flex-1 p-8 space-y-8">

                  {/* Enriched Metadata */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Statistiques & Infos
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Source Card */}
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-blue-500 rounded-lg">
                            <FileText size={12} className="text-white" />
                          </div>
                          <span className="text-[9px] font-black text-blue-600 uppercase">Source</span>
                        </div>
                        <p className="text-sm font-black text-blue-700 capitalize">
                          {selectedIdea.source_type}
                        </p>
                      </div>

                      {/* Used Status Card */}
                      <div className={`p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all ${selectedIdea.used
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                        : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-100'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-lg ${selectedIdea.used ? 'bg-green-500' : 'bg-gray-400'}`}>
                            {selectedIdea.used ? (
                              <CheckCircle2 size={12} className="text-white" />
                            ) : (
                              <X size={12} className="text-white" />
                            )}
                          </div>
                          <span className={`text-[9px] font-black uppercase ${selectedIdea.used ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            Utilisé
                          </span>
                        </div>
                        <p className={`text-sm font-black ${selectedIdea.used ? 'text-green-700' : 'text-gray-600'}`}>
                          {selectedIdea.used ? 'Oui' : 'Non'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Prompt Card with Glassmorphism */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Prompt Visuel IA
                    </label>

                    <div className="relative p-6 rounded-3xl bg-gradient-to-br from-purple-50 via-white to-blue-50 border border-purple-100/50 shadow-xl overflow-hidden group">
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                      <div className="relative flex items-start gap-4">
                        {/* AI Icon with Gradient */}
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg shrink-0">
                          <Sparkles className="text-white" size={20} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {selectedIdea.image_prompt || "Le prompt visuel n'a pas encore été généré par l'IA."}
                          </p>
                        </div>

                        {/* Copy Button */}
                        {selectedIdea.image_prompt && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedIdea.image_prompt || '');
                            }}
                            className="p-2 hover:bg-white/80 rounded-xl transition-all shrink-0 group/copy"
                            title="Copier le prompt"
                          >
                            <Copy size={16} className="text-gray-400 group-hover/copy:text-purple-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Editor Section - 70% */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white article-editor">
                <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50 bg-white sticky top-0 z-20">
                  <div className="flex-1 mr-6">
                    <input
                      value={selectedIdea.title}
                      onChange={e => setSelectedIdea(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="text-2xl font-black uppercase tracking-tighter w-full outline-none focus:text-primary transition-colors bg-transparent"
                      placeholder="Titre de l'idée..."
                    />
                  </div>
                  <button onClick={handleEnhanceWithAI} disabled={isAILoading} className="px-5 py-2.5 bg-amber-50 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-amber-100 border border-amber-100 shadow-sm active:scale-95 disabled:opacity-50">
                    {isAILoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Générer par IA
                  </button>
                </div>

                <ReactQuill
                  theme="snow"
                  value={selectedIdea.content || ''}
                  onChange={content => setSelectedIdea(prev => prev ? { ...prev, content } : null)}
                  modules={QUILL_MODULES}
                  className="flex-1 overflow-y-auto custom-scrollbar"
                  placeholder="Rédigez le contenu complet ici..."
                />

                <div className="p-8 border-t border-gray-50 flex gap-4 bg-gray-50/30">
                  <button onClick={handleSaveIdea} disabled={isSaving} className="flex-1 py-4 bg-gray-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-black active:scale-95">
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Enregistrer le concept
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL STUDIO VISUEL */}
      {showImageModal && (
        <div className="fixed inset-0 bg-gray-950/98 backdrop-blur-3xl z-[500] flex items-center justify-center p-4">
          <div className="bg-white/5 border border-white/10 w-full max-w-6xl h-[85vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-500">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-2xl text-gray-900 shadow-lg shadow-primary/20"><Palette size={24} /></div>
                <div>
                  <h3 className="text-white text-2xl font-black uppercase tracking-tighter">Studio Visuel IA</h3>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">Powered by Gemini 2.5 Flash Image</p>
                </div>
              </div>
              <button onClick={() => startTransition(() => setShowImageModal(false))} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="w-full lg:w-[400px] p-8 border-r border-white/5 space-y-8 overflow-y-auto custom-scrollbar bg-black/20">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Style Artistique</label>
                  <div className="grid grid-cols-1 gap-3">
                    {VISUAL_STYLES.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style)}
                        className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${selectedStyle.id === style.id ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-sm">
                          <img src={style.preview} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-[10px] uppercase tracking-widest">{style.name}</span>
                        {selectedStyle.id === style.id && <CheckCircle2 size={16} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ratio d'aspect</label>
                  <div className="flex bg-white/5 p-1 rounded-xl gap-1">
                    {[
                      { id: '16:9', icon: Monitor },
                      { id: '1:1', icon: LayoutGrid },
                      { id: '9:16', icon: Smartphone }
                    ].map(ratio => (
                      <button
                        key={ratio.id}
                        onClick={() => setAspectRatio(ratio.id as any)}
                        className={`flex-1 py-3 rounded-lg flex flex-col items-center gap-1 transition-all ${aspectRatio === ratio.id ? 'bg-primary text-gray-900 shadow-lg' : 'text-gray-500 hover:text-white'}`}
                      >
                        <ratio.icon size={18} />
                        <span className="text-[8px] font-black">{ratio.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Prompt créatif</label>
                  <textarea
                    value={studioPrompt}
                    onChange={e => setStudioPrompt(e.target.value)}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-white font-bold text-sm outline-none focus:ring-4 focus:ring-primary/20 transition-all resize-none leading-relaxed"
                    placeholder="Décrivez l'image souhaitée..."
                  />
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !studioPrompt}
                  className="w-full py-5 bg-primary text-gray-900 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isGeneratingImage ? <Loader2 className="animate-spin" /> : <Zap size={18} fill="currentColor" />} {isGeneratingImage ? 'Magie en cours...' : 'Générer l\'image'}
                </button>
              </div>

              <div className="flex-1 p-12 bg-black/40 flex flex-col items-center justify-center relative overflow-hidden">
                <div className={`transition-all duration-700 relative z-10 bg-white/5 rounded-[3.5rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.6)] border border-white/10 flex items-center justify-center ${aspectRatio === '16:9' ? 'w-full max-w-4xl aspect-video' :
                  aspectRatio === '9:16' ? 'h-full max-h-[650px] aspect-[9/16]' :
                    'w-full max-w-xl aspect-square'
                  }`}>
                  {isGeneratingImage ? (
                    <div className="flex flex-col items-center gap-6 animate-in fade-in">
                      <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg"></div>
                      <p className="text-primary font-black text-[10px] uppercase tracking-[0.3em]">Neural Rendering...</p>
                    </div>
                  ) : studioImagePreview ? (
                    <img src={studioImagePreview} className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000" />
                  ) : (
                    <div className="text-center space-y-4 text-gray-700">
                      <Wand2 size={80} className="mx-auto opacity-10" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30">En attente de commandes créatives</p>
                    </div>
                  )}
                </div>

                {studioImagePreview && !isGeneratingImage && (
                  <div className="flex gap-4 mt-12 animate-in slide-in-from-bottom-6 duration-500 z-20">
                    <button onClick={() => setStudioImagePreview(null)} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all">Recommencer</button>
                    <button onClick={applyGeneratedImage} disabled={isSaving} className="px-12 py-4 bg-primary text-gray-900 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-3 hover:shadow-primary/30 transition-all active:scale-95">
                      {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />} Appliquer à ce concept
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION CONCEPT */}
      {isCreatingModalOpen && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Nouveau Concept</h3>
                <button onClick={() => startTransition(() => setIsCreatingModalOpen(false))} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateIdea} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identité de Marque</label>
                  <select required value={newIdea.brand_id} onChange={e => setNewIdea({ ...newIdea, brand_id: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold">
                    <option value="">Sélectionner une marque...</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sujet / Titre de l'idée</label>
                  <input required value={newIdea.title} onChange={e => setNewIdea({ ...newIdea, title: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold" placeholder="Ex: Pourquoi l'IA va changer le marketing" />
                </div>
                <button type="submit" disabled={isSaving || !newIdea.brand_id} className="w-full py-5 bg-gray-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                  {isSaving ? <Loader2 className="animate-spin" /> : <Plus size={18} />} Créer le concept
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ideas;