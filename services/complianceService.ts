import { Newsletter, Brand, ComplianceCheckResult, ComplianceLog } from '../types';

export const complianceService = {
    /**
     * Analyse le contenu de la newsletter pour vérifier la conformité.
     */
    runAudit(newsletter: Newsletter, brand: Brand | null): ComplianceCheckResult {
        const content = (newsletter.generated_content || '') + (newsletter.footer_content || '');
        const subject = newsletter.subject || '';

        // 1. Mentions Légales
        // On cherche le nom de la marque ou une adresse physique dans le footer
        const hasBrandName = brand?.brand_name ? content.includes(brand.brand_name) : false;
        // Vérification basique de présence d'un footer (souvent détecté par des mots clés comme "droits réservés", "copyright", "envoyé par")
        const hasLegalFooter = /droit|réservé|copyright|envoyé par|address|adresse/i.test(content);

        const mentionsStatus = (hasBrandName || hasLegalFooter) ? 'success' : 'error';
        const mentionsMessage = mentionsStatus === 'success'
            ? "Mentions légales détectées."
            : "Aucune mention légale ou nom de marque détecté dans le footer.";

        // 2. Lien de désabonnement
        // On cherche "unsubscribe", "désabonner", "desabonner"
        const hasUnsubscribe = /unsubscribe|désabonner|desabonner|si vous ne souhaitez plus recevoir/i.test(content);
        // Ou la variable {{unsubscribe_url}} de Brevo
        const hasBrevoVar = content.includes('{{unsubscribe_url}}') || content.includes('{{ mirror }}'); // mirror often goes with unsub

        const unsubStatus = (hasUnsubscribe || hasBrevoVar) ? 'success' : 'error';
        const unsubMessage = unsubStatus === 'success'
            ? "Lien de désabonnement présent."
            : "Lien de désabonnement manquant (obligatoire).";

        // 3. Marqueur IA (AI Act - Transparence)
        // On encourage la transparence. Ce n'est pas encore strictement bloquant partout, mais recommandé.
        const aiKeywords = ["généré par ia", "assisté par ia", "artificial intelligence", "ia", "ai assistant", "contenu automatisé", "intelligence artificielle"];
        const hasAiMarker = (newsletter.show_ai_transparency === true) || aiKeywords.some(kw => content.toLowerCase().includes(kw));

        const aiStatus = hasAiMarker ? 'success' : 'warning';
        const aiMessage = hasAiMarker
            ? "Transparence IA respectée."
            : "Aucune mention 'IA' détectée. Recommandé pour la transparence (AI Act).";

        // 4. Score de Spam (Analyse de contenu et sujet)
        const spamKeywords = ["gratuit", "free", "promo", "urgent", "gagnez", "winner", "cash", "argent", "!!!", "$$$", "€€€"];
        let spamScore = 0; // 0 = Clean, 100 = Spam

        const subjectLower = subject.toLowerCase();
        const contentLower = content.toLowerCase();

        // Check subject (weight higher)
        spamKeywords.forEach(kw => {
            if (subjectLower.includes(kw)) spamScore += 20;
        });

        // Check content
        if (contentLower.includes("cliquez ici")) spamScore += 5;
        if (subject === subject.toUpperCase() && subject.length > 5) spamScore += 30; // ALL CAPS SUBJECT

        // Cap score
        spamScore = Math.min(100, spamScore);

        let spamStatus: 'success' | 'warning' | 'error' = 'success';
        let spamMsg = "Score de spam faible. Tout va bien.";

        if (spamScore >= 50) {
            spamStatus = 'warning';
            spamMsg = `Attention, score de spam moyen (${spamScore}/100). Évitez les majuscules et mots agressifs.`;
        }
        if (spamScore >= 80) {
            spamStatus = 'error';
            spamMsg = `Score de spam critique (${spamScore}/100). Risque élevé de tomber en indésirable.`;
        }

        // Determine overall status
        let overall: 'success' | 'warning' | 'error' = 'success';
        if (mentionsStatus === 'error' || unsubStatus === 'error' || spamStatus === 'error') {
            overall = 'error';
        } else if (aiStatus === 'warning' || spamStatus === 'warning') {
            overall = 'warning';
        }

        return {
            mentions: { status: mentionsStatus, message: mentionsMessage },
            unsubscribe: { status: unsubStatus, message: unsubMessage },
            ai_marker: { status: aiStatus, message: aiMessage },
            spam_score: { score: spamScore, status: spamStatus, message: spamMsg },
            overall_status: overall
        };
    },

    /**
     * Génère un fichier CSV pour le registre des traitements.
     * @param logs Liste des logs de conformité
     * @param brandName Nom de la marque (optionnel) pour remplacer l'ID
     */
    exportRegistryToCSV(logs: ComplianceLog[], brandName?: string): string {
        const headers = ["ID", "Date d'envoi", "Marque", "Campagne (Sujet)", "Destinataires", "Statut Conformité", "Détails Audit"];

        const rows = logs.map(log => {
            let status = "INCONNU";
            let details = "";

            try {
                const snapshot = JSON.parse(log.compliance_snapshot);

                // Determine readable status
                if (snapshot.overall_status === 'success') status = "CONFORME";
                else if (snapshot.overall_status === 'warning') status = "RECOMMANDATION";
                else if (snapshot.overall_status === 'error') status = "NON CONFORME";

                // Build details string
                const issues = [];
                if (snapshot.mentions?.status !== 'success') issues.push(`Mentions: ${snapshot.mentions?.message}`);
                if (snapshot.unsubscribe?.status !== 'success') issues.push(`Désabonnement: ${snapshot.unsubscribe?.message}`);
                if (snapshot.ai_marker?.status === 'warning') issues.push(`IA: ${snapshot.ai_marker?.message}`);
                if (snapshot.spam_score?.status !== 'success') issues.push(`Spam: ${snapshot.spam_score?.message} (${snapshot.spam_score?.score}/100)`);

                details = issues.join(" | ");
            } catch (e) {
                status = "ERREUR LECTURE";
                details = "Impossible de lire le snapshot de conformité.";
            }

            return [
                log.id,
                new Date(log.sent_at).toLocaleString('fr-FR'),
                brandName || log.brand_id,
                `"${log.subject.replace(/"/g, '""')}"`,
                log.recipient_count,
                status,
                `"${details.replace(/"/g, '""')}"`
            ];
        });

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
};
