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
import { authService } from '../services/authService';
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
  const isDemo = false;

  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null); // New State for Profile

  // New variable to check if newsletter is sent
  const isSent = newsletter?.status === 'sent';
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
  const [publishReport, setPublishReport] = useState<{ success: number, failed: number } | null>(null);

  // Contact management for publish
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [displayedContactsCount, setDisplayedContactsCount] = useState(10);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isGeneratingHook, setIsGeneratingHook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState(currentUser?.email || '');
  const [testEmailSent, setTestEmailSent] = useState(false);

  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [scheduleData, setScheduleData] = useState({ date: '', time: '' });
  const [newNlData, setNewNlData] = useState({ subject: '', brand_id: '' });
  const [showCreationModal, setShowCreationModal] = useState(isNew);
  const [hookHtmlMode, setHookHtmlMode] = useState(false);
  const [hookValue, setHookValue] = useState('');
  const [footerValue, setFooterValue] = useState('');
  const [footerHtmlMode, setFooterHtmlMode] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      // Fetch Profile for restrictions
      const pData = await databaseService.fetchMyProfile();
      setUserProfile(pData || { subscription_plan: 'free', credits: 5 }); // Fallback defaults

      // Charger les marques pour tous les cas (pas seulement isNew)
      const bData = await databaseService.fetchBrands();
      setBrands(bData || []);

      if (isNew) {
        // Nouvelle newsletter - les marques sont déjà chargées
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
              } else if (bData?.footer_template) {
                // Utiliser le template de la marque si disponible
                setFooterValue(bData.footer_template);
              } else if (bData) {
                // Sinon générer un footer par défaut
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
    if (isNew) {
      setShowCreationModal(true);
    }
  }, [isNew]);

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

  const handleCancelCreation = () => {
    setShowCreationModal(false);
    navigate('/newsletters');
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !newsletter || !brand) return;

    setIsSendingTest(true);
    try {
      await mailService.sendTestEmail({
        to: testEmail,
        subject: newsletter.subject,
        htmlContent: renderNewsletterHtml(),
        brandName: brand.brand_name,
        brandId: newsletter.brand_id
      });

      setTestEmailSent(true);
      setTimeout(() => {
        setShowSendTestModal(false);
        setTestEmailSent(false);
        setTestEmail('');
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du test:', error);
      alert('Erreur lors de l\'envoi du test. Veuillez réessayer.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleBrandChange = async (newBrandId: string) => {
    if (!newsletter || !id) return;

    // Bloquer le changement si newsletter déjà envoyée
    if (newsletter.status === 'sent') {
      return;
    }

    setIsSaving(true);
    try {
      // Récupérer les infos de la nouvelle marque
      const newBrand = await databaseService.fetchBrandById(newBrandId);

      // Mettre à jour la newsletter dans la base de données
      await databaseService.updateNewsletter(id, { brand_id: newBrandId });

      // Mettre à jour l'état local
      startTransition(() => {
        setNewsletter({ ...newsletter, brand_id: newBrandId });
        setBrand(newBrand);

        // Mettre à jour le footer avec le template de la nouvelle marque
        if (newBrand?.footer_template) {
          setFooterValue(newBrand.footer_template);
        } else if (newBrand) {
          setFooterValue(generateDefaultFooter(newBrand.brand_name));
        }
      });

      // Recharger les contacts disponibles pour la nouvelle marque si le modal est ouvert
      if (showPublishModal) {
        const newContacts = await databaseService.fetchContacts(newBrandId);
        setContacts(newContacts || []);
        setSelectedContacts([]);
      }
    } catch (error) {
      console.error('Erreur lors du changement de marque:', error);
      alert('Erreur lors du changement de marque. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  };

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
      setShowCreationModal(false);
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

    // CREDIT CHECK
    const currentCredits = userProfile?.credits ?? 0;
    if (currentCredits <= 0) {
      alert("⚠️ Crédits insuffisants !\n\nVous avez utilisé tous vos crédits IA. Passez à la version Pro pour recharger.");
      return;
    }

    setIsGeneratingHook(true);
    try {
      const hook = await generateNewsletterHook(newsletter?.subject || '', ideas, brand || undefined);

      // DEDUCT CREDIT
      const success = await databaseService.deductUserCredit(currentUser?.id || '');
      if (success) {
        setUserProfile((prev: any) => ({ ...prev, credits: Math.max(0, (prev?.credits || 0) - 1) }));
      }

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
    // Enforce maximum of 5 articles (handled by disabled button now)
    if (ideas.length >= 5) {
      return;
    }
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const reorderedIdeas = [...ideas];
    const [draggedItem] = reorderedIdeas.splice(draggedIndex, 1);
    reorderedIdeas.splice(dropIndex, 0, draggedItem);

    // Update order_index for all ideas
    const updatedIdeas = reorderedIdeas.map((idea, idx) => ({
      ...idea,
      order_index: idx
    }));

    startTransition(() => {
      setIdeas(updatedIdeas);
      setDraggedIndex(null);
      setOrderSaved(false);
    });

    // Save to database
    try {
      await Promise.all(
        updatedIdeas.map(idea =>
          databaseService.updateIdea(idea.id, { order_index: idea.order_index })
        )
      );
      setOrderSaved(true);
      setTimeout(() => setOrderSaved(false), 2000);
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const handleRemoveIdea = async (ideaId: string) => {
    const updatedIdeas = ideas
      .filter(i => i.id !== ideaId)
      .map((idea, idx) => ({ ...idea, order_index: idx }));

    startTransition(() => {
      setIdeas(updatedIdeas);
      setOrderSaved(false);
    });

    // Update database
    await databaseService.updateIdea(ideaId, { newsletter_id: null, order_index: 0 });
    await Promise.all(
      updatedIdeas.map(idea =>
        databaseService.updateIdea(idea.id, { order_index: idea.order_index })
      )
    );
  };

  const handleSelectIdea = (idea: Idea) => {
    startTransition(() => {
      setSelectedIdea(idea);
    });
  };

  const validateNewsletter = (): string[] => {
    const errors: string[] = [];

    if (!newsletter?.subject || newsletter.subject.trim() === '') {
      errors.push('Le sujet de la newsletter est requis');
    }

    if (!hookValue || hookValue.trim() === '' || hookValue === '<p><br></p>') {
      errors.push('Le texte d\'accroche est requis');
    }

    if (ideas.length === 0) {
      errors.push('Au moins un article est requis');
    }

    if (!footerValue || footerValue.trim() === '') {
      errors.push('Le footer est requis');
    }

    return errors;
  };

  const loadContacts = async () => {
    if (!newsletter?.brand_id) return;

    setIsLoadingContacts(true);
    try {
      const allContacts = await databaseService.fetchContacts(newsletter.brand_id);
      setContacts(allContacts);

      // Auto-select subscribed contacts
      const subscribed = allContacts.filter(c => c.status === 'subscribed');
      setSelectedContacts(subscribed);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleOpenPublishModal = () => {
    // PLAN CHECK
    if (userProfile?.subscription_plan === 'free') {
      alert("🔒 Fonctionnalité Premium\n\nL'envoi réel de newsletters est réservé aux membres Pro et Elite.\n\nEn version gratuite, vous pouvez uniquement envoyer des emails de test.");
      return;
    }

    const errors = validateNewsletter();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return; // Don't open modal if validation fails
    }

    setShowPublishModal(true);
    loadContacts();
  };

  const handleToggleContactSelection = (contact: Contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c.id === contact.id);
      if (isSelected) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleToggleContactStatus = async (contactId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'subscribed' ? 'unsubscribed' : 'subscribed';

    try {
      await databaseService.updateContact(contactId, { status: newStatus });

      // Update local state
      setContacts(prev => prev.map(c =>
        c.id === contactId ? { ...c, status: newStatus as any } : c
      ));

      // If changing to unsubscribed, remove from selected
      if (newStatus === 'unsubscribed') {
        setSelectedContacts(prev => prev.filter(c => c.id !== contactId));
      }
    } catch (error) {
      console.error('Error updating contact status:', error);
    }
  };

  const handlePublish = async () => {
    if (!newsletter || selectedContacts.length === 0) return;

    setIsPublishing(true);
    try {
      const result = await mailService.sendNewsletter({
        recipients: selectedContacts,
        subject: newsletter?.subject || '',
        htmlContent: renderNewsletterHtml(),
        brandName: brand?.brand_name || 'NewsletterAI',
        brandId: newsletter.brand_id
      });

      // Update newsletter status
      await databaseService.updateNewsletter(newsletter.id, {
        status: 'sent'
      });

      setNewsletter(prev => prev ? { ...prev, status: 'sent' } : null);
      setPublishReport({ success: result.success.length, failed: result.failed.length });
      setPublishSuccess(true);

      setTimeout(() => {
        setShowPublishModal(false);
        setPublishSuccess(false);
        setPublishReport(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error publishing newsletter:', error);
      alert('Erreur lors de l\'envoi: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setIsPublishing(false);
    }
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
      } catch (e) { }
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
          p { margin: 0 0 1.2em 0; line-height: 1.6; }
          .ql-align-center { text-align: center !important; }
          .ql-align-right { text-align: right !important; }
          .ql-align-justify { text-align: justify !important; }
          .content-area .ql-size-small { font-size: 13px !important; }
          .content-area .ql-size-large { font-size: 20px !important; }
          .content-area .ql-size-huge { font-size: 32px !important; line-height: 1.2 !important; font-weight: 800 !important; }
          .footer-area p { margin-bottom: 0.5em; }
        </style>
      </head>
      <body style="padding: 20px; margin:0;">
      <div style="max-width: 750px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #f1f5f9; width: 100%; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
        <div style="padding: 40px; text-align: center; border-bottom: 4px solid ${primaryColor};">
          ${brandLogo ? `<img src="${brandLogo}" height="60" style="margin-bottom: 25px;" alt="${brandName}" />` : ''}
          <h1 style="margin: 0; font-size: 28px; color: #0f172a; font-weight: 800;">${newsletter?.subject || 'Newsletter'}</h1>
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
        <div class="footer-area" style="padding: 60px 40px; text-align: center; background-color: #ffffff; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 15px;">
          ${newsletter.show_footer_logo && brandLogo ? `
            <div style="margin-bottom: 30px; opacity: 0.8;">
              <img src="${brandLogo}" height="35" alt="${brandName}" style="filter: grayscale(100%);" />
            </div>
          ` : ''}
          ${footerValue || generateDefaultFooter(brandName)}
        </div>
      </div></body></html>`;
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="animate-spin text-primary" size={64} />
    </div>
  );

  return (
    <>
      {!isNew && (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <button onClick={() => startTransition(() => navigate('/newsletters'))} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ArrowLeft size={20} /></button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4">
                  {/* TITLE INPUT */}
                  <input
                    type="text"
                    value={newsletter?.subject || ''}
                    onChange={e => setNewsletter(prev => prev ? { ...prev, subject: e.target.value } : null)}
                    onBlur={() => newsletter && handleSaveNewsletter({ subject: newsletter.subject })}
                    disabled={isSent}
                    className={`text-3xl font-bold tracking-tighter bg-transparent border-none outline-none w-full rounded-lg px-2 -ml-2 ${isSent ? 'cursor-not-allowed text-gray-500' : ''}`}
                  />

                  {/* SCHEDULE ACTION - RESTORED */}
                  <button
                    onClick={() => {
                      if (userProfile?.subscription_plan === 'free') {
                        alert("🔒 Fonctionnalité Premium\n\nLa planification est réservée aux membres Pro et Elite.");
                        return;
                      }
                      startTransition(() => setShowScheduleModal(true))
                    }}
                    disabled={isSent}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isSent ? 'bg-gray-50 text-gray-400 cursor-not-allowed' :
                      newsletter?.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    title={newsletter?.status === 'scheduled' ? 'Modifier la planification' : 'Planifier l\'envoi'}
                  >
                    <Calendar size={16} />
                    {newsletter?.status === 'scheduled' && newsletter.scheduled_at
                      ? new Date(newsletter.scheduled_at).toLocaleDateString()
                      : 'Planifier'
                    }
                  </button>
                </div>
              </div>

              {/* Brand Selector */}
              {newsletter && (
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-2xl border-2 border-gray-100">
                  <Briefcase size={18} className="text-gray-400" />
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Marque
                    </label>
                    <select
                      value={newsletter.brand_id}
                      onChange={(e) => handleBrandChange(e.target.value)}
                      disabled={newsletter.status === 'sent' || isSaving}
                      className="bg-transparent border-none outline-none text-sm font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 pr-2"
                    >
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.brand_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {newsletter && (
                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase flex items-center gap-2 ${newsletter.status === 'sent' ? 'bg-green-100 text-green-700' :
                  newsletter.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                  {newsletter.status === 'sent' ? <CheckCircle2 size={14} /> :
                    newsletter.status === 'scheduled' ? <Clock size={14} /> :
                      <FileText size={14} />}
                  {newsletter.status === 'sent' ? 'Envoyée' :
                    newsletter.status === 'scheduled' ? 'Planifiée' :
                      'Brouillon'}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => startTransition(() => setShowPreviewModal(true))} className="px-5 py-2.5 bg-gray-950 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-gray-200"><Eye size={18} /> Aperçu Final</button>
              <div className="relative group">
                <button
                  onClick={handleOpenPublishModal}
                  disabled={newsletter?.status === 'sent'}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg ${newsletter?.status === 'sent'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : validationErrors.length > 0
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-primary text-gray-950 hover:scale-105 shadow-primary/20'
                    }`}
                >
                  <Rocket size={18} />
                  {newsletter?.status === 'sent' ? 'Envoyée' : 'Publier'}
                </button>
                {validationErrors.length > 0 && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-orange-200 rounded-2xl p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <p className="text-xs font-bold text-orange-900 mb-2">⚠️ Validation requise :</p>
                    <ul className="text-xs text-orange-700 space-y-1">
                      {validationErrors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
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
                  <button onClick={handleGenerateHook} disabled={isGeneratingHook || ideas.length === 0 || isSent} className={`px-5 py-2.5 bg-gray-950 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-gray-200 ${isSent ? 'opacity-50 cursor-not-allowed' : ''}`}>{isGeneratingHook ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} fill="currentColor" />} Générer par IA</button>
                </div>
                <div className={`relative hook-editor flex-grow ${isSent ? 'bg-gray-50' : ''}`}>
                  {isSent ? (
                    <div className="p-4 ql-editor" dangerouslySetInnerHTML={{ __html: hookValue }} />
                  ) : (
                    <ReactQuill theme="snow" value={hookValue} onChange={setHookValue} onBlur={() => handleSaveNewsletter({ generated_content: hookValue })} modules={QUILL_MODULES} />
                  )}
                </div>
              </div>

              <div className="space-y-4 relative">
                {orderSaved && (
                  <div className="fixed top-8 right-8 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-300 font-bold text-sm flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    Ordre sauvegardé !
                  </div>
                )}
                {ideas.map((idea, index) => (
                  <div
                    key={idea.id}
                    draggable={!isSent}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => handleSelectIdea(idea)}
                    className={`bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm transition-all flex gap-5 relative group ${draggedIndex === index ? 'opacity-50' : ''
                      } ${!isSent ? 'hover:shadow-lg cursor-move' : ''}`}
                  >
                    {!isSent && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical size={20} />
                      </div>
                    )}
                    {!isSent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveIdea(idea.id);
                        }}
                        className="absolute right-3 top-3 p-2 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 z-10"
                        title="Supprimer cet article"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className={`w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-gray-50 ${isSent ? '' : 'ml-6'}`}>
                      {idea.image_url ? <img src={idea.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-200"><ImageIcon size={28} /></div>}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                      <h4 className="font-bold text-base truncate tracking-tight mb-1">{idea.title}</h4>
                      <div className="text-gray-400 text-[11px] line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: idea.content || '' }} />
                    </div>
                  </div>
                ))}
                {!isSent && (
                  <button
                    onClick={() => startTransition(() => setShowIdeaPicker(true))}
                    disabled={ideas.length >= 5}
                    className={`w-full py-8 border-3 border-dashed rounded-[2.5rem] transition-all flex flex-col items-center gap-3 ${ideas.length >= 5
                      ? 'border-gray-50 text-gray-200 cursor-not-allowed bg-gray-50/50'
                      : 'border-gray-100 text-gray-300 hover:border-primary/20 hover:text-primary'
                      }`}
                  >
                    <Plus size={22} />
                    <span className="font-black text-[9px] uppercase tracking-widest">
                      {ideas.length >= 5 ? 'Maximum 5 blocs atteint' : 'Ajouter un bloc'}
                    </span>
                  </button>
                )}
              </div>

              {/* Bloc d'édition du footer */}
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
                <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-50 bg-white">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black uppercase">Footer Newsletter</h3>
                  </div>
                  <button
                    onClick={() => {
                      if (!newsletter || isSent) return;
                      const newVal = !newsletter.show_footer_logo;
                      handleSaveNewsletter({ show_footer_logo: newVal });
                    }}
                    disabled={isSent}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isSent ? 'bg-gray-50 text-gray-300 border-2 border-gray-100 cursor-not-allowed' :
                      newsletter?.show_footer_logo ? 'bg-primary/20 text-primary border-2 border-primary/20' : 'bg-gray-50 text-gray-400 border-2 border-gray-100'
                      }`}
                  >
                    <ImageIcon size={14} /> Logo Footer: {newsletter?.show_footer_logo ? 'Activé' : 'Désactivé'}
                  </button>
                </div>
                <div className={`relative footer-editor flex-grow ${isSent ? 'bg-gray-50' : ''}`}>
                  {isSent ? (
                    <div className="p-4 ql-editor" dangerouslySetInnerHTML={{ __html: footerValue }} />
                  ) : (
                    <ReactQuill
                      theme="snow"
                      value={footerValue}
                      onChange={setFooterValue}
                      onBlur={() => handleSaveNewsletter({ footer_content: footerValue })}
                      modules={QUILL_MODULES}
                    />
                  )}
                </div>
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
                  <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-50 mt-2"><Copyright size={12} className="text-primary" /><span className="text-[11px] font-bold text-gray-400">Footer</span></div>
                </div>
              </div>
            </div>
          </div>

          {showPreviewModal && (
            <div className="fixed inset-0 bg-gray-950/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4 overflow-hidden">
              <div className="bg-white w-full max-w-[1400px] h-[95vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-500">
                <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-white z-10 sticky top-0">
                  <div className="flex items-center gap-8">
                    <h3 className="font-black text-xl uppercase tracking-tighter">Aperçu Rapide</h3>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button onClick={() => setPreviewDevice('desktop')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase transition-all ${previewDevice === 'desktop' ? 'bg-white shadow-sm text-gray-950' : 'text-gray-400'}`}><Monitor size={14} /> Desktop</button>
                      <button onClick={() => setPreviewDevice('mobile')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase transition-all ${previewDevice === 'mobile' ? 'bg-white shadow-sm text-gray-950' : 'text-gray-400'}`}><Smartphone size={14} /> Mobile</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setShowPreviewModal(false);
                        setShowSendTestModal(true);
                      }}
                      className="px-6 py-3 bg-primary text-gray-950 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/20"
                    >
                      <SendHorizontal size={16} /> Envoyer un test
                    </button>
                    <button onClick={() => startTransition(() => setShowPreviewModal(false))} className="p-3 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-all"><X size={24} /></button>
                  </div>
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

          {showPublishModal && (
            <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[400] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <Rocket size={28} className="text-primary" />
                      Publier la Newsletter
                    </h3>
                    <button
                      onClick={() => {
                        setShowPublishModal(false);
                        setSearchQuery('');
                        setDisplayedContactsCount(10);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} sélectionné{selectedContacts.length > 1 ? 's' : ''} / {contacts.filter(c => c.status === 'subscribed').length} abonné{contacts.filter(c => c.status === 'subscribed').length > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Search Bar */}
                <div className="p-6 border-b border-gray-50">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher par email, prénom, nom..."
                      className="w-full px-4 py-3 pl-10 border-2 border-gray-100 rounded-2xl focus:border-primary focus:outline-none transition-all"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Users size={18} />
                    </div>
                  </div>
                </div>

                {/* Contact List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-2">
                  {isLoadingContacts ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="animate-spin text-primary" size={48} />
                      <p className="text-sm text-gray-500">Chargement des contacts...</p>
                    </div>
                  ) : (() => {
                    const filteredContacts = contacts.filter(contact => {
                      const query = searchQuery.toLowerCase();
                      return (
                        contact.email.toLowerCase().includes(query) ||
                        contact.first_name?.toLowerCase().includes(query) ||
                        contact.last_name?.toLowerCase().includes(query)
                      );
                    });
                    const displayedContacts = filteredContacts.slice(0, displayedContactsCount);

                    return displayedContacts.length > 0 ? (
                      <>
                        {displayedContacts.map(contact => {
                          const isSelected = selectedContacts.some(c => c.id === contact.id);
                          return (
                            <div
                              key={contact.id}
                              className="p-4 border border-gray-100 rounded-2xl hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-4"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleContactSelection(contact)}
                                disabled={contact.status !== 'subscribed'}
                                className="w-5 h-5 rounded border-2 border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{contact.email}</p>
                                {(contact.first_name || contact.last_name) && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {contact.first_name} {contact.last_name}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleToggleContactStatus(contact.id, contact.status)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${contact.status === 'subscribed'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                  }`}
                              >
                                {contact.status === 'subscribed' ? 'Abonné' : 'Désabonné'}
                              </button>
                            </div>
                          );
                        })}
                        {filteredContacts.length > displayedContactsCount && (
                          <button
                            onClick={() => setDisplayedContactsCount(prev => prev + 10)}
                            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-primary hover:text-primary transition-all text-sm font-bold"
                          >
                            Charger plus de contacts ({filteredContacts.length - displayedContactsCount} restants)
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-20">
                        <UserX size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-400 font-bold">
                          {searchQuery ? 'Aucun contact trouvé pour cette recherche' : 'Aucun contact disponible'}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-50 bg-gray-50/50">
                  {publishSuccess ? (
                    <div className="p-4 bg-green-50 border-2 border-green-100 rounded-2xl flex items-center gap-3 mb-4">
                      <CheckCircle2 className="text-green-500" size={24} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-green-900">Newsletter publiée avec succès !</p>
                        <p className="text-xs text-green-700">
                          {publishReport?.success || 0} envoyé{(publishReport?.success || 0) > 1 ? 's' : ''}, {publishReport?.failed || 0} échec{(publishReport?.failed || 0) > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowPublishModal(false);
                        setSearchQuery('');
                        setDisplayedContactsCount(10);
                      }}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                      disabled={isPublishing}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing || selectedContacts.length === 0 || publishSuccess}
                      className="flex-1 px-6 py-3 bg-primary text-gray-950 rounded-2xl font-black uppercase hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <SendHorizontal size={18} />
                          Envoyer Maintenant
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brand Selection Modal for New Newsletter */}
      {showCreationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold mb-6">Créer une Newsletter</h2>

            <form onSubmit={handleStartCreation} className="space-y-6">
              {/* Brand Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Marque *
                </label>
                <select
                  value={newNlData.brand_id}
                  onChange={(e) => setNewNlData({ ...newNlData, brand_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary focus:outline-none transition-all"
                  required
                >
                  <option value="">Sélectionnez une marque</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.brand_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Sujet de la newsletter *
                </label>
                <input
                  type="text"
                  value={newNlData.subject}
                  onChange={(e) => setNewNlData({ ...newNlData, subject: e.target.value })}
                  placeholder="Ex: Newsletter de janvier 2026"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary focus:outline-none transition-all"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelCreation}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  disabled={isSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newNlData.brand_id || !newNlData.subject}
                  className="flex-1 px-6 py-3 bg-primary text-gray-950 rounded-2xl font-black uppercase hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Créer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black uppercase tracking-tight">Planifier l'envoi</h3>
              <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Date d'envoi
                </label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Heure d'envoi
                </label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                {newsletter?.status === 'scheduled' && (
                  <button
                    onClick={() => {
                      handleSaveNewsletter({ status: 'draft', scheduled_at: undefined });
                      setShowScheduleModal(false);
                    }}
                    className="px-4 py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors"
                  >
                    Annuler la planification
                  </button>
                )}
                <button
                  onClick={() => {
                    if (scheduleData.date && scheduleData.time) {
                      const scheduledAt = new Date(`${scheduleData.date}T${scheduleData.time}`).toISOString();
                      handleSaveNewsletter({ status: 'scheduled', scheduled_at: scheduledAt });
                      setShowScheduleModal(false);
                    }
                  }}
                  disabled={!scheduleData.date || !scheduleData.time}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {showSendTestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold mb-2">Envoyer un Test</h2>
            <p className="text-gray-500 text-sm mb-6">
              Recevez un aperçu de votre newsletter par email
            </p>

            {testEmailSent ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="text-green-600" size={32} />
                </div>
                <p className="text-lg font-bold text-green-600">Test envoyé !</p>
                <p className="text-sm text-gray-500">Vérifiez votre boîte de réception</p>
              </div>
            ) : (
              <form onSubmit={handleSendTestEmail} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Adresse email *
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary focus:outline-none transition-all"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSendTestModal(false);
                      setTestEmail('');
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    disabled={isSendingTest}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingTest || !testEmail}
                    className="flex-1 px-6 py-3 bg-primary text-gray-950 rounded-2xl font-black uppercase hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSendingTest ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <SendHorizontal size={18} />
                        Envoyer
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NewsletterDetail;