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
  { id: 'editorial', name: 'Photo Éditoriale', prefix: 'High-end professional editorial photography, cinematic lighting, ultra-realistic, 8k quality, magazine cover style.', preview: 'https://images.pexels.com/photos/167533/pexels-photo-167533.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1&fit=crop', color: '#1a1a2e' },
  { id: 'storybook', name: 'Illustration Douce', prefix: 'Soft watercolor illustration, children book style, whimsical, dreamy pastel colors, gentle artistic style.', preview: 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1&fit=crop', color: '#f8b4d9' },
  { id: 'isometric', name: 'Isométrie 3D', prefix: '3D isometric clay render, vibrant modern SaaS colors, soft shadows, clean minimalist 4k quality.', preview: 'https://images.pexels.com/photos/4513222/pexels-photo-4513222.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1&fit=crop', color: '#6366f1' },
  { id: 'flat', name: 'Flat Design', prefix: 'Modern flat design vector illustration, bold geometric shapes, vibrant colors, clean minimalist style, digital art.', preview: 'https://images.pexels.com/photos/1762851/pexels-photo-1762851.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1&fit=crop', color: '#10b981' },
  { id: 'retro', name: 'Rétro Vintage', prefix: 'Retro vintage 70s-80s aesthetic, warm nostalgic colors, grain texture, analog film look, groovy style.', preview: 'https://images.pexels.com/photos/1193743/pexels-photo-1193743.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1&fit=crop', color: '#f59e0b' },
  { id: 'bnw', name: 'Noir & Blanc', prefix: 'High contrast black and white artistic photography, dramatic lighting, fine art style, elegant monochrome.', preview: 'https://images.pexels.com/photos/1671325/pexels-photo-1671325.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1&fit=crop', color: '#374151' }
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

  // Filters
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // STUDIO VISUEL STATES
  const [showImageModal, setShowImageModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [studioImagePreview, setStudioImagePreview] = useState<string | null>(null);
  const [studioPrompt, setStudioPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("16:9");

  // NEW: Image Editing & Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedImage, setImportedImage] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<'generate' | 'edit'>('generate');
  const [imageFilters, setImageFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100
  });

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
      // Reset states
      setStudioPrompt(selectedIdea.image_prompt || selectedIdea.title);
      setStudioImagePreview(null);
      setImportedImage(null);
      setImageFilters({ brightness: 100, contrast: 100, saturation: 100 });
      setEditTab('generate');

      // If idea has an existing image, load it as "Imported/Current" to allow editing
      if (selectedIdea.image_url) {
        setStudioImagePreview(selectedIdea.image_url);
      }

      setShowImageModal(true);
    });
  };

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

  const IdeaCardLarge: React.FC<{ idea: Idea }> = ({ idea }) => {
    // Large format card
    return (
      <div onClick={() => handleSelectIdea(idea)} className="group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col md:flex-row overflow-hidden hover:-translate-y-1 h-full md:h-[280px]">
        {/* Image Section (Left or Top) - Bigger now */}
        <div className={`w-full md:w-[40%] bg-gray-100 relative overflow-hidden shrink-0`}>
          {idea.image_url ? (
            <img src={idea.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ImageIcon size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />

          {/* ID Badge or Type */}
          <div className="absolute top-4 left-4">
            <BrandBadge brandId={idea.brand_id} />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-8 flex flex-col relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">{idea.source_type || 'Idée'}</span>
              <h3 className="text-2xl font-black text-gray-900 group-hover:text-primary transition-colors leading-tight mb-2">{idea.title}</h3>
            </div>
            {/* Delete Button */}
            <button onClick={(e) => { e.stopPropagation(); startTransition(() => databaseService.deleteIdea(idea.id).then(loadData)); }} className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100">
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div className="text-gray-500 text-sm leading-relaxed line-clamp-4" dangerouslySetInnerHTML={{ __html: idea.content || '' }} />
            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent" />
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
              <span className="flex items-center gap-1.5"><Sparkles size={14} className={idea.image_prompt ? "text-purple-500" : ""} /> {idea.image_prompt ? "Prompt IA Généré" : "Pas de prompt"}</span>
            </div>
            <span className="text-primary font-black text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Ouvrir <ArrowRight size={14} />
            </span>
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
    setEditTab('generate'); // Ensure we are in generate mode
    try {
      // Pass importedImage (if any) to Service for Image-to-Image
      // The Service needs to be updated to handle this argument
      const url = await generateImageFromPrompt(studioPrompt, selectedStyle.prefix, aspectRatio, importedImage);
      setStudioImagePreview(url);
      setImportedImage(null); // Clear imported after generation (or keep it as reference?) -> Let's keep logic simple: new image replaces old
      setImageFilters({ brightness: 100, contrast: 100, saturation: 100 }); // Reset filters for new image
    } catch (e) {
      alert("Erreur de génération.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setStudioImagePreview(base64); // Show as current
        setImportedImage(base64); // Set as reference for AI
        setEditTab('edit'); // Switch to edit tab to show filters or just stay
      };
      reader.readAsDataURL(file);
    }
  };

  const applyGeneratedImage = async () => {
    if (!studioImagePreview || !selectedIdea) return;
    setIsSaving(true);

    try {
      let finalImage = studioImagePreview;

      // Baking Filters if modified
      if (imageFilters.brightness !== 100 || imageFilters.contrast !== 100 || imageFilters.saturation !== 100) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = studioImagePreview;
        await new Promise(resolve => { img.onload = resolve; });

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        if (ctx) {
          ctx.filter = `brightness(${imageFilters.brightness}%) contrast(${imageFilters.contrast}%) saturate(${imageFilters.saturation}%)`;
          ctx.drawImage(img, 0, 0);
          finalImage = canvas.toDataURL('image/png');
        }
      }

      const updated = await databaseService.updateIdea(selectedIdea.id, {
        image_url: finalImage,
        image_prompt: studioPrompt
      });
      startTransition(() => {
        if (updated) setSelectedIdea(updated);
        setShowImageModal(false);
        setStudioImagePreview(null);
        setImportedImage(null);
      });
      await loadData();
    } catch (e) {
      console.error("Save error", e);
    } finally { setIsSaving(false); }
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
        <button onClick={() => startTransition(() => setIsCreatingModalOpen(true))} className="bg-primary hover:bg-[#ffca28] text-gray-900 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1">
          <Plus size={20} className="mr-2" /> Nouveau Concept
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {unusedIdeas.map(idea => (
                <IdeaCardLarge key={idea.id} idea={idea} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
            {/* Format un peu plus compact pour les utilisées (ou identique ?) - Le user a demandé "format en plus grand" pour les idées. Gardons le grand format mais en grille de 3 pour les utilisées pour gagner de la place, ou grille de 2 aussi. Allons sur grille de 2 pour cohérence. */}
            {usedIdeas.map(idea => (
              <IdeaCardLarge key={idea.id} idea={idea} />
            ))}
          </div>
        </StatusSection>

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

      {/* MODAL STUDIO VISUEL PRO - ENHANCED */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[500] flex items-center justify-center animate-in fade-in duration-500">
          <div className="w-full h-full flex flex-col md:flex-row overflow-hidden relative">

            {/* Header / Top Bar (Floating) */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-50">
              <div className="pointer-events-auto bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 text-white flex items-center gap-3 shadow-2xl">
                <Palette size={16} className="text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Studio Visuel</span>
              </div>
              <button onClick={() => startTransition(() => setShowImageModal(false))} className="pointer-events-auto p-3 bg-white hover:bg-gray-200 rounded-full text-black transition-all hover:scale-110 shadow-xl"><X size={20} /></button>
            </div>

            {/* CANVAS AREA (Center/Left) */}
            <div className={`flex-1 bg-[#0f0f11] relative flex items-center justify-center p-8 lg:p-16 overflow-hidden group transition-all duration-500`}>
              {/* Background Grid Pattern */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50 pointer-events-none"></div>

              {/* The Image Stage */}
              <div className={`relative transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-[0_0_100px_rgba(0,0,0,0.8)] outline outline-1 outline-white/10 bg-[#1a1a1c] flex items-center justify-center overflow-hidden
                  ${aspectRatio === '16:9' ? 'w-full max-w-5xl aspect-video rounded-xl' :
                  aspectRatio === '9:16' ? 'h-full max-h-[80vh] aspect-[9/16] rounded-xl' :
                    'w-full max-w-2xl aspect-square rounded-xl'
                }`}>

                {isGeneratingImage ? (
                  <div className="flex flex-col items-center gap-4 animate-pulse z-10">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-t-2 border-b-2 border-primary animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles size={24} className="text-primary animate-bounce" />
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-white font-black text-sm uppercase tracking-[0.3em] font-mono">Rendering</p>
                      <p className="text-gray-500 text-[10px] font-mono">Utilizing Gemini Logic Core</p>
                    </div>
                  </div>
                ) : studioImagePreview ? (
                  <img
                    src={studioImagePreview}
                    className="w-full h-full object-contain animate-in fade-in zoom-in duration-700"
                    style={{
                      filter: `brightness(${imageFilters.brightness}%) contrast(${imageFilters.contrast}%) saturate(${imageFilters.saturation}%)`
                    }}
                  />
                ) : (
                  <div className="text-center space-y-6 opacity-30 group-hover:opacity-50 transition-opacity">
                    <div className="w-32 h-32 border border-dashed border-white/50 rounded-2xl flex items-center justify-center mx-auto">
                      <ImageIcon size={48} className="text-white" />
                    </div>
                    <p className="text-white text-xs font-black uppercase tracking-[0.2em]">Canvas Ready</p>
                  </div>
                )}

                {/* Canvas Actions Overlay */}
                {studioImagePreview && !isGeneratingImage && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 z-30">
                    <button onClick={() => { setStudioImagePreview(null); setImportedImage(null); }} className="p-3 hover:bg-white/10 rounded-xl text-white transition-colors" title="Clear">
                      <Trash2 size={18} />
                    </button>
                    <div className="w-px h-6 bg-white/20"></div>
                    <button onClick={applyGeneratedImage} disabled={isSaving} className="px-6 py-2 bg-primary hover:bg-amber-400 text-black rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2">
                      <Check size={14} /> Importer
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SIDEBAR CONTROLS (Right) */}
            <div className="w-full md:w-[450px] bg-white h-auto md:h-full flex flex-col border-l border-gray-900 shadow-2xl z-40 animate-in slide-in-from-right duration-500 relative">

              {/* Sidebar Tabs */}
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setEditTab('generate')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${editTab === 'generate' ? 'text-black border-b-2 border-black bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Génération
                </button>
                <button
                  onClick={() => setEditTab('edit')}
                  disabled={!studioImagePreview}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${editTab === 'edit' ? 'text-black border-b-2 border-black bg-gray-50' : 'text-gray-400 hover:text-gray-600 disabled:opacity-30'}`}
                >
                  Retouche
                </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-10">

                {editTab === 'generate' ? (
                  <>
                    {/* Section: Upload Image Reference */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Image de référence (Optionnel)</label>
                      </div>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${importedImage ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}
                      >
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImportImage} />
                        {importedImage ? (
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                              <img src={importedImage} className="w-full h-full object-cover" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-gray-900">Image chargée</p>
                              <p className="text-[10px] text-gray-500">Sera utilisée comme inspiration</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setImportedImage(null); if (studioImagePreview === importedImage) setStudioImagePreview(null); }}
                              className="ml-auto p-2 hover:bg-gray-200 rounded-full"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload size={24} className="mx-auto text-gray-400" />
                            <p className="text-xs font-medium text-gray-500">Cliquez pour importer une image</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section: Prompt */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Le Brief Créatif</label>
                        <span className="text-[10px] text-gray-400 font-mono">AI-POWERED</span>
                      </div>
                      <div className="relative group">
                        <textarea
                          value={studioPrompt}
                          onChange={e => setStudioPrompt(e.target.value)}
                          rows={8}
                          className="w-full bg-gray-50 border border-transparent focus:border-gray-200 focus:bg-white rounded-2xl p-4 text-gray-900 font-medium text-sm outline-none transition-all resize-none leading-relaxed shadow-inner placeholder:text-gray-400"
                          placeholder="Décrivez votre vision..."
                        />
                        <div className="absolute bottom-3 right-3 p-1.5 bg-white rounded-lg shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Wand2 size={12} className="text-purple-500" />
                        </div>
                      </div>
                    </div>

                    {/* Section: Format */}
                    <div className="space-y-4">
                      <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Format</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: '16:9', icon: Monitor, label: 'Paysage' },
                          { id: '1:1', icon: LayoutGrid, label: 'Carré' },
                          { id: '9:16', icon: Smartphone, label: 'Story' }
                        ].map(ratio => (
                          <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id as any)}
                            className={`py-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all border ${aspectRatio === ratio.id
                              ? 'bg-black text-white border-black shadow-lg scale-105'
                              : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-600'}`}
                          >
                            <ratio.icon size={18} strokeWidth={aspectRatio === ratio.id ? 2.5 : 2} />
                            <span className="text-[9px] font-bold">{ratio.id}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section: Style */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Direction Artistique</label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {VISUAL_STYLES.map(style => (
                          <button
                            key={style.id}
                            onClick={() => setSelectedStyle(style)}
                            className={`group relative overflow-hidden rounded-xl border transition-all duration-300 text-left h-24 ${selectedStyle.id === style.id
                              ? 'border-black ring-1 ring-black shadow-xl scale-[1.02]'
                              : 'border-transparent hover:border-gray-200 bg-gray-50'}`}
                          >
                            <img src={style.preview} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                            <div className="absolute bottom-0 left-0 w-full p-3">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${selectedStyle.id === style.id ? 'text-white' : 'text-gray-200'}`}>{style.name}</p>
                            </div>
                            {selectedStyle.id === style.id && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-black shadow-sm">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  // EDIT TAB CONTENT
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="p-4 bg-blue-50 text-blue-800 rounded-2xl text-xs font-medium border border-blue-100">
                      Ajustez l'apparence de l'image. Ces réglages seront appliqués à l'importation.
                    </div>

                    {/* Brightness */}
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                          <Sun size={14} /> Luminosité
                        </label>
                        <span className="text-xs font-bold text-gray-500">{imageFilters.brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={imageFilters.brightness}
                        onChange={e => setImageFilters({ ...imageFilters, brightness: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                          <Contrast size={14} /> Contraste
                        </label>
                        <span className="text-xs font-bold text-gray-500">{imageFilters.contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={imageFilters.contrast}
                        onChange={e => setImageFilters({ ...imageFilters, contrast: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                          <Droplets size={14} /> Saturation
                        </label>
                        <span className="text-xs font-bold text-gray-500">{imageFilters.saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={imageFilters.saturation}
                        onChange={e => setImageFilters({ ...imageFilters, saturation: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    <button
                      onClick={() => setImageFilters({ brightness: 100, contrast: 100, saturation: 100 })}
                      className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      Réinitialiser
                    </button>
                  </div>
                )}

              </div>

              {/* Footer / Action */}
              <div className="p-8 border-t border-gray-100 bg-gray-50/50 backdrop-blur-sm">
                {editTab === 'generate' ? (
                  <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !studioPrompt}
                    className="w-full py-5 bg-black hover:bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:transform-none group"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={18} className="group-hover:text-primary transition-colors" fill="currentColor" />
                        <span>Générer</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={applyGeneratedImage} // Apply logic handles filter baking
                    disabled={isSaving}
                    className="w-full py-5 bg-primary hover:bg-amber-400 text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                  >
                    <CheckCircle2 size={18} />
                    <span>Valider les retouches</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
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
    </div>
  );
};

export default Ideas;