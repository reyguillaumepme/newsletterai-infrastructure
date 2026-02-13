
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SCOPES = {
    "GET": ["contacts"],
    "POST": ["contacts", "contacts/lists", "contacts/folders", "contacts/doubleOptinConfirmation"],
    "PUT": ["contacts"],
    "DELETE": ["contacts"]
};

const BREVO_API_URL = "https://api.brevo.com/v3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // CORS Handling
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Get Master Key from Secrets
        const brevoKey = Deno.env.get("BREVO_API_KEY");
        if (!brevoKey) {
            throw new Error("Configuration SaaS manquante : BREVO_API_KEY introuvable sur le serveur.");
        }

        // 2. Parse Request
        const { action, body, method = "POST", endpoint, queryParams } = await req.json();

        // 3. Simple Router based on 'action' or direct 'endpoint'
        // Actions: 'createFolder', 'createList', 'addContact', 'removeContact', 'blacklist', 'whitelist'

        let url = "";
        let fetchMethod = method;
        let fetchBody = body;

        switch (action) {
            case "createFolder":
                url = `${BREVO_API_URL}/contacts/folders`;
                break;
            case "createList":
                url = `${BREVO_API_URL}/contacts/lists`;
                break;
            case "addContact":
                url = `${BREVO_API_URL}/contacts`;
                // Ensure updateEnabled is true for SaaS sync
                fetchBody = { ...body, updateEnabled: true };
                break;
            case "removeContact":
                // Endpoint: /contacts/lists/{listId}/contacts/remove
                if (!body.listId) throw new Error("listId required");
                url = `${BREVO_API_URL}/contacts/lists/${body.listId}/contacts/remove`;
                break;
            case "blacklist":
            case "whitelist":
                // Endpoint: /contacts/{email} PUT
                if (!body.email) throw new Error("email required");
                url = `${BREVO_API_URL}/contacts/${encodeURIComponent(body.email)}`;
                fetchMethod = "PUT";
                fetchBody = { emailBlacklisted: action === "blacklist" };
                break;
            case "unsubscribe":
                // Unsubscribe logic might be different? usually blacklist is better for preservation
                // But IF we want to just update attributes:
                if (!body.email) throw new Error("email required");
                url = `${BREVO_API_URL}/contacts/${encodeURIComponent(body.email)}`;
                fetchMethod = "PUT";
                fetchBody = { listIds: [], emailBlacklisted: true }; // Example logic
                break;
            case "sendTestEmail":
                // Endpoint: /smtp/email
                url = `${BREVO_API_URL}/smtp/email`;
                fetchBody = body; // Pass sender, to, subject, htmlContent directly
                break;
            case "getCampaignStats":
                // Endpoint: /emailCampaigns/{campaignId}
                if (!body.campaignId) throw new Error("campaignId required");
                url = `${BREVO_API_URL}/emailCampaigns/${body.campaignId}`;
                fetchMethod = "GET";
                break;
            default:
                // Fallback for generic proxy (restricted)
                throw new Error("Action non supportée ou invalide.");
        }

        console.log(`[Brevo Proxy] Executing ${action} on ${url}`);

        // 4. Execute Request to Brevo
        const res = await fetch(url, {
            method: fetchMethod,
            headers: {
                "api-key": brevoKey,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(fetchBody)
        });

        // 5. Handle Response
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            console.error(`[Brevo Proxy Error] ${res.status}:`, errorData);
            // We return 200 with error field to handle it gracefully in frontend if needed, 
            // OR return 400/500 using standard REST.
            // Let's throw to return 400 below.
            throw new Error(errorData.message || `Brevo Error ${res.status}`);
        }

        const data = await res.json().catch(() => ({ success: true })); // Handle empty responses (like 204)

        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });

    } catch (error: any) {
        console.error("Error in brevo-api:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }
});
