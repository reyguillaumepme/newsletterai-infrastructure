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
  ChevronDown,
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
  CalendarClock,
  Rocket,
  UserX,
  BarChart3,
  MousePointer2,
  Mail,
  Sparkles
} from 'lucide-react';
import AnalyticsCard from '../components/AnalyticsCard';
import { databaseService } from '../services/databaseService';
import { mailService } from '../services/mailService';
import { authService } from '../services/authService';
import { generateNewsletterHook } from '../services/geminiService';
import { Newsletter, Idea, Brand, StructuredStrategy, StrategyCTA, Contact } from '../types';
import UpgradeModal from '../components/UpgradeModal';
import AlertModal from '../components/AlertModal';
import ComplianceModal from '../components/ComplianceModal';
import IdeaEditModal from '../components/IdeaEditModal';
import { complianceService } from '../services/complianceService';
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
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // New variable to check if newsletter is sent
  const isSent = newsletter?.status === 'sent';
  // Also consider scheduled as a locked state for editing, but for stats we strictly mean SENT
  const showStats = isSent && newsletter?.brevo_campaign_id;
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [availableIdeas, setAvailableIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [showIdeaPicker, setShowIdeaPicker] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalType, setUpgradeModalType] = useState<'credits' | 'feature'>('feature');
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<string>('');

  // Alert Modal State
  const [alertState, setAlertState] = useState<{ isOpen: boolean, message: string, type: 'info' | 'error' | 'success' }>({
    isOpen: false, message: '', type: 'info'
  });

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

  // Compliance State
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceResults, setComplianceResults] = useState<any>(null);
  const [forceImmediateSend, setForceImmediateSend] = useState(false);

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

  useEffect(() => {
    const fetchStats = async () => {
      if (newsletter?.status === 'sent' && newsletter.brevo_campaign_id) {
        setIsLoadingStats(true);
        try {
          const data = await mailService.getCampaignStats(newsletter.brevo_campaign_id);
          setStats(data);
        } catch (e) {
          console.error("Failed to load stats", e);
        } finally {
          setIsLoadingStats(false);
        }
      }
    };
    fetchStats();
  }, [newsletter?.status, newsletter?.brevo_campaign_id]);

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
      setAlertState({ isOpen: true, message: 'Erreur lors de l\'envoi du test. Veuillez réessayer.', type: 'error' });
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
      setAlertState({ isOpen: true, message: 'Erreur lors du changement de marque. Veuillez réessayer.', type: 'error' });
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
    if (!newsletter || ideas.length === 0) {
      if (ideas.length === 0) setAlertState({ isOpen: true, message: "Ajoutez au moins une idée pour générer une accroche.", type: 'info' });
      return;
    }
    if (isDemo) {
      setAlertState({ isOpen: true, message: "IA inactive en démo.", type: 'info' });
      return;
    }

    setIsGeneratingHook(true);

    try {
      // 1. FRESH CREDIT CHECK
      const freshProfile = await databaseService.fetchMyProfile();
      setUserProfile(freshProfile); // Sync UI

      if ((freshProfile?.credits ?? 0) <= 0) {
        setUpgradeModalType('credits');
        setShowUpgradeModal(true);
        setIsGeneratingHook(false);
        return;
      }

      // 2. GENERATE CONTENT
      const hook = await generateNewsletterHook(newsletter?.subject || '', ideas, brand || undefined);

      // 3. DEDUCT CREDIT
      const success = await databaseService.deductUserCredit(currentUser?.id || '');
      if (success) {
        setUserProfile((prev: any) => ({ ...prev, credits: Math.max(0, (prev?.credits || 0) - 1) }));
      }

      const hookHtml = `<p>${hook}</p>`;
      startTransition(() => {
        setHookValue(hookHtml);
      });
      handleSaveNewsletter({ generated_content: hookHtml });

    } catch (error: any) {
      console.error(error);
      setAlertState({
        isOpen: true,
        message: error.message || "Erreur lors de la génération de l'accroche.",
        type: 'error'
      });
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
      setUpgradeModalType('feature');
      setUpgradeModalFeature("L'envoi et la planification");
      setShowUpgradeModal(true);
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



  const handleSubmitForCompliance = (forceImmediate: boolean = false) => {
    if (!newsletter) return;

    // 1. Run Audit with FULL content (including generated HTML)
    const fullHtml = renderNewsletterHtml();
    const effectiveFooter = footerValue || generateDefaultFooter(brand?.brand_name || 'NewsletterAI');

    // We construct a specific object for the audit that mimics the Newsletter structure
    // but with the CONTENT field containing the FULL HTML to be sent.
    const newsletterToAudit = {
      ...newsletter,
      content: fullHtml, // CRITICAL: We pass the full HTML here for Spam Analysis
      footer_content: effectiveFooter,
      show_ai_transparency: newsletter.show_ai_transparency
    };

    const results = complianceService.runAudit(newsletterToAudit, brand, ideas);
    setComplianceResults(results);
    setForceImmediateSend(forceImmediate);
    setShowPublishModal(false); // Close the publish/contacts modal
    setShowComplianceModal(true);
  };

  const handleConfirmCompliance = async () => {
    // User confirmed in modal
    await handlePublish(forceImmediateSend);
    setShowComplianceModal(false);
  };

  const handlePublish = async (forceImmediate: boolean = false) => {
    if (!newsletter) return; // Removed selection check

    // Auto-select all subscribed contacts for global send
    const allSubscribed = contacts.filter(c => c.status === 'subscribed');
    const recipientsToSend = allSubscribed;

    setIsPublishing(true);
    try {
      const result = await mailService.sendNewsletter({
        recipients: recipientsToSend,
        subject: newsletter?.subject || '',
        htmlContent: renderNewsletterHtml(),
        brandName: brand?.brand_name || 'NewsletterAI',
        brandId: newsletter.brand_id,
        scheduledAt: (newsletter.status === 'scheduled' && !forceImmediate) ? newsletter.scheduled_at : undefined
      });

      // Update newsletter status AND campaign ID
      await databaseService.updateNewsletter(newsletter.id, {
        status: 'sent',
        brevo_campaign_id: result.campaignId
      });

      setNewsletter(prev => prev ? { ...prev, status: 'sent', brevo_campaign_id: result.campaignId } : null);
      setPublishReport({ success: result.success.length, failed: result.failed.length });
      setPublishSuccess(true);

      // Log Compliance Event to DB if needed per plan
      if (brand && newsletter) {
        await databaseService.logComplianceEvent({
          brand_id: brand.id,
          newsletter_id: newsletter.id,
          sent_at: new Date().toISOString(),
          recipient_count: recipientsToSend.length,
          subject: newsletter.subject,
          compliance_snapshot: JSON.stringify(complianceResults)
        });
      }

      setTimeout(() => {
        setShowPublishModal(false);
        setPublishSuccess(false);
        setPublishReport(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error publishing newsletter:', error);
      setAlertState({ isOpen: true, message: 'Erreur lors de l\'envoi: ' + (error.message || 'Erreur inconnue'), type: 'error' });
      setPublishReport(null);
      // Close compliance modal if error occurs during send to avoid stuck state
      setShowComplianceModal(false);
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
          ${(() => {
        let footerContent = footerValue || generateDefaultFooter(brandName);
        if (newsletter.show_ai_transparency) {
          const aiMention = `<p style="margin: 0 0 10px 0; font-size: 10px; color: #cbd5e1; font-style: italic;">Contenu généré avec l'assistance d'une IA • AI Act Transparency</p>`;
          // Try to inject before copyright
          if (footerContent.match(/Tous droits réservés/i)) {
            footerContent = footerContent.replace(/(<p[^>]*>.*?Tous droits réservés.*?<\/p>)/i, `${aiMention}$1`);
          } else {
            // Fallback: append at end
            footerContent += aiMention;
          }
        }
        return footerContent;
      })()}
        </div>
      </div></body></html>`;
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="animate-spin text-primary" size={64} />
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          type={upgradeModalType}
          currentPlan={userProfile?.subscription_plan || 'free'}
          requiredFeature={upgradeModalFeature}
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

  return (
    <>

      {!isNew && (
        <div className="max-w-6xl mx-auto space-y-10 pb-10 animate-in fade-in duration-500">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <button onClick={() => startTransition(() => navigate('/newsletters'))} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ArrowLeft size={20} /></button>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={newsletter?.subject || ''}
                  onChange={e => setNewsletter(prev => prev ? { ...prev, subject: e.target.value } : null)}
                  onBlur={() => newsletter && handleSaveNewsletter({ subject: newsletter.subject })}
                  disabled={isSent}
                  className={`text-3xl font-bold tracking-tighter bg-transparent border-none outline-none w-full rounded-lg px-2 -ml-2 ${isSent ? 'cursor-not-allowed text-gray-500' : ''}`}
                />
              </div>
            </div>

            {/* STATUS BADGE - Restored to Header */}
            {newsletter && (
              <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase flex items-center gap-2 shrink-0 ${newsletter.status === 'sent' ? 'bg-green-100 text-green-700' :
                newsletter.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                {newsletter.status === 'sent' ? <CheckCircle2 size={14} /> :
                  newsletter.status === 'scheduled' ? <Clock size={14} /> :
                    <FileText size={14} />}
                {newsletter.status === 'sent' ? (
                  stats?.sentDate ? `Envoyée le ${new Date(stats.sentDate).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit' })}` : 'Envoyée'
                ) :
                  newsletter.status === 'scheduled' ? 'Planifiée' :
                    'Brouillon'}
              </div>
            )}
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
                    <div className="p-4 flex flex-col items-start justify-center [&_p]:!mb-1 [&_p]:!mt-0 [&_div]:!my-2 [&_div]:!min-h-0 [&_*]:!leading-snug text-left text-lg text-gray-600" dangerouslySetInnerHTML={{ __html: hookValue }} />
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
                    <div className="absolute right-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectIdea(idea);
                        }}
                        className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100"
                        title="Modifier cet article"
                      >
                        <Wand2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveIdea(idea.id);
                        }}
                        className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
                        title="Supprimer cet article"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
                  <button
                    onClick={() => {
                      if (!newsletter || isSent) return;
                      const newVal = !newsletter.show_ai_transparency;
                      handleSaveNewsletter({ show_ai_transparency: newVal });
                    }}
                    disabled={isSent}
                    title="Afficher une mention de transparence IA conforme à l'AI Act"
                    className={`ml-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isSent ? 'bg-gray-50 text-gray-300 border-2 border-gray-100 cursor-not-allowed' :
                      newsletter?.show_ai_transparency ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-100' : 'bg-gray-50 text-gray-400 border-2 border-gray-100'
                      }`}
                  >
                    <Sparkles size={14} /> Transparence IA: {newsletter?.show_ai_transparency ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className={`relative footer-editor flex-grow ${isSent ? 'bg-gray-50' : ''}`}>
                  {isSent ? (
                    <div className="p-4 flex flex-col items-center justify-center [&_p]:!mb-1 [&_p]:!mt-0 [&_div]:!my-2 [&_div]:!min-h-0 [&_*]:!leading-snug text-center text-sm text-gray-400" dangerouslySetInnerHTML={{ __html: footerValue }} />
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
              {/* ACTION ZONE */}
              <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">


                <h3 className="font-bold mb-6 flex items-center gap-3 text-lg"><Zap size={20} className="text-primary" /> ACTIONS</h3>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {/* PREVIEW BUTTON */}
                  <button
                    onClick={() => startTransition(() => setShowPreviewModal(true))}
                    className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${isSent ? 'bg-primary text-gray-950 border-primary shadow-lg shadow-primary/20 hover:scale-105' : 'bg-gray-50 text-gray-900 border-gray-100 hover:bg-gray-100 hover:border-gray-200'}`}
                  >
                    <Eye size={16} /> Aperçu
                  </button>

                  {/* SCHEDULE BUTTON */}
                  <button
                    onClick={() => {
                      if (userProfile?.subscription_plan === 'free') {
                        setUpgradeModalType('feature');
                        setUpgradeModalFeature("La planification");
                        setShowUpgradeModal(true);
                        return;
                      }
                      startTransition(() => setShowScheduleModal(true))
                    }}
                    disabled={isSent}
                    className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-transparent ${isSent ? 'bg-gray-50 text-gray-400 cursor-not-allowed' :
                      newsletter?.status === 'scheduled'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-200'
                      }`}
                    title="Planifier l'envoi"
                  >
                    <Calendar size={16} />
                    {newsletter?.status === 'scheduled' && newsletter.scheduled_at
                      ? new Date(newsletter.scheduled_at).toLocaleDateString()
                      : 'Planifier'
                    }
                  </button>

                  {/* SEND/PUBLISH BUTTON */}
                  <div className="relative group col-span-2">
                    <button
                      onClick={handleOpenPublishModal}
                      disabled={newsletter?.status === 'sent'}
                      className={`w-full h-10 px-6 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all shadow-lg ${newsletter?.status === 'sent'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                        : validationErrors.length > 0
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : 'bg-primary text-gray-950 hover:scale-105 shadow-primary/20'
                        }`}
                    >
                      <Rocket size={16} />
                      Envoyer
                    </button>
                    {validationErrors.length > 0 && !isSent && (
                      <div className="absolute right-0 bottom-full mb-2 w-64 bg-white border-2 border-orange-200 rounded-2xl p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
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

                <div className="h-px bg-gray-50 mb-6" />

                {/* BRAND SELECTOR */}
                {newsletter && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Changer de Marque
                    </label>
                    <div className="relative group">
                      <div className={`h-10 px-4 bg-gray-50 border border-gray-100 text-gray-600 rounded-xl text-xs font-bold flex items-center justify-between transition-all overflow-hidden ${isSent ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <Briefcase size={16} />
                          <span className="truncate max-w-[150px]">{brands.find(b => b.id === newsletter.brand_id)?.brand_name || 'Sélectionner'}</span>
                        </div>
                        <ChevronDown size={14} className="text-gray-400" />
                        <select
                          value={newsletter.brand_id}
                          onChange={(e) => handleBrandChange(e.target.value)}
                          disabled={newsletter.status === 'sent' || isSaving}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
                          title="Changer de Marque"
                        >
                          {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {brand.brand_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
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
        </div >
      )}


      {
        showPreviewModal && (
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
        )
      }

      {
        showIdeaPicker && (
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
        )
      }

      {selectedIdea && (
        <IdeaEditModal
          idea={selectedIdea}
          brands={brands}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          onSave={async (updatedIdea) => {
            await loadData();
            setSelectedIdea(null);
          }}
          onClose={() => setSelectedIdea(null)}
        />
      )}

      {
        showComplianceModal && (
          <ComplianceModal
            isOpen={showComplianceModal}
            onClose={() => setShowComplianceModal(false)}
            onConfirm={handleConfirmCompliance}
            results={complianceResults}
            isSending={isPublishing}
          />
        )
      }

      {
        showPublishModal && (
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
                {/* Audience Summary (No Selection needed) */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-6">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <Users size={48} className="text-primary" />
                  </div>

                  <div className="text-center space-y-2">
                    <h4 className="text-xl font-bold text-gray-900">
                      Diffusion à l'audience de la marque
                    </h4>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Cette newsletter sera envoyée à l'ensemble des abonnés de la liste <span className="font-bold text-gray-700">{brand?.brand_name}</span>.
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex items-center gap-4 min-w-[300px]">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                      <Users size={24} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Abonnés Actifs</p>
                      <p className="text-2xl font-black text-gray-900">
                        {contacts.filter(c => c.status === 'subscribed').length} contact{contacts.filter(c => c.status === 'subscribed').length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-center text-gray-400 max-w-xs">
                    La liste des contacts est gérée automatiquement via l'espace "Audience" de la marque.
                  </p>
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
                    <div className="flex-1 group relative">
                      <button
                        onClick={() => handleSubmitForCompliance(true)}
                        disabled={isPublishing || publishSuccess || newsletter?.status === 'scheduled'}
                        className="w-full px-6 py-3 bg-primary text-gray-950 rounded-2xl font-black uppercase hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            Envoi en cours...
                          </>
                        ) : newsletter?.status === 'scheduled' ? (
                          <>
                            <CalendarClock size={18} />
                            Déjà Planifiée
                          </>
                        ) : (
                          <>
                            <SendHorizontal size={18} />
                            Envoyer Maintenant
                          </>
                        )}
                      </button>
                      {newsletter?.status === 'scheduled' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black/80 text-white text-xs rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-center pointer-events-none">
                          Cette newsletter est programmée. Annulez la planification pour l'envoyer maintenant.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }


      {/* Brand Selection Modal for New Newsletter */}
      {
        showCreationModal && (
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
        )
      }

      {/* Send Test Email Modal */}
      {
        showScheduleModal && (
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
        )
      }

      {/* Send Test Email Modal */}
      {
        showSendTestModal && (
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
        )
      }

      {
        showUpgradeModal && (
          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            type={upgradeModalType}
            currentPlan={userProfile?.subscription_plan || 'free'}
            requiredFeature={upgradeModalFeature}
          />
        )
      }
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        message={alertState.message}
        type={alertState.type}
      />
    </>
  );
};

export default NewsletterDetail;