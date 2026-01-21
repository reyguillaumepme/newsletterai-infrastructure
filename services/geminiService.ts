import { GoogleGenerativeAI } from "@google/generative-ai";
import { Brand, Idea, StructuredStrategy } from "../types";

// Use import.meta.env instead of process.env in Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const generateNewsletterStrategy = async (brand: Brand): Promise<StructuredStrategy> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
      model: "gemini-1.5-flash",
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
      model: "gemini-1.5-flash",
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Améliore cette idée : ${idea.title}. Réponds en JSON : {"title": "...", "content": "...", "image_prompt": "..."}`);
    const response = await result.response;
    return JSON.parse(response.text().trim());
  } catch (e) {
    console.error("Erreur enhancement idée:", e);
    return { title: idea.title || "", content: idea.content || "", image_prompt: "" };
  }
};

export const generateImageFromPrompt = async (prompt: string, stylePrefix: string = "", aspectRatio: "1:1" | "16:9" | "9:16" = "16:9"): Promise<string> => {
  // Note: Google Generative AI SDK doesn't support image generation yet
  // This is a placeholder that returns a colored placeholder
  console.warn("Image generation not yet supported with current SDK");
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23FFD54F'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%23333' text-anchor='middle' dominant-baseline='middle'%3EImage: ${prompt.substring(0, 30)}...%3C/text%3E%3C/svg%3E`;
};