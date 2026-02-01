
import { createClient } from '@supabase/supabase-js';

const SUPER_USER_EMAIL = "rey.guillaume.pme@gmail.com";
// Identifiants de l'infrastructure Maître (Infrastruture partagée par défaut)
export const MASTER_CONFIG = {
  url: "https://jssfgxhacpjiefkgalyz.supabase.co",
  key: "sb_publishable_VPvxz-BccAhDOn_AuNFPrw_TNjonRpS"
};

/**
 * Récupère la configuration Supabase active.
 */
export const getSupabaseConfig = () => {
  const url = localStorage.getItem('SUPABASE_URL')?.trim();
  const key = localStorage.getItem('SUPABASE_ANON_KEY')?.trim();

  return {
    url: url || MASTER_CONFIG.url,
    key: key || MASTER_CONFIG.key
  };
};

// Singleton Storage
let supabaseInstance: any = null;
let currentConfig = { url: '', key: '' };

export const getSupabaseClient = () => {
  const { url, key } = getSupabaseConfig();

  // If config is missing, reset instance
  if (!url || !key) {
    supabaseInstance = null;
    currentConfig = { url: '', key: '' };
    return null;
  }

  // Reuse instance if config hasn't changed
  if (supabaseInstance && url === currentConfig.url && key === currentConfig.key) {
    return supabaseInstance;
  }

  // Create new instance
  try {
    supabaseInstance = createClient(url, key);
    currentConfig = { url, key };
    return supabaseInstance;
  } catch (e) {
    console.error("Erreur instanciation Supabase:", e);
    return null;
  }
};

const getFakeCloudMetadata = (email: string) => {
  try {
    const cloud = JSON.parse(localStorage.getItem('newsletter_ai_fake_cloud') || '{}');
    return cloud[email.toLowerCase()] || {};
  } catch (e) { return {}; }
};

const saveFakeCloudMetadata = (email: string, metadata: any) => {
  try {
    const cloud = JSON.parse(localStorage.getItem('newsletter_ai_fake_cloud') || '{}');
    cloud[email.toLowerCase()] = { ...cloud[email.toLowerCase()], ...metadata };
    localStorage.setItem('newsletter_ai_fake_cloud', JSON.stringify(cloud));
  } catch (e) { }
};

export const authService = {
  getCurrentUser: () => {
    try {
      const userJson = localStorage.getItem('newsletter_ai_user');
      if (!userJson) return null;
      return JSON.parse(userJson);
    } catch (e) { return null; }
  },

  async getAccessToken(): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch (e) { return null; }
  },

  isAuthenticated: () => authService.getCurrentUser() !== null,
  isAdmin: () => authService.isSuperAdmin(),
  isSuperAdmin: () => authService.getCurrentUser()?.email?.toLowerCase() === SUPER_USER_EMAIL,

  async signInWithGoogle(emailChoice?: string) {
    const email = (emailChoice || SUPER_USER_EMAIL).toLowerCase();

    // Cloud Auth Flow (Production)
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Infrastructure Supabase injoignable.");

    const redirectTo = window.location.origin.split(/[?#]/)[0].replace(/\/$/, "");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: { prompt: 'select_account' }
      }
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const cleanEmail = email.toLowerCase();
    if (cleanEmail === SUPER_USER_EMAIL) {
      // Special admin handling if needed
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) throw error;
      return await this.syncSupabaseUser(data.user);
    } else {
      throw new Error("Infrastructure Supabase non configurée.");
    }
  },

  async signUp(email: string, password: string) {
    const cleanEmail = email.toLowerCase();
    const supabase = getSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (error) throw error;
      return data;
    }

    return { email: cleanEmail };
  },

  async signOut() {
    const user = this.getCurrentUser();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) { }
    }

    if (user?.email?.toLowerCase() !== SUPER_USER_EMAIL) {
      localStorage.removeItem('SUPABASE_URL');
      localStorage.removeItem('SUPABASE_ANON_KEY');
    }
    localStorage.removeItem('newsletter_ai_user');

    // Force reset of singleton
    // @ts-ignore
    supabaseInstance = null;
    // @ts-ignore
    currentConfig = { url: '', key: '' };
  },

  async syncSupabaseUser(supabaseUser: any) {
    if (!supabaseUser) return null;
    const user = {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
      avatar: supabaseUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.email}`,
      user_metadata: supabaseUser.user_metadata
    };
    localStorage.setItem('newsletter_ai_user', JSON.stringify(user));

    if (user.email.toLowerCase() === SUPER_USER_EMAIL) {
      if (!localStorage.getItem('SUPABASE_URL')) {
        localStorage.setItem('SUPABASE_URL', MASTER_CONFIG.url);
        localStorage.setItem('SUPABASE_ANON_KEY', MASTER_CONFIG.key);
      }
    }

    return user;
  },

  async adminToggleUserStatus(email: string) {
    const cloud = JSON.parse(localStorage.getItem('newsletter_ai_fake_cloud') || '{}');
    const userEmail = email.toLowerCase();
    if (cloud[userEmail]) {
      cloud[userEmail].disabled = !cloud[userEmail].disabled;
      localStorage.setItem('newsletter_ai_fake_cloud', JSON.stringify(cloud));
      return true;
    }
    return false;
  },

  async saveConfigToCloud(url: string, key: string) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const meta = { supabase_url: url.trim(), supabase_key: key.trim() };
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.updateUser({ data: meta });
      } catch (e) { }
    }
    saveFakeCloudMetadata(user.email, meta);
    localStorage.setItem('newsletter_ai_user', JSON.stringify({ ...user, user_metadata: { ...user.user_metadata, ...meta } }));
    localStorage.setItem('SUPABASE_URL', url.trim());
    localStorage.setItem('SUPABASE_ANON_KEY', key.trim());
    return true;
  },

  async restoreConfigFromCloud() {
    const user = this.getCurrentUser();
    if (!user) return null;
    let url = user.user_metadata?.supabase_url;
    let key = user.user_metadata?.supabase_key;
    if (!url || !key) {
      const sim = getFakeCloudMetadata(user.email);
      url = sim.supabase_url; key = sim.supabase_key;
    }
    if (url && key) {
      localStorage.setItem('SUPABASE_URL', url);
      localStorage.setItem('SUPABASE_ANON_KEY', key);
      return { url, key };
    }
    return null;
  }
};
