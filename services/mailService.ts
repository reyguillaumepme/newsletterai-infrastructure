
import { databaseService } from './databaseService';
import { Contact } from '../types';

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
    brandId: string
  }) {
    const success: string[] = [];
    const failed: string[] = [];
    
    // CONSTRUCTION ROBUSTE DE L'URL DE BASE
    // On prend l'URL actuelle complète et on retire tout ce qui suit le '#' (hash)
    // Cela permet de supporter les déploiements en sous-dossier (ex: domaine.com/app/)
    // au lieu de juste domain.com (window.location.origin)
    let baseUrl = window.location.href.split('#')[0];
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }

    // On envoie par lots de 5 pour ne pas saturer le navigateur/réseau
    const batchSize = 5;
    for (let i = 0; i < params.recipients.length; i += batchSize) {
      const batch = params.recipients.slice(i, i + batchSize);
      await Promise.all(batch.map(async (contact) => {
        try {
          // GENERATION DU LIEN DE DESABONNEMENT UNIQUE
          // HashRouter nécessite le #/ avant la route
          const unsubscribeUrl = `${baseUrl}#/unsubscribe?email=${encodeURIComponent(contact.email)}&brand_id=${params.brandId}`;
          
          // REMPLACEMENT DYNAMIQUE DANS LE HTML
          // On remplace la variable {{unsubscribe_url}} si elle existe
          // Sinon, par sécurité, on remplace aussi les href="#" génériques si le user n'a pas mis à jour son footer
          let personalizedHtml = params.htmlContent
             .replace(/{{unsubscribe_url}}/g, unsubscribeUrl)
             .replace('href="#"', `href="${unsubscribeUrl}"`); // Fallback simple

          await this.sendTestEmail({
            to: contact.email,
            subject: params.subject,
            htmlContent: personalizedHtml,
            brandName: params.brandName,
            brandId: params.brandId
          });
          success.push(contact.email);
        } catch (e) {
          console.error(`Erreur envoi pour ${contact.email}`, e);
          failed.push(contact.email);
        }
      }));
    }

    return { success, failed };
  }
};
