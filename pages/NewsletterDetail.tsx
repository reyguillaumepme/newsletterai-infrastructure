import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import { 
  ArrowLeft, 
  Plus, 
  Send, 
  Calendar, 
  MoreVertical, 
  Image as ImageIcon, 
  FileText, 
  Trash2, 
  Loader2,
  Briefcase,
  X,
  Zap,
  Layers,
  GripVertical,
  Wand2,
  Save,
  Quote,
  Code,
  CheckCircle2,
  AlertCircle,
  Eye,
  Clock,
  ChevronRight,
  Info,
  Smartphone,
  Monitor,
  Copy,
  MailCheck,
  SendHorizontal,
  TriangleAlert,
  LayoutDashboard,
  ExternalLink,
  AlignLeft,
  ShieldAlert,
  Copyright,
  RotateCcw,
  Users,
  UserX,
  Rocket
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { mailService } from '../services/mailService';
import { authService, DEMO_USER_EMAIL } from '../services/authService';
import { generateNewsletterHook } from '../services/geminiService';
import { Newsletter, Idea, Brand, StructuredStrategy, StrategyCTA, Contact } from '../types';

const QUILL_MODULES = {
  toolbar: [
    [{ 'font': [false, 'serif', 'monospace'] }, { 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'clean']
  ],
};

const NewsletterDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const currentUser = authService.getCurrentUser();
  const isDemo = currentUser?.email?.toLowerCase() === DEMO_USER_EMAIL;

  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [availableIdeas, setAvailableIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [showIdeaPicker, setShowIdeaPicker] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSendTestModal, setShowSendTestModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop');
  
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showNoContactsModal, setShowNoContactsModal] = useState(false);
  const [publishRecipients, setPublishRecipients] = useState<Contact[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishReport, setPublishReport] = useState<{success: number, failed: number} | null>(null);
  
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isGeneratingHook, setIsGeneratingHook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState(currentUser?.email || '');
  
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' });
  const [hookHtmlMode, setHookHtmlMode] = useState(false);
  const [hookValue, setHookValue] = useState('');
  const [footerValue, setFooterValue] = useState('');
  const [footerHtmlMode, setFooterHtmlMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newNlData, setNewNlData] = useState({ subject: '', brand_id: '' });

  const generateDefaultFooter = (brandName: string) => {
    return `
      <div style="text-align: center;">
        <p style="margin: 0 0 12px 0; font-weight: 800; color: #64748b; font-size: 16px;"><span style="display: inline-block; width: 100%;">Envoyé par ${brandName}</span></p>
        <p style="margin: 0; line-height: 1.6; max-width: 400px; margin-left: auto; margin-right: auto; color: #94a3b8;"><span style="display: inline-block; width: 100%;">Vous recevez ce message car vous êtes abonné à ma Newsletter.</span></p>
        <div style="margin: 30px auto; width: 80%; border-top: 1px solid #f1f5f9;"></div>
        <p style="margin: 0;">
          <a href="{{unsubscribe_url}}" style="color: #64748b; text-decoration: underline; font-weight: 500;">Se désabonner</a> 
          <span style="margin: 0 12px; color: #cbd5e1;">•</span> 
          <a href="#" style="color: #64748b; text-decoration: underline; font-weight: 500;">Voir en ligne</a>
        </p>
        <p style="margin: 30px 0 0 0; font-size: 11px; color: #cbd5e1; letter-spacing: 0.025em;">
          &copy; ${new Date().getFullYear()} ${brandName}. Tous droits réservés.
        </p>
      </div>
    `;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isNew) {
        const bData = await databaseService.fetchBrands();
        setBrands(bData || []);
      } else if (id) {
        const [nlData, ideaData] = await Promise.all([
          databaseService.fetchNewsletterById(id),
          databaseService.fetchIdeasByNewsletter(id)
        ]);

        if (nlData) {
          startTransition(() => {
            setNewsletter(nlData);
            setHookValue(nlData.generated_content || '');
            databaseService.fetchBrandById(nlData.brand_id).then(bData => {
              setBrand(bData);
              if (nlData.footer_content) {
                setFooterValue(nlData.footer_content);
              } else if (bData) {
                setFooterValue(generateDefaultFooter(bData.brand_name));
              }
            });
            setIdeas(ideaData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
          });
          if (nlData.scheduled_at) {
            const d = new Date(nlData.scheduled_at);
            setScheduleData({
              date: d.toISOString().split('T')[0],
              time: d.toTimeString().slice(0, 5)
            });
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    if (showIdeaPicker && newsletter?.brand_id) {
      const loadAvailableIdeas = async () => {
        setIsLoadingPicker(true);
        try {
          const allIdeas = await databaseService.fetchIdeasByBrand(newsletter.brand_id);
          const usedIds = new Set(ideas.map(i => i.id));
          setAvailableIdeas(allIdeas.filter(idea => !usedIds.has(idea.id)));
        } finally {
          setIsLoadingPicker(false);
        }
      };
      loadAvailableIdeas();
    }
  }, [showIdeaPicker, newsletter?.brand_id, ideas]);

  const handleStartCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNlData.brand_id || !newNlData.subject) return;
    setIsSaving(true);
    try {
      const created = await databaseService.createNewsletter({
        subject: newNlData.subject,
        brand_id: newNlData.brand_id,
        status: 'draft',
        created_at: new Date().toISOString()
      });
      startTransition(() => {
        navigate(`/newsletters/${created.id}`);
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNewsletter = async (updates: Partial<Newsletter>) => {
    if (!id || !newsletter || isNew) return;
    setIsSaving(true);
    try {
      await databaseService.updateNewsletter(id, updates);
      startTransition(() => {
        setNewsletter(prev => prev ? { ...prev, ...updates } : null);
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateHook = async () => {
    if (!newsletter || ideas.length === 0) return;
    if (isDemo) { alert("IA inactive en démo."); return; }
    setIsGeneratingHook(true);
    try {
      const hook = await generateNewsletterHook(newsletter.subject, ideas, brand || undefined);
      const hookHtml = `<p>${hook}</p>`;
      startTransition(() => {
        setHookValue(hookHtml);
      });
      handleSaveNewsletter({ generated_content: hookHtml });
    } finally {
      setIsGeneratingHook(false);
    }
  };

  const handleAddIdeaToNewsletter = async (idea: Idea) => {
    const newIdx = ideas.length;
    const updatedIdea = { ...idea, newsletter_id: id, order_index: newIdx };
    startTransition(() => {
      setIdeas([...ideas, updatedIdea]);
      setAvailableIdeas(prev => prev.filter(i => i.id !== idea.id));
      setShowIdeaPicker(false);
      setOrderSaved(false);
    });
    await databaseService.updateIdea(idea.id, { newsletter_id: id, order_index: newIdx });
  };

  const handleSelectIdea = (idea: Idea) => {
    startTransition(() => {
      setSelectedIdea(idea);
    });
  };

  const renderNewsletterHtml = () => {
    if (!newsletter) return "";
    const primaryColor = "#FFD54F";
    const brandLogo = brand?.logo_url || "";
    const brandName = brand?.brand_name || "NewsletterAI";
    
    let ctaSectionHtml = "";
    if (brand?.cta_config) {
      try {
        const ctas: StrategyCTA[] = JSON.parse(brand.cta_config);
        const activeCTAs = ctas.filter(cta => cta.enabled && cta.url);
        ctaSectionHtml = activeCTAs.map(cta => `
          <div style="padding: 20px 40px; text-align: center;">
            <a href="${cta.url}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">${cta.label}</a>
          </div>
        `).join("");
      } catch (e) {}
    }

    const formatContent = (html: string) => {
      if (!html) return "";
      const cleanHtml = html.replace(/&nbsp;/g, ' ');
      return cleanHtml
        .replace(/<p\b([^>]*)>/g, '<p$1><span style="display: inline-block; width: 100%; white-space: normal;">')
        .replace(/<\/p>/g, '</span></p>');
    };

    return `<!DOCTYPE html><html>
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; overflow-x: hidden; width: 100%; font-family: 'Inter', sans-serif, Arial; background-color: #f8fafc; }
          p { margin: 0 0 1.2em 0; line-height: 1.6; text-align: left; }
          .content-area .ql-size-huge { font-size: 32px !important; line-height: 1.2 !important; font-weight: 800 !important; }
        </style>
      </head>
      <body style="padding: 20px; margin:0;">
      <div style="max-width: 750px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #f1f5f9; width: 100%;">
        <div style="padding: 40px; text-align: center; border-bottom: 4px solid ${primaryColor};">
          ${brandLogo ? `<img src="${brandLogo}" height="60" style="margin-bottom: 25px;" alt="${brandName}" />` : ''}
          <h1 style="margin: 0; font-size: 28px; color: #0f172a; font-weight: 800;">${newsletter.subject}</h1>
        </div>
        <div style="padding: 40px; background-color: #ffffff; text-align: left;">
           <div class="content-area" style="color: #334155; font-size: 16px;">
              ${formatContent(hookValue)}
           </div>
        </div>
        ${ideas.map(i => `<div style="padding: 40px; border-top: 1px solid #f1f5f9;">
          ${i.image_url ? `<img src="${i.image_url}" width="100%" style="border-radius: 12px; margin-bottom: 24px;" />` : ''}
          <h3 style="margin: 0 0 16px 0; font-size: 22px; color: #0f172a; font-weight: 800;">${i.title}</h3>
          <div class="content-area" style="font-size: 15px; color: #475569;">
            ${formatContent(i.content)}
          </div>
        </div>`).join('')}
        ${ctaSectionHtml}
        <div style="padding: 60px 40px; text-align: center; background-color: #ffffff; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 14px;">
          <div class="content-area">
            ${formatContent(footerValue || generateDefaultFooter(brandName))}
          </div>
        </div>
      </div></body></html>`;
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="animate-spin text-primary" size={64} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => startTransition(() => navigate('/newsletters'))} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <input 
              type="text" 
              value={newsletter.subject} 
              onChange={e => setNewsletter(prev => prev ? {...prev, subject: e.target.value} : null)}
              onBlur={() => handleSaveNewsletter({ subject: newsletter.subject })}
              className="text-3xl font-bold tracking-tighter bg-transparent border-none outline-none w-full rounded-lg px-2 -ml-2"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => startTransition(() => setShowPreviewModal(true))} className="px-5 py-2.5 bg-gray-950 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-gray-200"><Eye size={18} /> Aperçu Final</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
             <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-50 bg-white">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Quote size={20} /></div>
                   <h3 className="text-lg font-black uppercase">Texte d'accroche</h3>
                </div>
                <button onClick={handleGenerateHook} disabled={isGeneratingHook || ideas.length === 0} className="px-5 py-2.5 bg-gray-950 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-gray-200">{isGeneratingHook ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} fill="currentColor" />} Générer par IA</button>
             </div>
             <div className="relative hook-editor flex-grow">
                <ReactQuill theme="snow" value={hookValue} onChange={setHookValue} onBlur={() => handleSaveNewsletter({ generated_content: hookValue })} modules={QUILL_MODULES} />
             </div>
          </div>

          <div className="space-y-4 relative">
            {ideas.map((idea, index) => (
              <div key={idea.id} onClick={() => handleSelectIdea(idea)} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer flex gap-5 relative">
                <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-gray-50">
                  {idea.image_url ? <img src={idea.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-200"><ImageIcon size={28} /></div>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                  <h4 className="font-bold text-base truncate tracking-tight mb-1">{idea.title}</h4>
                  <div className="text-gray-400 text-[11px] line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: idea.content || '' }} />
                </div>
              </div>
            ))}
            <button onClick={() => startTransition(() => setShowIdeaPicker(true))} className="w-full py-8 border-3 border-dashed border-gray-100 rounded-[2.5rem] text-gray-300 hover:border-primary/20 hover:text-primary transition-all flex flex-col items-center gap-3">
              <Plus size={22} /><span className="font-black text-[9px] uppercase tracking-widest">Ajouter un bloc</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm sticky top-8">
            <h3 className="font-bold mb-6 flex items-center gap-3 text-lg"><FileText size={20} className="text-primary" /> SOMMAIRE</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-50"><Quote size={12} className="text-primary" /><span className="text-[11px] font-bold text-gray-400">Accroche</span></div>
              {ideas.map((i, idx) => (
                <div key={i.id} className="flex items-center gap-3 p-3 bg-white border border-gray-50 rounded-xl shadow-sm"><span className="w-5 h-5 bg-primary text-gray-900 rounded-full flex items-center justify-center text-[9px] font-black shrink-0">{idx + 1}</span><span className="truncate text-[11px] font-bold text-gray-600">{i.title}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPreviewModal && (
        <div className="fixed inset-0 bg-gray-950/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4 overflow-hidden">
           <div className="bg-white w-full max-w-[1400px] h-[95vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-500">
              <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-white z-10 sticky top-0">
                 <h3 className="font-black text-xl uppercase tracking-tighter">Aperçu Rapide</h3>
                 <button onClick={() => startTransition(() => setShowPreviewModal(false))} className="p-3 bg-gray-100 text-gray-500 rounded-2xl"><X size={24}/></button>
              </div>
              <div className="flex-1 bg-gray-100 p-8 flex flex-col items-center overflow-hidden">
                <div className={`bg-white shadow-2xl transition-all duration-300 overflow-hidden flex-1 ${previewDevice === 'mobile' ? 'w-[375px] rounded-[2.5rem] border-[8px] border-gray-900 my-auto max-h-[700px]' : 'w-full max-w-[900px] h-full rounded-t-2xl border border-gray-200'}`}>
                  <iframe srcDoc={renderNewsletterHtml()} className="w-full h-full border-none bg-white" title="Preview" />
                </div>
              </div>
           </div>
        </div>
      )}

      {showIdeaPicker && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
               <h3 className="text-2xl font-black uppercase tracking-tighter">Votre Bibliothèque</h3>
               <button onClick={() => startTransition(() => setShowIdeaPicker(false))} className="p-4 hover:bg-white rounded-3xl transition-all text-gray-300"><X size={28} /></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {isLoadingPicker ? <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-primary" size={48} /></div> : availableIdeas.length > 0 ? availableIdeas.map(idea => (
                  <div key={idea.id} onClick={() => handleAddIdeaToNewsletter(idea)} className="p-4 border border-gray-100 rounded-3xl hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-6 cursor-pointer">
                     <div className="w-16 h-16 bg-gray-50 rounded-2xl overflow-hidden shrink-0">
                        {idea.image_url ? <img src={idea.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-200"><ImageIcon size={20} /></div>}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg text-gray-800 truncate">{idea.title}</h4>
                     </div>
                     <Plus size={20} className="text-gray-200" />
                  </div>
                )) : <div className="text-center py-20 text-gray-400 font-bold italic">Aucun bloc disponible.</div>}
            </div>
          </div>
        </div>
      )}

      {selectedIdea && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in duration-300">
            <div className="relative h-64 shrink-0">
              {selectedIdea.image_url ? <img src={selectedIdea.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300"><ImageIcon size={64} /></div>}
              <button onClick={() => startTransition(() => setSelectedIdea(null))} className="absolute top-6 right-6 p-3 bg-white/20 rounded-full text-white"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedIdea.content || '' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterDetail;