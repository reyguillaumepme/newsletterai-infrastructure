
import { Brand, Newsletter, Idea, Statistics, Profile, Contact } from '../types';
import { authService, getSupabaseConfig, getSupabaseClient } from './authService';

const getHeaders = async (key: string, forceRefresh = false) => {
  const token = await authService.getAccessToken();
  const headers: any = {
    'apikey': key,
    'Authorization': `Bearer ${token || key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  if (forceRefresh) {
    headers['Cache-Control'] = 'no-cache';
    headers['x-client-info'] = 'newsletter-ai-sync';
  }
  return headers;
};

const storage = {
  get: (key: string) => {
    const rawData = localStorage.getItem(`db_${key}`);
    return rawData ? JSON.parse(rawData) : [];
  },
  set: (key: string, data: any) => {
    localStorage.setItem(`db_${key}`, JSON.stringify(data));
  },
  generateId: () => Math.random().toString(36).substr(2, 9)
};

const isUsingCloud = () => {
  const { url, key } = getSupabaseConfig();
  return !!(url && key);
};

const compressImage = (base64Str: string, maxWidth = 800, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas context error"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Blob conversion error"));
      }, 'image/jpeg', quality);
    };
    img.onerror = (e) => reject(e);
  });
};

export const databaseService = {
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) return { success: true, message: "Mode démo actif." };
    try {
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const headers = await getHeaders(key, true);
      const res = await fetch(`${baseUrl}/rest/v1/brands?select=count`, {
        headers,
        signal: AbortSignal.timeout(5000)
      });
      return res.ok ? { success: true, message: "Connexion réussie !" } : { success: false, message: `Erreur ${res.status}` };
    } catch (e) { return { success: false, message: "Supabase injoignable." }; }
  },

  async testEdgeFunction(functionUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const { key } = getSupabaseConfig();
      // Simulation d'un payload Webhook Supabase (INSERT)
      const payload = {
        type: 'INSERT',
        table: 'contacts',
        schema: 'public',
        record: {
          email: 'test-admin@demo.com',
          first_name: 'Test',
          last_name: 'Admin',
          brand_id: '00000000-0000-0000-0000-000000000000'
        },
        old_record: null
      };

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return { success: true, message: "Succès ! La fonction a répondu correctement." };
      } else {
        const text = await response.text();

        // Gestion spécifique erreur 401 JWT pour l'interface UI
        if (response.status === 401) {
          return {
            success: false,
            message: `⛔️ Erreur 401 (JWT Invalid).\n\nSupabase bloque l'accès public.\n\n👉 SOLUTION RAPIDE (Sans Terminal) :\n1. Allez dans votre Dashboard Supabase > Edge Functions\n2. Cliquez sur votre fonction\n3. Désactivez l'option "Enforce JWT Verification"`
          };
        }

        return { success: false, message: `Erreur ${response.status}: ${text}` };
      }
    } catch (e: any) {
      // Détection spécifique erreur CORS
      if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
        return {
          success: false,
          message: "⛔️ Erreur CORS (Navigateur bloqué).\n\nLe navigateur ne reçoit pas les headers 'Access-Control-Allow-Origin'.\n\nVérifiez que votre code (index.ts) gère bien la méthode OPTIONS."
        };
      }
      return { success: false, message: `Erreur réseau : ${e.message}` };
    }
  },

  async testStorageConnection(): Promise<{ success: boolean; message: string }> {
    if (!isUsingCloud()) return { success: true, message: "Stockage local (Démo)." };
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, message: "Client Supabase non initialisé." };
    try {
      const { data, error } = await supabase.storage.from('public_assets').list('', { limit: 1 });
      if (error) return { success: false, message: error.message };
      return { success: true, message: "Stockage opérationnel." };
    } catch (e: any) { return { success: false, message: e.message || "Erreur stockage." }; }
  },

  async uploadImage(base64Data: string): Promise<string> {
    if (!isUsingCloud() || !base64Data.startsWith('data:')) return base64Data;
    const supabase = getSupabaseClient();
    if (!supabase) return base64Data;
    try {
      const user = authService.getCurrentUser();
      const fileName = `${user?.id || 'anon'}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const compressedBlob = await compressImage(base64Data);
      const { data, error } = await supabase.storage
        .from('public_assets')
        .upload(fileName, compressedBlob, { contentType: 'image/jpeg', upsert: true });
      if (error) return base64Data;
      const { data: { publicUrl } } = supabase.storage.from('public_assets').getPublicUrl(fileName);
      return publicUrl;
    } catch (e) { return base64Data; }
  },

  async fetchMyProfile(): Promise<Profile | null> {
    const user = authService.getCurrentUser();
    if (!user || !isUsingCloud()) return null;
    try {
      const { url, key } = getSupabaseConfig();
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const headers = await getHeaders(key);
      const res = await fetch(`${baseUrl}/rest/v1/profiles?id=eq.${user.id}&select=*`, { headers, cache: 'no-store' });
      const data = await res.json();
      return Array.isArray(data) ? data[0] : null;
    } catch (e) { return null; }
  },

  async fetchAllProfiles(): Promise<Profile[]> {
    if (!isUsingCloud()) return [];
    try {
      const { url, key } = getSupabaseConfig();
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const headers = await getHeaders(key);
      const res = await fetch(`${baseUrl}/rest/v1/profiles?select=*&order=created_at.desc`, { headers });
      return await res.json();
    } catch (e) { return []; }
  },

  async updateProfile(updates: Partial<Profile>): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user || !isUsingCloud()) return;
    const { url, key } = getSupabaseConfig();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      console.error("Error updating profile:", await res.text());
    }
  },

  async deductUserCredit(userId: string): Promise<boolean> {
    const user = authService.getCurrentUser();
    console.log(`[DEDUCT] Attempting for user: ${user?.id}`);

    if (!user || !isUsingCloud()) {
      console.log("[DEDUCT] User not found or not cloud");
      return true;
    }

    try {
      const profile = await this.fetchMyProfile();
      console.log(`[DEDUCT] Current profile credits: ${profile?.credits}`);

      if (!profile || (profile.credits !== undefined && profile.credits <= 0)) {
        console.warn("[DEDUCT] Insufficient credits or profile missing");
        return false;
      }

      const newCredits = (profile.credits || 0) - 1;
      console.log(`[DEDUCT] Updating to: ${newCredits}`);

      await this.updateProfile({ credits: newCredits });
      return true;
    } catch (e) {
      console.error("[DEDUCT] Error:", e);
      return false;
    }
  },

  async updateUserPlan(userId: string, plan: 'free' | 'pro' | 'elite', credits: number): Promise<void> {
    await this.updateProfile({ subscription_plan: plan, credits: credits });
  },

  async fetchBrands(): Promise<Brand[]> {
    if (!isUsingCloud()) return storage.get('brands');
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/brands?user_id=eq.${user?.id}&select=*&order=created_at.desc`, { headers });
    return res.ok ? await res.json() : [];
  },

  async fetchBrandById(id: string): Promise<Brand | null> {
    if (!isUsingCloud()) return storage.get('brands').find((b: any) => b.id === id) || null;
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/brands?id=eq.${id}&user_id=eq.${user?.id}&select=*`, { headers });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : null;
  },

  async createBrand(brand: Partial<Brand>): Promise<Brand> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("Non connecté");
    if (brand.logo_url?.startsWith('data:')) brand.logo_url = await this.uploadImage(brand.logo_url);
    if (!isUsingCloud()) {
      const newItem = { ...brand, id: storage.generateId(), user_id: user.id, created_at: new Date().toISOString() };
      storage.set('brands', [...storage.get('brands'), newItem]);
      return newItem as Brand;
    }
    const { url, key } = getSupabaseConfig();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/brands`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...brand, user_id: user.id })
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },

  async deleteBrand(id: string): Promise<boolean> {
    if (!isUsingCloud()) {
      storage.set('brands', storage.get('brands').filter((b: any) => b.id !== id));
      // Local cascade
      storage.set('contacts', storage.get('contacts').filter((c: any) => c.brand_id !== id));
      storage.set('ideas', storage.get('ideas').filter((i: any) => i.brand_id !== id));
      storage.set('newsletters', storage.get('newsletters').filter((n: any) => n.brand_id !== id));
      return true;
    }

    try {
      const { url, key } = getSupabaseConfig();
      const user = authService.getCurrentUser();
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const headers = await getHeaders(key);

      // Manual Cascade (safest)
      // 1. Delete Contacts
      await fetch(`${baseUrl}/rest/v1/contacts?brand_id=eq.${id}`, { method: 'DELETE', headers });
      // 2. Delete Ideas
      await fetch(`${baseUrl}/rest/v1/ideas?brand_id=eq.${id}`, { method: 'DELETE', headers });
      // 3. Delete Newsletters
      await fetch(`${baseUrl}/rest/v1/newsletters?brand_id=eq.${id}`, { method: 'DELETE', headers });

      // 4. Delete Brand
      const res = await fetch(`${baseUrl}/rest/v1/brands?id=eq.${id}`, {
        method: 'DELETE',
        headers
      });

      return res.ok;
    } catch (e) {
      console.error("Delete Brand Error:", e);
      return false;
    }
  },

  async updateBrand(id: string, fields: Partial<Brand>): Promise<Brand | null> {
    if (fields.logo_url?.startsWith('data:')) fields.logo_url = await this.uploadImage(fields.logo_url);
    if (!isUsingCloud()) {
      const items = storage.get('brands');
      const idx = items.findIndex((b: any) => b.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...fields };
        storage.set('brands', items);
        return items[idx];
      }
      return null;
    }
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/brands?id=eq.${id}&user_id=eq.${user?.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(fields)
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },

  // --- CONTACTS MANAGEMENT (NEW) ---

  async fetchContacts(brandId: string): Promise<Contact[]> {
    if (!isUsingCloud()) return []; // Mock not implemented for simplicity
    const { url, key } = getSupabaseConfig();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/contacts?brand_id=eq.${brandId}&select=*&order=created_at.desc`, { headers });
    return res.ok ? await res.json() : [];
  },

  async createContact(contact: Partial<Contact>): Promise<Contact> {
    if (!isUsingCloud()) throw new Error("Contacts only available in Cloud mode");
    const { url, key } = getSupabaseConfig();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(contact)
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },

  async updateContact(id: string, fields: Partial<Contact>): Promise<Contact | null> {
    if (!isUsingCloud()) return null;
    const { url, key } = getSupabaseConfig();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/contacts?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(fields)
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },

  async deleteContact(id: string): Promise<boolean> {
    if (!isUsingCloud()) return false;
    const { url, key } = getSupabaseConfig();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/contacts?id=eq.${id}`, {
      method: 'DELETE',
      headers
    });
    return res.ok;
  },

  async unsubscribeContact(email: string, brandId: string): Promise<boolean> {
    if (!isUsingCloud()) {
      // Simulation pour démo (même si les contacts ne sont pas persistés en démo simple)
      console.log(`Unsubscribed ${email} from ${brandId} (Local)`);
      return true;
    }
    const { url, key } = getSupabaseConfig();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);

    // On update en fonction du couple email + brand_id
    const res = await fetch(`${baseUrl}/rest/v1/contacts?email=eq.${encodeURIComponent(email)}&brand_id=eq.${brandId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'unsubscribed' })
    });

    return res.ok;
  },

  // --- NEWSLETTERS ---

  async fetchNewsletters(): Promise<Newsletter[]> {
    if (!isUsingCloud()) return storage.get('newsletters');
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    // Join with brands table to get brand information
    const res = await fetch(`${baseUrl}/rest/v1/newsletters?user_id=eq.${user?.id}&select=*,brands(brand_name,logo_url)&order=created_at.desc`, { headers });
    return res.ok ? await res.json() : [];
  },

  async fetchNewsletterById(id: string): Promise<Newsletter | null> {
    if (!isUsingCloud()) return storage.get('newsletters').find((nl: any) => nl.id === id) || null;
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/newsletters?id=eq.${id}&user_id=eq.${user?.id}&select=*`, { headers });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : null;
  },

  async createNewsletter(nl: Partial<Newsletter>): Promise<Newsletter> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("Non authentifié");
    if (!isUsingCloud()) {
      const newItem = { ...nl, id: storage.generateId(), user_id: user.id, created_at: new Date().toISOString(), status: 'draft' };
      storage.set('newsletters', [...storage.get('newsletters'), newItem]);
      return newItem as Newsletter;
    }
    const { url, key } = getSupabaseConfig();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/newsletters`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...nl, user_id: user.id })
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },



  async updateNewsletter(id: string, fields: Partial<Newsletter>): Promise<Newsletter | null> {
    if (!isUsingCloud()) {
      const items = storage.get('newsletters');
      const idx = items.findIndex((n: any) => n.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...fields };
        storage.set('newsletters', items);
        return items[idx];
      }
      return null;
    }
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/newsletters?id=eq.${id}&user_id=eq.${user?.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(fields)
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : (fields as any);
  },

  async fetchIdeas(): Promise<Idea[]> {
    if (!isUsingCloud()) return storage.get('ideas');
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/ideas?user_id=eq.${user?.id}&select=*&order=created_at.desc`, { headers });
    return res.ok ? await res.json() : [];
  },

  async fetchIdeasByBrand(brandId: string): Promise<Idea[]> {
    if (!isUsingCloud()) return storage.get('ideas').filter((i: any) => i.brand_id === brandId);
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/ideas?brand_id=eq.${brandId}&user_id=eq.${user?.id}&select=*&order=created_at.desc`, { headers });
    return res.ok ? await res.json() : [];
  },

  async fetchIdeasByNewsletter(newsletterId: string): Promise<Idea[]> {
    if (!isUsingCloud()) return storage.get('ideas').filter((i: any) => i.newsletter_id === newsletterId);
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/ideas?newsletter_id=eq.${newsletterId}&user_id=eq.${user?.id}&select=*&order=order_index.asc`, { headers });
    return res.ok ? await res.json() : [];
  },

  async createIdea(idea: Partial<Idea>): Promise<Idea> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("Non connecté");
    if (idea.image_url?.startsWith('data:')) idea.image_url = await this.uploadImage(idea.image_url);
    if (!isUsingCloud()) {
      const newItem = { ...idea, id: storage.generateId(), user_id: user.id, created_at: new Date().toISOString(), used: false, order_index: 0 };
      storage.set('ideas', [...storage.get('ideas'), newItem]);
      return newItem as Idea;
    }
    const { url, key } = getSupabaseConfig();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/ideas`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...idea, user_id: user.id, order_index: 0 })
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },

  async updateIdea(id: string, fields: Partial<Idea>): Promise<Idea | null> {
    if (fields.image_url?.startsWith('data:')) fields.image_url = await this.uploadImage(fields.image_url);
    if (!isUsingCloud()) {
      const items = storage.get('ideas');
      const idx = items.findIndex((i: any) => i.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...fields };
        storage.set('ideas', items);
        return items[idx];
      }
      return null;
    }
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/ideas?id=eq.${id}&user_id=eq.${user?.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(fields)
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : (fields as any);
  },

  async deleteIdea(id: string): Promise<boolean> {
    if (!isUsingCloud()) {
      storage.set('ideas', storage.get('ideas').filter((i: any) => i.id !== id));
      return true;
    }
    try {
      const { url, key } = getSupabaseConfig();
      const user = authService.getCurrentUser();
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const headers = await getHeaders(key);
      const res = await fetch(`${baseUrl}/rest/v1/ideas?id=eq.${id}&user_id=eq.${user?.id}`, {
        method: 'DELETE',
        headers
      });
      return res.ok;
    } catch (e) { return false; }
  },

  async fetchStatistics(): Promise<Statistics[]> {
    if (!isUsingCloud()) return storage.get('stats');
    const { url, key } = getSupabaseConfig();
    const user = authService.getCurrentUser();
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const headers = await getHeaders(key);
    const res = await fetch(`${baseUrl}/rest/v1/statistics?user_id=eq.${user?.id}&select=*&order=date.desc`, { headers });
    return res.ok ? await res.json() : [];
  },

  async syncStats(): Promise<void> { await new Promise(resolve => setTimeout(resolve, 1000)); },

  async initializeDemoData(userId: string): Promise<void> {
    if (isUsingCloud()) return;
    if (storage.get('brands').length > 0) return;
    try {
      const brand = await this.createBrand({ brand_name: "AI Trends Weekly", description: "Focus IA.", target_audience: "Entrepreneurs", editorial_tone: "Expert" });
      await this.createIdea({ brand_id: brand.id, title: "Gemini 3.0", content: "Capabilities analysis.", source: "YouTube", source_type: "youtube", order_index: 0 });
    } catch (e) { }
  }
};
