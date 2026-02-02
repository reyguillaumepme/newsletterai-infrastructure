# Guide de Déploiement Vercel (Version Alpha)

Ce guide décrit les étapes pour déployer l'application **NewsletterAI** sur Vercel.

## 1. Prérequis
- Un compte [Vercel](https://vercel.com/signup).
- Le projet doit être poussé sur GitHub (ce qui est déjà fait).
- Les accès à votre projet Supabase (URL et Anon Key).

## 2. Configuration du Projet sur Vercel
1. Connectez-vous à Vercel et cliquez sur **"Add New..."** > **"Project"**.
2. Importez le repository GitHub `newsletterai-infrastructure`.
3. Vercel détectera automatiquement qu'il s'agit d'un projet **Vite**.
4. Laissez les paramètres de build par défaut :
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (ou `vite build`)
   - **Output Directory**: `dist`

### 3. Variables d'Environnement (Vercel)

Allez dans **Settings > Environment Variables** sur Vercel et ajoutez :

| Clé | Valeur | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://jssfgxhacpjiefkgalyz.supabase.co` | URL Projet |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (Votre clé publique `anon`) | Clé Publique (Legacy) |
| `VITE_GEMINI_API_KEY` | `AIzaSy...` (Votre clé Google AI Studio) | Pour génération de texte (Stratégie) |

> **Important :** Redéployez l'application (onglet Deployments > Redeploy) après avoir ajouté ces variables.

### 4. Configuration Brevo (Mode SaaS / Marque Blanche)

Pour garantir que la clé maître Brevo reste invisible des utilisateurs (sécurité maximale), elle est stockée uniquement côté serveur (Supabase Secrets).

**Dans votre terminal (à la racine du projet) :**

1.  **Définir la clé secrète :**
    ```bash
    npx supabase secrets set BREVO_API_KEY=votre_cle_brevo_maitre
    ```

2.  **Déployer les fonctions sécurisées :**
    ```bash
    npx supabase functions deploy brevo-api --no-verify-jwt
    npx supabase functions deploy send-campaign --no-verify-jwt
    ```
    *(Répondez 'y' si demandé pour mettre à jour les secrets liés)*

> **Note :** Ne PAS ajouter la clé Brevo dans les variables d'environnement Vercel (`VITE_...`). Elle doit rester dans Supabase Secrets.

## 5. Déploiement
1. Cliquez sur **"Deploy"**.
2. Vercel va lancer le build. Une fois terminé, vous obtiendrez une URL du type `https://newsletterai-infrastructure.vercel.app`.

## 6. Vérifications Post-Déploiement
- Assurez-vous que l'authentification fonctionne (Login/Signup).
- Vérifiez que la page **Paramètres** se charge correctement.
- **Note :** La section "Zone de Debug" dans les paramètres sera masquée en production (car elle vérifie `localhost`).

## 7. Problèmes Courants
- **Erreur 404 au rafraîchissement d'une page :**
  - J'ai ajouté un fichier `vercel.json` à la racine pour gérer le routage SPA (Single Page Application). Cela redirige toutes les requêtes vers `index.html`.
- **Authentification échouée :**
  - Vérifiez que l'URL de production Vercel (ex: `https://votre-app.vercel.app`) est bien ajoutée dans **Supabase > Authentication > URL Configuration > Site URL** et **Redirect URLs**. C'est CRITIQUE pour le login OAuth (Google).

---
*Généré par Antigravity pour NewsletterAI*
