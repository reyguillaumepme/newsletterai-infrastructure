import { Newsletter, Brand, ComplianceCheckResult, ComplianceLog, Idea } from '../types';

export const complianceService = {
    /**
     * Analyse le contenu de la newsletter pour vérifier la conformité.
     */
    runAudit(newsletter: Newsletter, brand: Brand | null, ideas: Idea[] = []): ComplianceCheckResult {
        // We use .content as priority (passed from NewsletterDetail as full HTML)
        const fullContent = newsletter.content || (newsletter.generated_content || '') + (newsletter.footer_content || '');
        const subject = newsletter.subject || '';

        // Définition des blocs à analyser individuellement
        const components = [
            { id: 'subject', name: "Sujet", content: subject, isHtml: false },
            { id: 'hook', name: "Texte d'accroche", content: newsletter.generated_content || '', isHtml: true },
            ...ideas.map(idea => ({ id: `idea-${idea.id}`, name: `Idée: ${idea.title}`, content: (idea.title + " " + idea.content), isHtml: true })),
            { id: 'footer', name: "Footer", content: newsletter.footer_content || '', isHtml: true }
        ];

        // 1. Mentions Légales
        const hasBrandName = brand?.brand_name ? fullContent.includes(brand.brand_name) : false;
        const hasLegalFooter = /droit|réservé|copyright|envoyé par|address|adresse/i.test(fullContent);

        const mentionsStatus = (hasBrandName || hasLegalFooter) ? 'success' : 'error';
        const mentionsMessage = mentionsStatus === 'success'
            ? "Mentions légales détectées."
            : "Aucune mention légale ou nom de marque détecté dans le footer.";

        // 2. Lien de désabonnement
        const hasUnsubscribe = /unsubscribe|désabonner|desabonner|si vous ne souhaitez plus recevoir/i.test(fullContent);
        const hasBrevoVar = fullContent.includes('{{unsubscribe_url}}') || fullContent.includes('{{ mirror }}');

        const unsubStatus = (hasUnsubscribe || hasBrevoVar) ? 'success' : 'error';
        const unsubMessage = unsubStatus === 'success'
            ? "Lien de désabonnement présent."
            : "Lien de désabonnement manquant (obligatoire).";

        // 3. Marqueur IA (AI Act - Transparence)
        const aiKeywords = ["généré par ia", "assisté par ia", "artificial intelligence", "ia", "ai assistant", "contenu automatisé", "intelligence artificielle"];
        const hasAiMarker = (newsletter.show_ai_transparency === true) || aiKeywords.some(kw => fullContent.toLowerCase().includes(kw));

        const aiStatus = hasAiMarker ? 'success' : 'warning';
        const aiMessage = hasAiMarker
            ? "Transparence IA respectée."
            : "Aucune mention 'IA' détectée. Recommandé pour la transparence (AI Act).";

        // 4. Score de Spam
        let spamScore = 100;
        const spamDetails: string[] = [];
        const spamChecks: { label: string; passed: boolean; penalty: number; category: string; remediation?: string; location?: string; matches?: string[] }[] = [];

        // --- 1. Objet de l'e-mail (Sujet) ---
        const catSubject = "Objet de l'e-mail (Sujet)";

        // Majuscules intégrales
        const isAllCaps = subject && subject === subject.toUpperCase() && subject.replace(/[^a-z]/gi, '').length > 5;
        if (isAllCaps) { spamScore -= 20; }
        spamChecks.push({
            label: "Pas de majuscules intégrales",
            passed: !isAllCaps,
            penalty: 20,
            category: catSubject,
            location: "Sujet",
            remediation: "Écrivez votre sujet en minuscules (sauf la première lettre) pour ne pas crier."
        });

        // Ponctuation excessive
        const excessivePuncMatch = subject.match(/[!?]{3,}/g);
        if (excessivePuncMatch) { spamScore -= 15; }
        spamChecks.push({
            label: "Pas de ponctuation excessive (!!!, ???)",
            passed: !excessivePuncMatch,
            penalty: 15,
            category: catSubject,
            location: "Sujet",
            matches: excessivePuncMatch ? Array.from(new Set(excessivePuncMatch)) : undefined,
            remediation: "Évitez d'utiliser plus de 2 signes de ponctuation à la suite (ex: !!!)."
        });

        // Caractères monétaires
        const moneyMatch = subject.match(/[$€£]{2,}/g);
        if (moneyMatch) { spamScore -= 15; }
        spamChecks.push({
            label: "Pas de symboles monétaires répétés",
            passed: !moneyMatch,
            penalty: 15,
            category: catSubject,
            location: "Sujet",
            matches: moneyMatch ? Array.from(new Set(moneyMatch)) : undefined,
            remediation: "Évitez d'utiliser plusieurs symboles de devise à la suite."
        });

        // Urgence factice
        const urgencyKeywords = ["urgent", "immédiat", "action requise", "vite"];
        const foundUrgency = urgencyKeywords.filter(kw => {
            const regex = new RegExp(`(^|[^a-zA-Z0-9À-ÿ])${kw}($|[^a-zA-Z0-9À-ÿ])`, "i");
            return regex.test(subject);
        });
        if (foundUrgency.length > 0) { spamScore -= 10; }
        spamChecks.push({
            label: "Pas d'urgence factice (Urgent, Vite...)",
            passed: foundUrgency.length === 0,
            penalty: 10,
            category: catSubject,
            location: "Sujet",
            matches: foundUrgency.length > 0 ? foundUrgency : undefined,
            remediation: "Évitez les termes créant une fausse urgence."
        });

        // Emojis dans le sujet
        const subjectEmojiCount = (subject.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).length;
        const subjectFirstEmoji = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(subject);
        const badEmojiSubject = subjectEmojiCount > 2 || subjectFirstEmoji;
        if (badEmojiSubject) { spamScore -= 5; }
        spamChecks.push({
            label: "Usage modéré d'emojis (Sujet)",
            passed: !badEmojiSubject,
            penalty: 5,
            category: catSubject,
            location: "Sujet",
            remediation: "Utilisez max 1 emoji et évitez d'en mettre en tout début de sujet."
        });

        // Préfixe trompeur
        const fakeRe = /^(re:|fwd:)/i.test(subject);
        if (fakeRe) { spamScore -= 20; }
        spamChecks.push({
            label: "Pas de préfixe trompeur (Re:, Fwd:)",
            passed: !fakeRe,
            penalty: 20,
            category: catSubject,
            location: "Sujet",
            remediation: "Ne simulez pas une réponse ou un transfert, c'est une technique de spam connue."
        });

        // Mots espacés (G.R.A.T.U.I.T)
        const spacedWords = /\b[A-Z]\s[A-Z]\s[A-Z]\s[A-Z]\b|\b[A-Z]\.[A-Z]\.[A-Z]\.[A-Z]\b/.test(subject);
        if (spacedWords) { spamScore -= 20; }
        spamChecks.push({
            label: "Pas de mots espacés (G.R.A.T.U.I.T)",
            passed: !spacedWords,
            penalty: 20,
            category: catSubject,
            location: "Sujet",
            remediation: "N'essayez pas de contourner les filtres en espaçant les lettres."
        });

        // --- 2. Corps du message (Contenu HTML) ---
        const catContent = "Corps du message (Contenu HTML)";

        // Mots-clés interdits & Urgence (Sur tous les composants)
        const forbiddenKeywords = ["gratuit", "free", "promo", "gagnez", "cash", "winner", "cadeau", "urgent", "immédiat", "vite", "cliquez ici", "click here"];
        const foundKeywords: { word: string; loc: string }[] = [];

        components.forEach(comp => {
            const cleanText = comp.isHtml ? comp.content.replace(/<[^>]*>/g, ' ') : comp.content;
            forbiddenKeywords.forEach(kw => {
                const regex = new RegExp(`(^|[^a-zA-Z0-9À-ÿ])${kw}($|[^a-zA-Z0-9À-ÿ])`, "i");
                if (regex.test(cleanText)) {
                    foundKeywords.push({ word: kw, loc: comp.name });
                }
            });
        });

        if (foundKeywords.length > 0) {
            const uniqueWords = Array.from(new Set(foundKeywords.map(f => f.word)));
            const penalty = Math.min(40, uniqueWords.length * 10);
            spamScore -= penalty;
            spamChecks.push({
                label: "Absence de mots-clés spam (Gratuit, Urgent...)",
                passed: false,
                penalty,
                category: catContent,
                location: Array.from(new Set(foundKeywords.map(f => f.loc))).join(', '),
                matches: uniqueWords,
                remediation: `Retirez ou remplacez les termes détectés : ${uniqueWords.join(', ')}.`
            });
        } else {
            spamChecks.push({ label: "Absence de mots-clés spam", passed: true, penalty: 10, category: catContent });
        }

        // Alt text manquants
        const missingAlt = /<img(?![^>]*\balt=)[^>]*>/i.test(fullContent);
        if (missingAlt) { spamScore -= 10; }
        spamChecks.push({
            label: "Texte alternatif sur les images",
            passed: !missingAlt,
            penalty: 10,
            category: catContent,
            remediation: "Ajoutez un texte alternatif (alt) à toutes vos images pour l'accessibilité."
        });

        // Ratio Image / Texte
        const imgCount = (fullContent.match(/<img/g) || []).length;
        const textLength = fullContent.replace(/<[^>]*>/g, '').length;
        const badRatio = imgCount > 2 && textLength < 500;
        if (badRatio) { spamScore -= 20; }
        spamChecks.push({
            label: "Ratio Texte/Image équilibré",
            passed: !badRatio,
            penalty: 20,
            category: catContent,
            remediation: "Ajoutez plus de texte. Un email avec trop d'images et peu de texte ressemble à du spam."
        });

        // Symboles monétaires dans le corps
        const bodyMoneyMatch = fullContent.replace(/<[^>]*>/g, ' ').match(/[$€£]{3,}/g);
        if (bodyMoneyMatch) { spamScore -= 10; }
        spamChecks.push({
            label: "Pas de symboles monétaires répétés ($$$, €€€)",
            passed: !bodyMoneyMatch,
            penalty: 10,
            category: catContent,
            matches: bodyMoneyMatch ? Array.from(new Set(bodyMoneyMatch)) : undefined,
            remediation: "N'utilisez pas de symboles monétaires à la suite dans le message."
        });

        // --- 3. Technique et Expéditeur ---
        const catTech = "Technique et Expéditeur";

        // Raccourcisseurs URL
        const shortenerMatch = fullContent.match(/bit\.ly|tinyurl\.com|goo\.gl|ow\.ly/g);
        if (shortenerMatch) { spamScore -= 25; }
        spamChecks.push({
            label: "Pas de raccourcisseurs d'URL (Bitly...)",
            passed: !shortenerMatch,
            penalty: 25,
            category: catTech,
            matches: shortenerMatch ? Array.from(new Set(shortenerMatch)) : undefined,
            remediation: "Utilisez vos liens complets. Les raccourcisseurs sont risqués."
        });

        // No-Reply
        const isNoReply = brand?.sender_email ? /no-reply|noreply|ne-pas-repondre/i.test(brand.sender_email) : false;
        if (isNoReply) { spamScore -= 10; }
        spamChecks.push({
            label: "Pas d'adresse 'No-Reply'",
            passed: !isNoReply,
            penalty: 10,
            category: catTech,
            remediation: "Utilisez une adresse nominative (ex: prenom@...) pour humaniser l'envoi."
        });

        // Poids > 100ko
        const estimatedSize = new TextEncoder().encode(fullContent).length;
        if (estimatedSize > 102400) { spamScore -= 15; }
        spamChecks.push({
            label: "Poids du message optimisé (<100ko)",
            passed: estimatedSize <= 102400,
            penalty: 15,
            category: catTech,
            remediation: "Réduisez la taille de votre contenu ou de vos images."
        });

        // Variable mal fermée
        const brokenVar = /{{[^{}]*$|{{[^{}]*[^}]}$/.test(fullContent);
        if (brokenVar) { spamScore -= 20; }
        spamChecks.push({
            label: "Variables de personnalisation valides",
            passed: !brokenVar,
            penalty: 20,
            category: catTech,
            remediation: "Vérifiez vos accolades {{variable}}. Une variable cassée peut s'afficher brutalement."
        });

        // --- 4. Mise en forme et Lisibilité ---
        const catDesign = "Mise en forme et Lisibilité";

        // Ponctuation excessive dans le contenu
        const contentPuncMatches: { word: string; loc: string }[] = [];
        components.filter(c => c.id !== 'subject').forEach(comp => {
            const cleanText = comp.content.replace(/<[^>]*>/g, ' ');
            const matches = cleanText.match(/[!?]{3,}/g);
            if (matches) {
                matches.forEach(m => contentPuncMatches.push({ word: m, loc: comp.name }));
            }
        });

        if (contentPuncMatches.length > 0) {
            spamScore -= 10;
            spamChecks.push({
                label: "Ponctuation modérée",
                passed: false,
                penalty: 10,
                category: catDesign,
                location: Array.from(new Set(contentPuncMatches.map(f => f.loc))).join(', '),
                matches: Array.from(new Set(contentPuncMatches.map(f => f.word))),
                remediation: "Évitez d'utiliser plus de 2 points d'exclamation ou d'interrogation consécutifs."
            });
        } else {
            spamChecks.push({ label: "Ponctuation modérée", passed: true, penalty: 10, category: catDesign });
        }

        // Emojis (Abus)
        const contentEmojiMatches: { word: string; loc: string }[] = [];
        components.forEach(comp => {
            const regex = /[\u{1F300}-\u{1F9FF}]/gu;
            const matches = comp.content.match(regex);
            if (matches && matches.length > 3) {
                contentEmojiMatches.push({ word: `${matches.length} emojis`, loc: comp.name });
            }
        });

        if (contentEmojiMatches.length > 0) {
            spamScore -= 5;
            spamChecks.push({
                label: "Usage modéré d'emojis",
                passed: false,
                penalty: 5,
                category: catDesign,
                location: Array.from(new Set(contentEmojiMatches.map(f => f.loc))).join(', '),
                remediation: "Utilisez les emojis avec parcimonie pour rester pro."
            });
        }

        // Police petite (< 10px)
        const smallFont = /font-size:\s*[1-9]px/i.test(fullContent);
        if (smallFont) { spamScore -= 10; }
        spamChecks.push({
            label: "Taille de police lisible (>= 10px)",
            passed: !smallFont,
            penalty: 10,
            category: catDesign,
            remediation: "Augmentez la taille de votre police (min 14px recommandé)."
        });

        // Couleur de texte trop claire (Low contrast)
        const lowContrast = /color\s*:\s*(white|#fff(fff)?|#f[0-9a-f]{2,5}|#e[0-9a-f]{2,5}|rgb\(\s*25[0-5]\s*,\s*25[0-5]\s*,\s*25[0-5]\s*\))/i.test(fullContent);
        if (lowContrast) { spamScore -= 15; }
        spamChecks.push({
            label: "Contraste du texte suffisant",
            passed: !lowContrast,
            penalty: 15,
            category: catDesign,
            remediation: "Assurez-vous que votre texte est bien lisible (évitez le blanc ou gris trop clair)."
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
            spam_score: { score: spamScore, status: spamStatus, message: spamMsg, spam_checks: spamChecks },
            overall_status: overall
        };
    },

    /**
     * Génère un fichier CSV pour le registre des traitements.
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

                if (snapshot.spam_score?.spam_checks && snapshot.spam_score?.spam_checks.length > 0) {
                    const checkSummary = snapshot.spam_score.spam_checks.map((c: any) =>
                        `${c.passed ? '✅' : '❌'} ${c.label}` + (!c.passed ? ` (-${c.penalty})` : '')
                    ).join(', ');
                    issues.push(`Délivrabilité (${snapshot.spam_score.score}/100): ${checkSummary}`);
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
