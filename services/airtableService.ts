
const getAirtableConfig = () => {
  const storedKey = localStorage.getItem('AIRTABLE_API_KEY');
  const storedBase = localStorage.getItem('AIRTABLE_BASE_ID');
  
  return {
    apiKey: storedKey || (process.env as any).AIRTABLE_API_KEY,
    baseId: storedBase || (process.env as any).AIRTABLE_BASE_ID
  };
};

const getHeaders = () => {
  const { apiKey } = getAirtableConfig();
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Proxy de secours pour contourner les restrictions CORS d'Airtable Metadata API
 * uniquement pour la phase d'initialisation de la structure.
 */
const fetchMetadata = async (url: string, options: RequestInit = {}) => {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  return fetch(proxyUrl, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  });
};

const sanitizeRecord = (record: any) => {
  if (!record || !record.fields) return record;
  const fields = { ...record.fields };
  for (const key in fields) {
    if (Array.isArray(fields[key]) && fields[key].length === 1 && typeof fields[key][0] === 'string') {
      fields[key] = fields[key][0];
    }
  }
  return { id: record.id, ...fields };
};

export const airtableService = {
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const { baseId, apiKey } = getAirtableConfig();
    if (!apiKey || !baseId) return { success: false, message: "Clés manquantes dans l'admin." };
    try {
      // Test via le proxy pour vérifier l'accès au schéma
      const response = await fetchMetadata(`https://api.airtable.com/v1/meta/bases/${baseId}/tables`);
      
      if (response.ok) return { success: true, message: "Connexion réussie ! L'API Metadata est accessible." };
      
      if (response.status === 403) return { success: false, message: "Erreur 403 : Votre PAT n'a pas le scope 'schema.bases:read'." };
      const err = await response.json();
      return { success: false, message: err.error?.message || `Erreur Airtable (${response.status})` };
    } catch (e) {
      console.error("Fetch error:", e);
      return { success: false, message: "Erreur réseau. Vérifiez votre connexion ou la validité du Base ID." };
    }
  },

  async initializeDatabase(): Promise<{ success: boolean; log: string[] }> {
    const { baseId } = getAirtableConfig();
    const log: string[] = [];
    let brandsTableId = "";

    try {
      log.push("🔍 Vérification des tables existantes...");
      const resList = await fetchMetadata(`https://api.airtable.com/v1/meta/bases/${baseId}/tables`);
      let existingTables: any[] = [];
      
      if (resList.ok) {
        const listData = await resList.json();
        existingTables = listData.tables || [];
      }

      const findTable = (name: string) => existingTables.find(t => t.name === name);

      // ÉTAPE 1 : Gérer la table Brands
      const existingBrands = findTable("Brands");
      if (existingBrands) {
        brandsTableId = existingBrands.id;
        log.push(`ℹ️ La table 'Brands' existe déjà (ID: ${brandsTableId}).`);
      } else {
        log.push("🆕 Création de la table 'Brands'...");
        const resBrands = await fetchMetadata(`https://api.airtable.com/v1/meta/bases/${baseId}/tables`, {
          method: 'POST',
          body: JSON.stringify({
            name: "Brands",
            fields: [
              { name: "brand_name", type: "singleLineText" },
              { name: "description", type: "multilineText" },
              { name: "target_audience", type: "singleLineText" },
              { name: "editorial_tone", type: "singleLineText" },
              { name: "newsletter_strategy", type: "multilineText" },
              { name: "writing_framework", type: "multilineText" },
              { name: "word_limit", type: "singleLineText" },
              { name: "cta_url", type: "singleLineText" }
            ]
          })
        });
        const brandsData = await resBrands.json();
        if (resBrands.ok) {
          brandsTableId = brandsData.id;
          log.push(`✅ Table 'Brands' créée.`);
        } else {
          throw new Error(`Erreur Brands: ${brandsData.error?.message}`);
        }
      }

      // ÉTAPE 2 : Créer les autres tables
      const otherTables = [
        {
          name: "Newsletters",
          fields: [
            { name: "subject", type: "singleLineText" },
            { 
              name: "status", 
              type: "singleSelect",
              options: { choices: [{name: "draft"}, {name: "scheduled"}, {name: "sent"}] }
            },
            { name: "generated_content", type: "multilineText" },
            { name: "source_type", type: "singleLineText" },
            { name: "brand_id", type: "multipleRecordLinks", options: { linkedTableId: brandsTableId } }
          ]
        },
        {
          name: "Ideas",
          fields: [
            { name: "content", type: "multilineText" },
            { name: "source", type: "singleLineText" },
            { name: "used", type: "checkbox", options: { icon: "check", color: "greenBright" } },
            { name: "brand_id", type: "multipleRecordLinks", options: { linkedTableId: brandsTableId } }
          ]
        }
      ];

      for (const table of otherTables) {
        if (findTable(table.name)) {
          log.push(`ℹ️ La table '${table.name}' existe déjà.`);
          continue;
        }
        log.push(`🆕 Création de la table '${table.name}'...`);
        const response = await fetchMetadata(`https://api.airtable.com/v1/meta/bases/${baseId}/tables`, {
          method: 'POST',
          body: JSON.stringify(table)
        });
        if (response.ok) {
          log.push(`✅ Table '${table.name}' créée.`);
        } else {
          const err = await response.json();
          log.push(`❌ '${table.name}' : ${err.error?.message}`);
        }
      }

      log.push("✨ Configuration de l'infrastructure terminée !");
      return { success: true, log };
    } catch (e: any) {
      log.push(`🔥 Erreur : ${e.message}`);
      return { success: false, log };
    }
  },

  async fetchRecords<T>(tableName: string): Promise<T[]> {
    const { baseId } = getAirtableConfig();
    if (!baseId) return [];
    try {
      const response = await fetch(`https://api.airtable.com/v1/${baseId}/${tableName}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error(`Airtable error: ${response.statusText}`);
      const data = await response.json();
      return data.records.map(sanitizeRecord) as T[];
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return [];
    }
  },

  async fetchRecordById<T>(tableName: string, recordId: string): Promise<T | null> {
    const { baseId } = getAirtableConfig();
    if (!baseId) return null;
    try {
      const response = await fetch(`https://api.airtable.com/v1/${baseId}/${tableName}/${recordId}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error(`Airtable error: ${response.statusText}`);
      const record = await response.json();
      return sanitizeRecord(record) as T;
    } catch (error) {
      console.error(`Error fetching ${tableName} ${recordId}:`, error);
      return null;
    }
  },

  async createRecord<T>(tableName: string, fields: Partial<T>): Promise<T | null> {
    const { baseId } = getAirtableConfig();
    if (!baseId) return null;
    try {
      const response = await fetch(`https://api.airtable.com/v1/${baseId}/${tableName}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fields })
      });
      const record = await response.json();
      return sanitizeRecord(record) as T;
    } catch (error) {
      console.error(`Error creating ${tableName}:`, error);
      return null;
    }
  },

  async updateRecord<T>(tableName: string, recordId: string, fields: Partial<T>): Promise<T | null> {
    const { baseId } = getAirtableConfig();
    if (!baseId) return null;
    try {
      const response = await fetch(`https://api.airtable.com/v1/${baseId}/${tableName}/${recordId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ fields })
      });
      const record = await response.json();
      return sanitizeRecord(record) as T;
    } catch (error) {
      console.error(`Error updating ${tableName}:`, error);
      return null;
    }
  },

  async deleteRecord(tableName: string, recordId: string): Promise<boolean> {
    const { baseId } = getAirtableConfig();
    if (!baseId) return false;
    try {
      const response = await fetch(`https://api.airtable.com/v1/${baseId}/${tableName}/${recordId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return response.ok;
    } catch (error) {
      console.error(`Error deleting ${tableName}:`, error);
      return false;
    }
  }
};
