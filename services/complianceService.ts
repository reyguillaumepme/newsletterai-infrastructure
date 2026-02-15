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

        // 4. Score de Spam (Analyse complète)
        let spamScore = 100; // 100 = Parfait, 0 = Spam
        const spamDetails: string[] = [];
        const spamChecks: { label: string; passed: boolean; penalty: number; category: string; remediation?: string }[] = [];

        const subjectLower = subject.toLowerCase();
        const contentLower = content.toLowerCase();

        // --- 1. Objet de l'e-mail (Sujet) ---
        const catSubject = "Objet de l'e-mail (Sujet)";

        // Majuscules intégrales
        const isAllCaps = subject && subject === subject.toUpperCase() && subject.length > 5;
        if (isAllCaps) { spamScore -= 20; spamDetails.push("Sujet en majuscules (-20)"); }
        spamChecks.push({
            label: "Pas de majuscules intégrales",
            passed: !isAllCaps,
            penalty: 20,
            category: catSubject,
            remediation: "Écrivez votre sujet en minuscules (sauf la première lettre) pour ne pas crier."
        });

        // Ponctuation excessive
        const excessivePunc = /[!?.]{3,}/.test(subject);
        if (excessivePunc) { spamScore -= 15; spamDetails.push("Ponctuation excessive (-15)"); }
        spamChecks.push({
            label: "Pas de ponctuation excessive (!!!, ???)",
            passed: !excessivePunc,
            penalty: 15,
            category: catSubject,
            remediation: "Limitez la ponctuation à un seul signe à la fois (! ou ?)."
        });

        // Caractères monétaires
        const excessiveMoney = /[$€£]{2,}/.test(subject);
        if (excessiveMoney) { spamScore -= 15; spamDetails.push("Symboles monétaires répétés (-15)"); }
        spamChecks.push({
            label: "Pas de symboles monétaires répétés ($$$, €€€)",
            passed: !excessiveMoney,
            penalty: 15,
            category: catSubject,
            remediation: "Évitez d'utiliser plusieurs symboles de devise à la suite."
        });

        // Mots-clés interdits
        const forbiddenKeywords = ["gratuit", "free", "promo", "gagnez", "cash", "winner"];
        let keywordPenalty = 0;
        const foundKeywords = forbiddenKeywords.filter(kw => subjectLower.includes(kw));
        if (foundKeywords.length > 0) {
            keywordPenalty = foundKeywords.length * 10;
            spamScore -= keywordPenalty;
            spamDetails.push(`Mots-clés interdits: ${foundKeywords.join(', ')} (-${keywordPenalty})`);
        }
        spamChecks.push({
            label: "Absence de mots-clés spam (Gratuit, Promo...)",
            passed: foundKeywords.length === 0,
            penalty: 10,
            category: catSubject,
            remediation: `Retirez ou remplacez les mots suivants : ${foundKeywords.join(', ')}.`
        });

        // Urgence factice
        const urgencyKeywords = ["urgent", "immédiat", "action requise", "vite"];
        const foundUrgency = urgencyKeywords.filter(kw => subjectLower.includes(kw));
        if (foundUrgency.length > 0) { spamScore -= 10; spamDetails.push("Urgence factice détectée (-10)"); }
        spamChecks.push({
            label: "Pas d'urgence factice (Urgent, Vite...)",
            passed: foundUrgency.length === 0,
            penalty: 10,
            category: catSubject,
            remediation: "Évitez les termes créant une fausse urgence, les filtres antispam les détestent."
        });

        // Re: / Fwd:
        const fakeRe = /^(re:|fwd:)/i.test(subject);
        if (fakeRe) { spamScore -= 20; spamDetails.push("Préfixe trompeur Re:/Fwd: (-20)"); }
        spamChecks.push({
            label: "Pas de préfixe trompeur (Re:, Fwd:)",
            passed: !fakeRe,
            penalty: 20,
            category: catSubject,
            remediation: "Ne simulez pas une réponse ou un transfert, c'est une technique de spam connue."
        });

        // Emojis
        const emojiCount = (subject.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).length;
        const firstCharEmoji = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(subject);
        if (emojiCount > 2 || firstCharEmoji) { spamScore -= 5; spamDetails.push("Abus d'emojis (-5)"); }
        spamChecks.push({
            label: "Usage modéré d'emojis (< 2, pas en début)",
            passed: !(emojiCount > 2 || firstCharEmoji),
            penalty: 5,
            category: catSubject,
            remediation: "Utilisez au maximum 1 emoji et jamais en début de sujet."
        });

        // --- 2. Corps du message (Contenu HTML) ---
        const catContent = "Corps du message (Contenu HTML)";


        // Raccourcisseurs URL
        const hasShortener = /bit\.ly|tinyurl\.com|goo\.gl|ow\.ly/.test(content);
        if (hasShortener) { spamScore -= 25; spamDetails.push("Raccourcisseur d'URL détecté (-25)"); }
        spamChecks.push({
            label: "Pas de raccourcisseurs d'URL (Bitly...)",
            passed: !hasShortener,
            penalty: 25,
            category: catContent,
            remediation: "Utilisez vos liens complets. Les raccourcisseurs masquent la destination et sont bloqués."
        });

        // Ratio Image / Texte (Approximation: < 500 chars et > 2 images => suspect)
        const imgCount = (content.match(/<img/g) || []).length;
        const textLength = content.replace(/<[^>]*>/g, '').length;
        const badRatio = imgCount > 2 && textLength < 500;
        if (badRatio) { spamScore -= 20; spamDetails.push("Ratio Image/Texte déséquilibré (-20)"); }
        spamChecks.push({
            label: "Ratio Texte/Image équilibré",
            passed: !badRatio,
            penalty: 20,
            category: catContent,
            remediation: "Ajoutez plus de texte. Un email avec trop d'images et peu de texte ressemble à du spam."
        });

        // Alt text manquants
        const missingAlt = /<img(?![^>]*\balt=)[^>]*>/i.test(content); // Basic check for img tag without alt
        if (missingAlt) { spamScore -= 10; spamDetails.push("Attribut Alt manquant sur images (-10)"); }
        spamChecks.push({
            label: "Texte alternatif sur les images",
            passed: !missingAlt,
            penalty: 10,
            category: catContent,
            remediation: "Ajoutez un texte alternatif (alt) à toutes vos images pour l'accessibilité."
        });

        // Poids > 100ko
        const estimatedSize = new TextEncoder().encode(content).length;
        if (estimatedSize > 102400) { spamScore -= 15; spamDetails.push("Email trop lourd (>100ko) (-15)"); }
        spamChecks.push({
            label: "Poids du message optimisé (<100ko)",
            passed: estimatedSize <= 102400,
            penalty: 15,
            category: catContent,
            remediation: "Réduisez la taille de votre contenu ou de vos images embarquées."
        });

        // Mots pression
        const pressureKeywords = ["cliquez ici", "profitez-en vite", "click here"];
        const foundPressure = pressureKeywords.filter(kw => contentLower.includes(kw));
        if (foundPressure.length > 0) {
            const pressurePenalty = foundPressure.length * 5;
            spamScore -= pressurePenalty;
            spamDetails.push("Mots-clés de pression (-" + pressurePenalty + ")");
        }
        spamChecks.push({
            label: "Pas de mots de pression (Cliquez ici...)",
            passed: foundPressure.length === 0,
            penalty: 5,
            category: catContent,
            remediation: "Utilisez des appels à l'action clairs mais moins agressifs que 'Cliquez ici'."
        });

        // --- 3. Technique et Expéditeur ---
        const catTech = "Technique et Expéditeur";

        // No-Reply
        const isNoReply = brand?.sender_email ? /no-reply|noreply|ne-pas-repondre/i.test(brand.sender_email) : false;
        if (isNoReply) { spamScore -= 10; spamDetails.push("Adresse No-Reply détectée (-10)"); }
        spamChecks.push({
            label: "Pas d'adresse d'expédition 'No-Reply'",
            passed: !isNoReply,
            penalty: 10,
            category: catTech,
            remediation: "Utilisez une adresse nominative (ex: prenom@...) pour humaniser l'envoi."
        });

        // Variable mal fermée
        const brokenVar = /{{[^{}]*$|{{[^{}]*[^}]}$/.test(content); // Very basic check for unclosed braces
        if (brokenVar) { spamScore -= 20; spamDetails.push("Variable de personnalisation mal fermée (-20)"); }
        spamChecks.push({
            label: "Variables de personnalisation valides",
            passed: !brokenVar,
            penalty: 20,
            category: catTech,
            remediation: "Vérifiez vos accolades {{variable}}. Une variable cassée peut afficher du code brut."
        });

        // --- 4. Mise en forme et Lisibilité ---
        const catDesign = "Mise en forme et Lisibilité";

        // Police petite (< 10px) (Regex approximation in style tags)
        const smallFont = /font-size:\s*[1-9]px/i.test(content);
        if (smallFont) { spamScore -= 10; spamDetails.push("Police trop petite (<10px) (-10)"); }
        spamChecks.push({
            label: "Taille de police lisible (>= 10px)",
            passed: !smallFont,
            penalty: 10,
            category: catDesign,
            remediation: "Augmentez la taille de votre police (min 14px recommandé) pour la lisibilité."
        });

        // Mots espacés (G.R.A.T.U.I.T)
        const spacedWords = /\b[A-Z]\s[A-Z]\s[A-Z]\s[A-Z]\b|\b[A-Z]\.[A-Z]\.[A-Z]\.[A-Z]\b/.test(subject);
        if (spacedWords) { spamScore -= 20; spamDetails.push("Mots espacés ou avec points (-20)"); }
        spamChecks.push({
            label: "Pas de mots espacés (G.R.A.T.U.I.T)",
            passed: !spacedWords,
            penalty: 20,
            category: catDesign,
            remediation: "N'essayez pas de contourner les filtres en espaçant les lettres, c'est contre-productif."
        });

        // Cap score min 0
        spamScore = Math.max(0, spamScore);

        let spamStatus: 'success' | 'warning' | 'error' = 'success';
        let spamMsg = "Excellent score de délivrabilité.";

        if (spamScore < 80) {
            spamStatus = 'warning';
            spamMsg = `Score moyen (${spamScore}/100). Quelques améliorations possibles.`;
        }
        if (spamScore < 50) {
            spamStatus = 'error';
            spamMsg = `Score critique (${spamScore}/100). Risque élevé de spam.`;
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
            spam_score: { score: spamScore, status: spamStatus, message: spamMsg, details: spamDetails, spam_checks: spamChecks },
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
                // Spam details (include all checks if available)
                // Spam details (include all checks if available)
                if (snapshot.spam_score?.spam_checks && snapshot.spam_score?.spam_checks.length > 0) {
                    const checkSummary = snapshot.spam_score.spam_checks.map((c: any) =>
                        `${c.passed ? '✅' : '❌'} ${c.label}` + (!c.passed ? ` (-${c.penalty})` : '')
                    ).join(', ');
                    issues.push(`Délivrabilité (${snapshot.spam_score.score}/100): ${checkSummary}`);
                } else if (snapshot.spam_score?.status !== 'success') {
                    // Fallback to old format
                    let spamMsg = `Spam: ${snapshot.spam_score?.message} (${snapshot.spam_score?.score}/100)`;
                    if (snapshot.spam_score?.details && snapshot.spam_score.details.length > 0) {
                        spamMsg += ` [${snapshot.spam_score.details.join(', ')}]`;
                    }
                    issues.push(spamMsg);
                } else {
                    issues.push(`Délivrabilité: Excellent (${snapshot.spam_score?.score}/100)`);
                }

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
