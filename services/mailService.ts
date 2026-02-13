
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
    brandId?: string
  }) {
    // 1. Resolve Sender
    let senderEmail = "noreply@newsletteria.online";
    let senderName = params.brandName || "NewsletterAI";

    try {
      if (params.brandId) {
        const brand = await databaseService.fetchBrandById(params.brandId);
        if (brand) {
          if (brand.sender_email) senderEmail = brand.sender_email;
          if (brand.sender_name) senderName = brand.sender_name;
        }
      } else {
        const profile = await databaseService.fetchMyProfile();
        if (profile) {
          if (profile.sender_email) senderEmail = profile.sender_email;
          if (profile.sender_name) senderName = profile.sender_name;
        }
      }
    } catch (e) { }

    // 2. Call Secure Proxy (Edge Function)
    const { getSupabaseClient } = await import('./authService');
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase non connecté");

    // We send payload to brevo-api action='sendTestEmail'
    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: params.to }],
      subject: params.subject.startsWith('[TEST]') ? params.subject : `[TEST] ${params.subject}`,
      htmlContent: params.htmlContent
    };

    const { data, error } = await supabase.functions.invoke('brevo-api', {
      body: {
        action: 'sendTestEmail',
        body: payload
      }
    });

    if (error) {
      console.error("Erreur Edge Function Test Email:", error);
      throw new Error(error.message || "Erreur d'envoi via le proxy sécurisé");
    }

    if (data.error) throw new Error(data.error);

    return data;
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

  // --- NOUVELLES MÉTHODES DE GESTION DE LISTES (SaaS - Secure Proxy) ---

  async createBrevoFolder(name: string): Promise<number> {
    const { getSupabaseClient } = await import('./authService');
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Infrastructure Supabase déconnectée.");

    const { data, error } = await supabase.functions.invoke('brevo-api', {
      body: { action: 'createFolder', body: { name } }
    });

    if (error) throw new Error(error.message || "Erreur Edge Function Folder");
    if (data.error) throw new Error(data.error);

    return data.id;
  },

  async createBrevoList(name: string, folderId: number): Promise<number> {
    const { getSupabaseClient } = await import('./authService');
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Infrastructure Supabase déconnectée.");

    const { data, error } = await supabase.functions.invoke('brevo-api', {
      body: { action: 'createList', body: { name, folderId } }
    });

    if (error) throw new Error(error.message || "Erreur Edge Function List");
    if (data.error) throw new Error(data.error);

    return data.id;
  },

  async addContactToBrevoList(listId: number, email: string, attributes: any = {}) {
    const { getSupabaseClient } = await import('./authService');
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase.functions.invoke('brevo-api', {
      body: {
        action: 'addContact',
        body: {
          email,
          listIds: [listId],
          attributes
        }
      }
    });

    if (error) console.warn("Erreur ajout contact Brevo:", error);
    return !error;
  },

  async removeContactFromBrevoList(listId: number, emails: string[]) {
    const { getSupabaseClient } = await import('./authService');
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase.functions.invoke('brevo-api', {
      body: {
        action: 'removeContact',
        body: {
          listId,
          emails
        }
      }
    });

    if (error) console.warn("Erreur suppression contact Brevo:", error);
    return !error;
  },

  async blacklistContactInBrevo(email: string) {
    const { getSupabaseClient } = await import('./authService');
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase.functions.invoke('brevo-api', {
      body: {
        action: 'blacklist',
        body: { email }
      }
    });

    if (error) console.warn("Erreur blacklist Brevo:", error);
    return !error;
  },

  async whitelistContactInBrevo(email: string) {
    const { getSupabaseClient } = await import('./authService');
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase.functions.invoke('brevo-api', {
      body: {
        action: 'whitelist',
        body: { email }
      }
    });

    if (error) console.warn("Erreur whitelist Brevo:", error);
    return !error;
  },

  async getCampaignStats(campaignId: number) {
    const { getSupabaseClient } = await import('./authService');
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.functions.invoke('brevo-api', {
      body: {
        action: 'getCampaignStats',
        body: { campaignId }
      }
    });

    if (error) {
      console.warn("Error fetching stats (Edge Function):", error);
      return null;
    }
    if (data.error) {
      console.warn("Error fetching stats (API):", data.error);
      return null;
    }

    if (data.statistics) {
      const stats = data.statistics.globalStats;

      // Check if globalStats is empty/zero (common with Brevo API for some campaign types) and if detailed campaignStats exist
      if (stats && stats.delivered === 0 && data.statistics.campaignStats && Array.isArray(data.statistics.campaignStats)) {
        // Aggregate campaignStats
        return data.statistics.campaignStats.reduce((acc: any, curr: any) => ({
          uniqueViews: (acc.uniqueViews || 0) + (curr.uniqueViews || 0),
          uniqueClicks: (acc.uniqueClicks || 0) + (curr.uniqueClicks || 0),
          delivered: (acc.delivered || 0) + (curr.delivered || 0),
          sent: (acc.sent || 0) + (curr.sent || 0),
          complaints: (acc.complaints || 0) + (curr.complaints || 0),
          hardBounces: (acc.hardBounces || 0) + (curr.hardBounces || 0),
          softBounces: (acc.softBounces || 0) + (curr.softBounces || 0),
          unsubscriptions: (acc.unsubscriptions || 0) + (curr.unsubscriptions || 0),
        }), { uniqueViews: 0, uniqueClicks: 0, delivered: 0, sent: 0, complaints: 0, hardBounces: 0, softBounces: 0, unsubscriptions: 0 });
      }

      return stats;
    }

    console.warn("Unexpected Brevo API response structure:", data);
    return null;
  },

  async getBrandStats(brandId: string) {
    try {
      const newsletters = await databaseService.fetchNewsletters();
      const brandNewsletters = newsletters.filter(
        n => n.brand_id === brandId && n.status === 'sent' && n.brevo_campaign_id
      );

      if (brandNewsletters.length === 0) {
        return { campaignsCount: 0, totalSent: 0, globalOpenRate: 0, globalClickRate: 0 };
      }

      // Parallel fetch for all campaigns
      const statsPromises = brandNewsletters.map(n =>
        this.getCampaignStats(n.brevo_campaign_id!).catch(() => null)
      );

      const results = await Promise.all(statsPromises);
      const validStats = results.filter(s => s !== null);

      let totalSent = 0;
      let totalOpens = 0;
      let totalClicks = 0;

      validStats.forEach(stat => {
        // Brevo stats structure: { delivered, uniqueViews, uniqueClicks, ... }
        // "sent" in Brevo usually means attempted, "delivered" is better for rates? 
        // Let's use 'delivered' for rates calculation to be fair, or 'uniqueViews' / 'delivered'.
        // Standard is Open Rate = Unique Opens / Delivered.
        // CTR = Unique Clicks / Delivered.

        const sentCount = stat.delivered || 0;
        const openCount = stat.uniqueViews || 0;
        const clickCount = stat.uniqueClicks || 0;

        totalSent += sentCount;
        totalOpens += openCount;
        totalClicks += clickCount;
      });

      const globalOpenRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
      const globalClickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0;

      return {
        campaignsCount: validStats.length,
        totalSent,
        globalOpenRate: parseFloat(globalOpenRate.toFixed(2)),
        globalClickRate: parseFloat(globalClickRate.toFixed(2))
      };

    } catch (e) {
      console.error("Error calculating brand stats:", e);
      return { campaignsCount: 0, totalSent: 0, globalOpenRate: 0, globalClickRate: 0 };
    }
  }
};
