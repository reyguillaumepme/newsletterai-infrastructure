# Guide de Déploiement Vercel (Version Alpha)

Ce guide décrit les étapes pour déployer l'application **NewsletterAI** sur Vercel.

## 1. Prérequis
- Un compte [Vercel](https://vercel.com/signup).
- Le projet doit être poussé sur GitHub.
- Les accès à votre projet Supabase.
- Votre clé API Gemini.

## 2. Configuration du Projet sur Vercel
1. Connectez-vous à Vercel et cliquez sur **"Add New..."** > **"Project"**.
2. Importez le repository GitHub `newsletterai-infrastructure`.
3. Vercel détectera automatiquement qu'il s'agit d'un projet **Vite**.
4. Laissez les paramètres de build par défaut :
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

## 3. Variables d'Environnement (CRITIQUE)
Dans la section **"Environment Variables"** de la configuration Vercel, ajoutez les variables suivantes.
**Attention :** Le projet utilise à la fois Supabase et une clé Gemini directe pour la génération de texte.

| Nom de la Variable | Valeur (Exemple) | Description |
|--------------------|------------------|-------------|
| `VITE_SUPABASE_URL` | `https://jssfgxhacpjiefkgalyz.supabase.co` | URL de votre projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **Clé Legacy (JWT)** de Supabase (pas la clé sb_publishable) |
| `VITE_GEMINI_API_KEY` | `AIzaSyB_...` | Clé API Google Gemini (utilisée pour le texte, titres, stratégies) |

> **Note :** La génération d'images passe par une Edge Function (Vertex AI), mais la génération de texte (Stratégie, Idées) utilise encore la clé API client `VITE_GEMINI_API_KEY`. Il est donc indispensable de l'ajouter pour que l'application fonctionne à 100%.

## 4. Déploiement
1. Cliquez sur **"Deploy"**.
2. Vercel va lancer le build.

## 5. Dépannage
- **Erreur "Invalid API Key" :** Vous utilisez probablement la clé `sb_publishable` au lieu de la `anon` (JWT). Utilisez la clé JWT longue.
- **Erreur "Génération IA" :** La variable `VITE_GEMINI_API_KEY` est manquante.
- **Ecran blanc / 404 :** Le fichier `vercel.json` à la racine gère les redirections. Assurez-vous qu'il est bien présent.

---
*Généré par Antigravity pour NewsletterAI*
