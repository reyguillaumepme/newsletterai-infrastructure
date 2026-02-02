
import { databaseService } from './databaseService';
import { Contact } from '../types';

const BREVO_API_URL = 'https://api.brevo.com/v3';

// Helper interne pour récupérer les headers
const getBrevoHeaders = async () => {
  let brevoKey = "";
  try {
    const profile = await databaseService.fetchMyProfile();
    brevoKey = profile?.brevo_api_key || localStorage.getItem('MASTER_BREVO_KEY') || "";
  } catch (e) {
    brevoKey = localStorage.getItem('MASTER_BREVO_KEY') || "";
  }

  if (!brevoKey) throw new Error("Clé API Brevo manquante");

  return {
    'api-key': brevoKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

export const mailService = {
  async sendTestEmail(params: {
    to: string,
    subject: string,
    htmlContent: string,
    brandName: string,
    brandId?: string // Paramètre optionnel
  }) {
    // 1. Initialisation par défaut
    let brevoKey = "";
    let senderEmail = "noreply@newsletteria.online";
    let senderName = params.brandName || "NewsletterAI";

    try {
      // 2. Priorité 1 : Configuration de la Marque spécifique si brandId est fourni
      if (params.brandId) {
        const brand = await databaseService.fetchBrandById(params.brandId);
        if (brand) {
          if (brand.sender_email) senderEmail = brand.sender_email;
          if (brand.sender_name) senderName = brand.sender_name;
        }
      }

      // 3. Priorité 2 (Fallback) : Configuration globale du Profil
      const profile = await databaseService.fetchMyProfile();
      if (profile) {
        if (profile.brevo_api_key) {
          brevoKey = profile.brevo_api_key;
          localStorage.setItem('MASTER_BREVO_KEY', brevoKey);
        }
        // Si la marque n'a pas écrasé l'email/nom, on utilise celui du profil
        if (!params.brandId || (params.brandId && !senderEmail)) {
          if (profile.sender_email) senderEmail = profile.sender_email;
          if (profile.sender_name) senderName = profile.sender_name;
        }
      }
    } catch (e) {
      console.warn("Impossible de récupérer la configuration complète d'envoi.");
    }

    // 4. Repli sur le cache local pour la clé si besoin
    if (!brevoKey) {
      brevoKey = localStorage.getItem('MASTER_BREVO_KEY') || "";
    }

    if (!brevoKey || brevoKey.trim() === "") {
      throw new Error("Clé API Brevo manquante. Veuillez la configurer dans vos paramètres.");
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey.trim(),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail
          },
          to: [{ email: params.to }],
          subject: params.subject.startsWith('[TEST]') ? params.subject : params.subject,
          htmlContent: params.htmlContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erreur HTTP ${response.status}` }));

        if (errorData.code === 'unauthorized' || response.status === 401) {
          throw new Error("Clé API Brevo invalide ou expirée.");
        }

        if (errorData.message?.includes('sender') || errorData.code === 'invalid_parameter') {
          throw new Error(`L'expéditeur '${senderEmail}' n'est pas autorisé dans votre compte Brevo. Vérifiez vos 'Senders' sur Brevo.`);
        }

        throw new Error(errorData.message || `Erreur Brevo (${response.status})`);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        throw new Error("Impossible de contacter Brevo (CORS ou Réseau).");
      }
      throw err;
    }
  },

  async sendNewsletter(params: {
    recipients: Contact[],
    subject: string,
    htmlContent: string,
    brandName: string,
    brandId: string,
    scheduledAt?: string
  }) {
    // 1. Resolve Sender Identity (reuse logic from sendTestEmail essentially)
    let senderEmail = "noreply@newsletteria.online";
    let senderName = params.brandName || "NewsletterAI";
    let brevoListId = null;

    try {
      // Configuration de la Marque
      if (params.brandId) {
        const brand = await databaseService.fetchBrandById(params.brandId);
        if (brand) {
          if (brand.sender_email) senderEmail = brand.sender_email;
          if (brand.sender_name) senderName = brand.sender_name;
          if (brand.brevo_list_id) brevoListId = brand.brevo_list_id;
        }
      }

      // Fallback Profile
      if (!senderEmail || senderEmail.includes('noreply')) {
        const profile = await databaseService.fetchMyProfile();
        if (profile) {
          if (profile.sender_email) senderEmail = profile.sender_email;
          if (profile.sender_name) senderName = profile.sender_name;
        }
      }
    } catch (e) {
      console.warn("Sender resolution failed, using defaults");
    }

    // 2. Call Edge Function
    const { getSupabaseClient } = await import('./authService'); // Dynamic import to avoid circular dep
    const supabase = getSupabaseClient();

    // Resolve Brevo Key (Profile or LocalStorage fallback)
    let fallbackKey = "";
    try {
      const profile = await databaseService.fetchMyProfile();
      fallbackKey = profile?.brevo_api_key || localStorage.getItem('MASTER_BREVO_KEY') || "";
    } catch (e) { }

    // DEBUG AUTH
    const debugSession = await supabase?.auth.getSession();
    console.log("DEBUG SEND CAMPAIGN:", {
      hasClient: !!supabase,
      hasToken: !!debugSession?.data.session?.access_token,
      tokenStart: debugSession?.data.session?.access_token?.substring(0, 10),
      hasFallbackKey: !!fallbackKey
    });

    // Prepare recipients list (emails only or objects)
    // Edge function expects array of strings or {email, name}
    const recipientEmails = params.recipients.map(c => c.email);

    // STRATEGY: White Label Sending
    // We send from the specific sender configured for the brand/user.
    // IMPORTANT: This email MUST be verified in the Brevo account associated with the API Key.
    // If using a Master Key, this should be a generic verified address (e.g. contact@my-app.com).
    const platformSenderEmail = "nwsletteria@gmail.com";

    const userReplyToEmail = senderEmail; // Replies go to the same person

    const { data, error } = await supabase.functions.invoke('send-campaign', {
      body: {
        subject: params.subject,
        htmlContent: params.htmlContent,
        brandId: params.brandId,
        brandName: params.brandName,
        sender: { name: senderName, email: platformSenderEmail },
        replyTo: userReplyToEmail,
        recipients: recipientEmails,
        scheduledAt: params.scheduledAt,
        apiKey: fallbackKey,
        brevoListId: brevoListId
      }
    });

    if (error) {
      console.error('Edge Function Error:', error);
      throw new Error(error.message || "Erreur lors de la création de la campagne Brevo");
    }

    // Handle application-level errors (returned as 200 OK)
    if (data && (data.error || data.success === false)) {
      console.error('Campaign Logic Error:', data.error);
      throw new Error(data.error || "Erreur logique lors de l'envoi de la campagne via Brevo");
    }

    // Return fake result to match expected interface or updated one?
    // NewsletterDetail expects { success: [], failed: [] } for reporting.
    // Since it's a campaign, it's all or nothing usually securely.
    // We'll return all as success if no error.
    // Save the list ID if it was newly created
    if (data.listId && params.brandId) {
      // Ideally we check if it's different, but update is cheap
      await supabase.from('brands').update({ brevo_list_id: data.listId }).eq('id', params.brandId);
    }

    return {
      success: recipientEmails,
      failed: [],
      campaignId: data.campaignId,
      status: data.status
    };
  },

  // --- NOUVELLES MÉTHODES DE GESTION DE LISTES ---

  async createBrevoFolder(name: string): Promise<number> {
    const headers = await getBrevoHeaders();

    // 1. Chercher si le dossier existe déjà
    try {
      const res = await fetch(`${BREVO_API_URL}/contacts/folders?limit=50&offset=0`, { headers });
      if (res.ok) {
        const data = await res.json();
        const existing = data.folders?.find((f: any) => f.name === name);
        if (existing) return existing.id;
      }
    } catch (e) {
      console.warn("Erreur lecture dossiers Brevo", e);
    }

    // 2. Créer le dossier
    const res = await fetch(`${BREVO_API_URL}/contacts/folders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name })
    });

    if (!res.ok) throw new Error(`Erreur création dossier Brevo: ${res.status}`);
    const data = await res.json();
    return data.id;
  },

  async createBrevoList(name: string, folderId: number): Promise<number> {
    const headers = await getBrevoHeaders();

    const res = await fetch(`${BREVO_API_URL}/contacts/lists`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, folderId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `Erreur création liste Brevo: ${res.status}`);
    }

    const data = await res.json();
    return data.id;
  },

  async addContactToBrevoList(listId: number, email: string, attributes: any = {}) {
    const headers = await getBrevoHeaders();

    // On utilise l'endpoint de création/update (DOI = false par défaut)
    const res = await fetch(`${BREVO_API_URL}/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true, // Mettre à jour si existe
        attributes
      })
    });

    if (!res.ok) {
      // Ignorer si le contact existe déjà (cas updateEnabled=false, mais ici true donc devrait passer)
      // Parfois Brevo renvoie une erreur si le contact est blacklisté, etc.
      const errorData = await res.json();
      console.warn("Brevo Add Contact Warning:", errorData);
      // On ne throw pas forcément pour ne pas bloquer l'UI, sauf erreur critique
    }
    return true;
  },

  async removeContactFromBrevoList(listId: number, emails: string[]) {
    const headers = await getBrevoHeaders();

    const res = await fetch(`${BREVO_API_URL}/contacts/lists/${listId}/contacts/remove`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ emails })
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.warn("Brevo Remove Contact Warning:", errorData);
    }
    return true;
  }
};
