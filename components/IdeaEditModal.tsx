import React, { useState, useRef, useTransition } from 'react';
import ReactQuill from 'react-quill';
import {
    X,
    Sparkles,
    Save,
    Wand2,
    Palette,
    Image as ImageIcon,
    CheckCircle2,
    Loader2,
    Monitor,
    Smartphone,
    LayoutGrid,
    Check,
    Upload,
    Sun,
    Contrast,
    Droplets,
    Copy,
    FileText
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { enhanceIdeaWithAI, generateImageFromPrompt } from '../services/geminiService';
import { Idea, Brand } from '../types';
import UpgradeModal from './UpgradeModal';

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

interface IdeaEditModalProps {
    idea: Idea;
    brands: Brand[];
    userProfile: any;
    onSave: (updatedIdea: Idea) => void;
    onClose: () => void;
    setUserProfile?: React.Dispatch<React.SetStateAction<any>>;
}

const IdeaEditModal: React.FC<IdeaEditModalProps> = ({
    idea,
    brands,
    userProfile,
    onSave,
    onClose,
    setUserProfile
}) => {
    const [selectedIdea, setSelectedIdea] = useState<Idea>(idea);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isAILoading, setIsAILoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPending, startTransition] = useTransition();

    // STUDIO VISUEL STATES
    const [studioImagePreview, setStudioImagePreview] = useState<string | null>(idea.image_url || null);
    const [studioPrompt, setStudioPrompt] = useState(idea.image_prompt || idea.title);
    const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
    const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("16:9");
    const [importedImage, setImportedImage] = useState<string | null>(null);
    const [editTab, setEditTab] = useState<'generate' | 'edit'>('generate');
    const [imageFilters, setImageFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleOpenStudio = () => {
        startTransition(() => {
            setStudioPrompt(selectedIdea.image_prompt || selectedIdea.title);
            setStudioImagePreview(selectedIdea.image_url || null);
            setImportedImage(null);
            setImageFilters({ brightness: 100, contrast: 100, saturation: 100 });
            setEditTab('generate');
            setShowImageModal(true);
        });
    };

    const handleSaveIdea = async () => {
        setIsSaving(true);
        try {
            const updated = await databaseService.updateIdea(selectedIdea.id, selectedIdea);
            if (updated) {
                onSave(updated);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleEnhanceWithAI = async () => {
        const currentCredits = userProfile?.credits ?? 0;
        if (currentCredits <= 0) {
            setShowUpgradeModal(true);
            return;
        }

        setIsAILoading(true);
        try {
            const brand = brands.find(b => b.id === selectedIdea.brand_id);
            const enhanced = await enhanceIdeaWithAI(selectedIdea, brand);

            const success = await databaseService.deductUserCredit(userProfile?.id || '');
            if (success && setUserProfile) {
                setUserProfile((prev: any) => ({ ...prev, credits: Math.max(0, (prev?.credits || 0) - 1) }));
            }

            setSelectedIdea(prev => ({ ...prev, ...enhanced }));
        } catch (error: any) {
            alert(error.message || "Erreur lors de la génération IA");
        } finally {
            setIsAILoading(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!studioPrompt || isGeneratingImage) return;

        const currentCredits = userProfile?.credits ?? 0;
        if (currentCredits <= 0) {
            setShowUpgradeModal(true);
            return;
        }

        setIsGeneratingImage(true);
        setEditTab('generate');
        try {
            const url = await generateImageFromPrompt(studioPrompt, selectedStyle.prefix, aspectRatio, importedImage);

            const success = await databaseService.deductUserCredit(userProfile?.id || '');
            if (success && setUserProfile) {
                setUserProfile((prev: any) => ({ ...prev, credits: Math.max(0, (prev?.credits || 0) - 1) }));
            }

            setStudioImagePreview(url);
            setImportedImage(null);
            setImageFilters({ brightness: 100, contrast: 100, saturation: 100 });
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
                setStudioImagePreview(base64);
                setImportedImage(base64);
                setEditTab('edit');
            };
            reader.readAsDataURL(file);
        }
    };

    const applyGeneratedImage = async () => {
        if (!studioImagePreview) return;
        setIsSaving(true);
        try {
            let finalImage = studioImagePreview;
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
            if (updated) {
                setSelectedIdea(updated);
                setShowImageModal(false);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {showUpgradeModal && (
                <UpgradeModal
                    isOpen={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    type="credits"
                    currentPlan={userProfile?.subscription_plan || 'free'}
                />
            )}

            {!showImageModal && (
                <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
                        {/* Hero Image Section */}
                        <div className="relative w-full h-64 bg-gray-900 overflow-hidden group">
                            {selectedIdea.image_url ? (
                                <img src={selectedIdea.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={selectedIdea.title} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                    <ImageIcon size={80} className="text-gray-700" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                            <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all shadow-xl border border-white/20 hover:scale-110"><X size={20} /></button>
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                                <button onClick={handleOpenStudio} className="px-8 py-4 bg-primary text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 hover:-translate-y-1 transition-all active:scale-95"><Wand2 size={16} /> Ouvrir Studio Visuel</button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Sidebar */}
                            <div className="w-full md:w-[30%] lg:w-[350px] bg-gray-50 border-r border-gray-100 flex flex-col relative shrink-0 overflow-y-auto custom-scrollbar">
                                <div className="flex-1 p-8 space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Statistiques & Infos</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1.5 bg-blue-500 rounded-lg"><FileText size={12} className="text-white" /></div>
                                                    <span className="text-[9px] font-black text-blue-600 uppercase">Source</span>
                                                </div>
                                                <p className="text-sm font-black text-blue-700 capitalize">{selectedIdea.source_type}</p>
                                            </div>
                                            <div className={`p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all ${selectedIdea.used ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-100'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`p-1.5 rounded-lg ${selectedIdea.used ? 'bg-green-500' : 'bg-gray-400'}`}>{selectedIdea.used ? <CheckCircle2 size={12} className="text-white" /> : <X size={12} className="text-white" />}</div>
                                                    <span className={`text-[9px] font-black uppercase ${selectedIdea.used ? 'text-green-600' : 'text-gray-500'}`}>Utilisé</span>
                                                </div>
                                                <p className={`text-sm font-black ${selectedIdea.used ? 'text-green-700' : 'text-gray-600'}`}>{selectedIdea.used ? 'Oui' : 'Non'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prompt Visuel IA</label>
                                        <div className="relative p-6 rounded-3xl bg-gradient-to-br from-purple-50 via-white to-blue-50 border border-purple-100/50 shadow-xl overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                            <div className="relative flex items-start gap-4">
                                                <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg shrink-0"><Sparkles className="text-white" size={20} /></div>
                                                <div className="flex-1 min-w-0"><p className="text-sm text-gray-700 leading-relaxed">{selectedIdea.image_prompt || "Le prompt visuel n'a pas encore été généré par l'IA."}</p></div>
                                                {selectedIdea.image_prompt && (
                                                    <button onClick={() => navigator.clipboard.writeText(selectedIdea.image_prompt || '')} className="p-2 hover:bg-white/80 rounded-xl transition-all shrink-0 group/copy" title="Copier le prompt"><Copy size={16} className="text-gray-400 group-hover/copy:text-purple-600" /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Editor Section */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-white article-editor">
                                <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50 bg-white sticky top-0 z-20">
                                    <div className="flex-1 mr-6">
                                        <input value={selectedIdea.title} onChange={e => setSelectedIdea(prev => ({ ...prev, title: e.target.value }))} className="text-2xl font-black uppercase tracking-tighter w-full outline-none focus:text-primary transition-colors bg-transparent" placeholder="Titre de l'idée..." />
                                    </div>
                                    <button onClick={handleEnhanceWithAI} disabled={isAILoading} className="px-5 py-2.5 bg-amber-50 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-amber-100 border border-amber-100 shadow-sm active:scale-95 disabled:opacity-50">
                                        {isAILoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Générer par IA
                                    </button>
                                </div>
                                <ReactQuill theme="snow" value={selectedIdea.content || ''} onChange={content => setSelectedIdea(prev => ({ ...prev, content }))} modules={QUILL_MODULES} className="flex-1 overflow-hidden flex flex-col [&>.ql-container]:flex-1 [&>.ql-container]:overflow-y-auto [&>.ql-container]:custom-scrollbar [&>.ql-editor]:min-h-full" placeholder="Rédigez le contenu complet ici..." />
                                <div className="p-8 border-t border-gray-50 flex gap-4 bg-gray-50/30">
                                    <button onClick={handleSaveIdea} disabled={isSaving} className="flex-1 py-4 bg-gray-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-black active:scale-95">{isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Enregistrer le concept</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL STUDIO VISUEL */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[500] flex items-center justify-center animate-in fade-in duration-500 p-4 lg:p-10">
                    <div className="w-full h-full max-h-[85vh] max-w-7xl flex flex-col md:flex-row overflow-hidden relative bg-white rounded-[3rem] shadow-2xl">
                        <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none z-50">
                            <div className="pointer-events-auto flex items-center gap-4">
                                <div className="bg-black/90 backdrop-blur-xl rounded-full px-8 py-4 text-white flex items-center gap-4 shadow-2xl border border-white/10 z-[100]">
                                    <Palette size={28} className="text-primary animate-pulse" />
                                    <span className="text-2xl font-black uppercase tracking-widest bg-gradient-to-r from-blue-500 to-fuchsia-500 bg-clip-text text-transparent">Visual Studio</span>
                                </div>
                            </div>
                            <button onClick={() => setShowImageModal(false)} className="pointer-events-auto p-3 bg-white hover:bg-gray-200 rounded-full text-black transition-all hover:scale-110 shadow-xl"><X size={24} /></button>
                        </div>

                        <div className={`flex-1 bg-[#0f0f11] relative flex flex-col items-center justify-center p-8 lg:p-16 overflow-hidden group transition-all duration-500`}>
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50 pointer-events-none"></div>

                            <div className={`relative transition-all duration-700 shadow-[0_0_100px_rgba(0,0,0,0.8)] outline outline-1 outline-white/10 bg-[#1a1a1c] flex items-center justify-center overflow-hidden
                                ${aspectRatio === '16:9' ? 'w-full max-w-5xl aspect-video rounded-xl' : aspectRatio === '9:16' ? 'h-full max-h-[80vh] aspect-[9/16] rounded-xl' : 'w-full max-w-2xl aspect-square rounded-xl'}
                                ${studioImagePreview ? 'ring-4 ring-offset-4 ring-offset-[#0f0f11] ring-primary/50' : ''}
                            `}>
                                {isGeneratingImage ? (
                                    <div className="flex flex-col items-center gap-4 animate-pulse z-10">
                                        <div className="relative"><div className="w-24 h-24 rounded-full border-t-2 border-b-2 border-primary animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><Sparkles size={24} className="text-primary animate-bounce" /></div></div>
                                        <div className="text-center space-y-2"><p className="text-white font-black text-sm uppercase tracking-[0.3em] font-mono">Génération en cours</p></div>
                                    </div>
                                ) : studioImagePreview ? (
                                    <img src={studioImagePreview} className="w-full h-full object-contain" style={{ filter: `brightness(${imageFilters.brightness}%) contrast(${imageFilters.contrast}%) saturate(${imageFilters.saturation}%)` }} />
                                ) : (
                                    <div className="text-center space-y-6 opacity-30"><div className="w-32 h-32 border border-dashed border-white/50 rounded-2xl flex items-center justify-center mx-auto"><ImageIcon size={48} className="text-white" /></div></div>
                                )}
                            </div>

                            {!isGeneratingImage && editTab === 'generate' && (
                                <div className="mt-8 w-full max-w-md z-40">
                                    <button onClick={handleGenerateImage} disabled={!studioPrompt} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30"><Sparkles size={18} className="text-primary" /><span>Générer le visuel</span></button>
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-[450px] bg-white h-auto md:h-full flex flex-col border-l border-gray-900 shadow-2xl z-40 relative">
                            <div className="flex border-b border-gray-100">
                                <button onClick={() => setEditTab('generate')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${editTab === 'generate' ? 'text-black border-b-2 border-black bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}>Génération</button>
                                <button onClick={() => setEditTab('edit')} disabled={!studioImagePreview} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${editTab === 'edit' ? 'text-black border-b-2 border-black bg-gray-50' : 'text-gray-400 hover:text-gray-600 disabled:opacity-30'}`}>Retouche</button>
                            </div>

                            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-10">
                                {editTab === 'generate' ? (
                                    <>
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Image de référence (Optionnel)</label>
                                            <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${importedImage ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImportImage} />
                                                {importedImage ? (
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200"><img src={importedImage} className="w-full h-full object-cover" /></div>
                                                        <div className="text-left"><p className="text-xs font-bold text-gray-900">Image chargée</p></div>
                                                        <button onClick={(e) => { e.stopPropagation(); setImportedImage(null); }} className="ml-auto p-2 hover:bg-gray-200 rounded-full"><X size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2"><Upload size={24} className="mx-auto text-gray-400" /><p className="text-xs font-medium text-gray-500">Importer une image</p></div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Le Brief Créatif</label>
                                            <textarea value={studioPrompt} onChange={e => setStudioPrompt(e.target.value)} rows={6} className="w-full bg-gray-50 border border-transparent focus:border-gray-200 focus:bg-white rounded-2xl p-4 text-gray-900 font-medium text-sm outline-none transition-all resize-none shadow-inner" placeholder="Vision..." />
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Format</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[{ id: '16:9', icon: Monitor }, { id: '1:1', icon: LayoutGrid }, { id: '9:16', icon: Smartphone }].map(ratio => (
                                                    <button key={ratio.id} onClick={() => setAspectRatio(ratio.id as any)} className={`py-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all border ${aspectRatio === ratio.id ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}><ratio.icon size={18} /><span className="text-[9px] font-bold">{ratio.id}</span></button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Direction Artistique</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {VISUAL_STYLES.map(style => (
                                                    <button key={style.id} onClick={() => setSelectedStyle(style)} className={`relative overflow-hidden rounded-xl border transition-all h-20 ${selectedStyle.id === style.id ? 'border-black ring-1 ring-black' : 'border-transparent bg-gray-50'}`}>
                                                        <img src={style.preview} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                                        <div className="absolute inset-0 bg-black/60 shadow-inner" />
                                                        <div className="absolute bottom-2 left-2"><p className="text-[9px] font-bold uppercase text-white">{style.name}</p></div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-8">
                                        {[{ label: 'Luminosité', key: 'brightness', icon: Sun }, { label: 'Contraste', key: 'contrast', icon: Contrast }, { label: 'Saturation', key: 'saturation', icon: Droplets }].map(f => (
                                            <div key={f.key} className="space-y-4">
                                                <div className="flex justify-between"><label className="text-xs font-black text-gray-900 uppercase flex items-center gap-2"><f.icon size={14} /> {f.label}</label><span className="text-xs font-bold font-mono">{(imageFilters as any)[f.key]}%</span></div>
                                                <input type="range" min="0" max="200" value={(imageFilters as any)[f.key]} onChange={e => setImageFilters({ ...imageFilters, [f.key]: parseInt(e.target.value) })} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                                <button onClick={applyGeneratedImage} disabled={isSaving || !studioImagePreview} className="w-full py-5 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 disabled:opacity-50">{isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}<span>Valider</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default IdeaEditModal;
