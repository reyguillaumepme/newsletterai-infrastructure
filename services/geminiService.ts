import { GoogleGenerativeAI } from "@google/generative-ai";
import { Brand, Idea, StructuredStrategy } from "../types";

// Use import.meta.env instead of process.env in Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const generateNewsletterStrategy = async (brand: Brand): Promise<StructuredStrategy> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Génère une stratégie de newsletter pour la marque : "${brand.brand_name}".
  Description : ${brand.description}
  Audience : ${brand.target_audience}
  Ton : ${brand.editorial_tone}
  Persona : ${brand.desired_perception}, ${brand.skills_strengths}, ${brand.values_beliefs}, ${brand.differentiation}, ${brand.career_story}, ${brand.achievements}, ${brand.inspirations}, ${brand.daily_life}

  RETOURNE UNIQUEMENT UN OBJET JSON avec cette structure :
  {
    "tone": "5 mots sur le ton",
    "frequency": "Fréquence suggérée",
    "pillars": [
      {"title": "Pilier 1", "description": "Description"},
      {"title": "Pilier 2", "description": "Description"},
      {"title": "Pilier 3", "description": "Description"},
      {"title": "Pilier 4", "description": "Description"}
    ]
  }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Erreur génération stratégie:", e);
    throw new Error("Erreur de génération du JSON stratégique.");
  }
};

export const generateWritingFramework = async (brand: Brand): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "You are an expert copywriter."
    });
    const result = await model.generateContent(`Génère un cadre d'écriture pour : ${brand.brand_name}.`);
    const response = await result.response;
    return response.text() || "";
  } catch (e) {
    console.error("Erreur génération framework:", e);
    return "";
  }
};

export const generateNewsletterHook = async (subject: string, articles: Idea[], brand?: Brand): Promise<string> => {
  try {
    const articlesList = articles.map(a => `- ${a.title}`).join('\n');
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "Réponds UNIQUEMENT avec l'accroche."
    });
    const result = await model.generateContent(`Rédige l'intro de newsletter. Sujet : ${subject}. Articles : ${articlesList}. Ton : ${brand?.editorial_tone || 'Pro'}`);
    const response = await result.response;
    return response.text()?.trim() || "";
  } catch (e) {
    console.error("Erreur génération hook:", e);
    return "";
  }
};

export const enhanceIdeaWithAI = async (idea: Partial<Idea>, brand?: Brand): Promise<{ title: string; content: string; image_prompt: string }> => {
  try {
    // Parse newsletter strategy if available
    let strategy: StructuredStrategy | null = null;
    if (brand?.newsletter_strategy) {
      try {
        strategy = JSON.parse(brand.newsletter_strategy);
      } catch (e) {
        console.warn("Could not parse newsletter strategy:", e);
      }
    }

    // Build pillars description
    const pillarsText = strategy?.pillars?.map(p => `• ${p.title}: ${p.description}`).join('\n') || 'Non définis';

    const systemPrompt = `Tu es un copywriter expert spécialisé dans la rédaction de newsletters engageantes et captivantes. 
Tu maîtrises l'art de créer du contenu qui capte l'attention, engage le lecteur et le pousse à l'action.
Tu adaptes toujours ton style au ton de communication demandé tout en maintenant une structure claire et professionnelle.`;

    const userPrompt = `CONTEXTE DE LA MARQUE:
- Nom: ${brand?.brand_name || 'Non spécifié'}
- Description: ${brand?.description || 'Non spécifiée'}
- Audience cible: ${brand?.target_audience || 'Non spécifiée'}
- Perception souhaitée: ${brand?.desired_perception || 'Non spécifiée'}

STRATÉGIE NEWSLETTER DE LA MARQUE:
- Ton stratégique: ${strategy?.tone || 'Non défini'}
- Ton éditorial: ${brand?.editorial_tone || 'Professionnel et engageant'}
- Fréquence: ${strategy?.frequency || 'Non définie'}
- Piliers éditoriaux:
${pillarsText}

IDÉE À DÉVELOPPER:
Titre actuel: ${idea.title || 'Sans titre'}
Contenu actuel: ${idea.content || 'Aucun contenu existant'}

MISSION:
Génère un contenu de newsletter complet et engageant en respectant:
1. Le ton de communication "${brand?.editorial_tone || 'Professionnel'}" - c'est CRUCIAL
2. Les piliers éditoriaux de la stratégie newsletter
3. Un style captivant adapté à l'audience cible
4. Une structure claire: accroche percutante → développement de valeur → conclusion mémorable
5. Un contenu en HTML avec balises <p>, <strong>, <em> pour le formatage

Le contenu doit être prêt à être inséré dans une newsletter.

RÉPONDS UNIQUEMENT avec un objet JSON valide dans ce format exact:
{
  "title": "Titre accrocheur et optimisé",
  "content": "<p>Contenu HTML complet de la newsletter...</p>",
  "image_prompt": "Description détaillée en anglais pour générer une image éditoriale pertinente"
}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt
    });
    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text().trim();

    // Clean potential markdown code blocks
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Erreur génération idée:", e);
    throw new Error("Erreur lors de la génération IA. Vérifiez la configuration de l'API Gemini.");
  }
};

export const generateImageFromPrompt = async (prompt: string, stylePrefix: string = "", aspectRatio: "1:1" | "16:9" | "9:16" = "16:9"): Promise<string> => {
  // Note: Google Generative AI SDK doesn't support image generation yet
  // This is a placeholder that returns a colored placeholder
  console.warn("Image generation not yet supported with current SDK");
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23FFD54F'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%23333' text-anchor='middle' dominant-baseline='middle'%3EImage: ${prompt.substring(0, 30)}...%3C/text%3E%3C/svg%3E`;
};