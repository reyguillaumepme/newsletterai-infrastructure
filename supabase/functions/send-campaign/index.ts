
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Parse Request Body & Auth Header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');

        const {
            subject,
            htmlContent,
            brandId,
            brandName,
            sender, // { name, email }
            replyTo, // Optional string (email)
            recipients, // Array of strings (emails) or objects
            scheduledAt, // Optional ISO string
            brevoListId, // Optional: Existing Brevo List ID for this Brand
            apiKey // Optional: Fallback if not in profile
        } = await req.json();

        // 3. Initialize Supabase Client to fetch User Profile (Secrets)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Get Current User to ensure security
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            console.error('Auth Error:', userError);
            throw new Error(`Unauthorized (User Check Failed): ${userError?.message || 'No user session'}`);
        }

        // Fetch User Profile for Brevo Key
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('brevo_api_key')
            .eq('id', user.id)
            .single();

        let BREVO_KEY = profile?.brevo_api_key;

        // Fallback to provided key
        if (!BREVO_KEY && apiKey) {
            BREVO_KEY = apiKey;
        }

        if (!BREVO_KEY) {
            console.error('Profile Error:', profileError);
            throw new Error('Brevo API Key not found in user profile or request');
        }

        const BREVO_API_URL = 'https://api.brevo.com/v3';

        // Headers for Brevo
        const brevoHeaders = {
            'api-key': BREVO_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // ---------------------------------------------------------
        // BREVO LOGIC
        // ---------------------------------------------------------

        let listId: number;

        if (brevoListId) {
            // Case 1: Use Existing Persistent List
            console.log(`Using existing Brevo List ID: ${brevoListId}`);
            listId = Number(brevoListId);
        } else {
            // Case 2: Create New List (Fallback / First Time)

            // A. Get Folder ID
            let folderId: number;
            const folderRes = await fetch(`${BREVO_API_URL}/contacts/folders?limit=10&offset=0`, { headers: brevoHeaders });
            const folderData = await folderRes.json();

            if (folderData.folders && folderData.folders.length > 0) {
                folderId = folderData.folders[0].id; // Use first available folder
            } else {
                const createFolderRes = await fetch(`${BREVO_API_URL}/contacts/folders`, {
                    method: 'POST',
                    headers: brevoHeaders,
                    body: JSON.stringify({ name: 'NewsletterAI Campaigns' })
                });
                const newFolder = await createFolderRes.json();
                folderId = newFolder.id;
            }

            // B. Create a List
            // We name it using the Brand Name, intended to be persistent
            const listName = `${brandName || 'Brand'} - Subscribers (Persistent)`;

            const listRes = await fetch(`${BREVO_API_URL}/contacts/lists`, {
                method: 'POST',
                headers: brevoHeaders,
                body: JSON.stringify({ name: listName, folderId })
            });

            if (!listRes.ok) {
                const err = await listRes.json();
                throw new Error(`Failed to create list: ${JSON.stringify(err)}`);
            }
            const listData = await listRes.json();
            listId = listData.id;
            console.log(`Created New Brevo List: ${listId}`);
        }

        // C. Add Contacts to List (Sync Ensure Creation)
        // We use create/update contact to ensure they exist and are in the list.
        // "Add existing contacts to list" endpoint fails if contact doesn't exist.

        // Filter valid emails
        const validEmails = recipients.map((r: any) => typeof r === 'string' ? r : r.email).filter((e: string) => e && e.includes('@'));

        // Brevo requires sequential or batched processing to avoid rate limits? 
        // We'll use Promise.all for speed, assuming batch size isn't huge (<50).
        // If huge, we should switch to Import API, but that's async and complex.

        await Promise.all(validEmails.map(async (email: string) => {
            try {
                const res = await fetch(`${BREVO_API_URL}/contacts`, {
                    method: 'POST',
                    headers: brevoHeaders,
                    body: JSON.stringify({
                        email: email,
                        listIds: [listId],
                        updateEnabled: true // Important: Update if exists (e.g. add to this new list)
                    })
                });

                // If 201 or 204, success.
                // If 400 (e.g. invalid email), we just ignore this contact to not break the campaign.
                if (!res.ok) {
                    const errText = await res.text();
                    console.warn(`Failed to add contact ${email}: ${errText}`);
                }
            } catch (e) {
                console.error(`Error adding contact ${email}`, e);
            }
        }));

        // D. Create Campaign
        const today = new Date().toISOString().split('T')[0];
        const campaignName = `[${brandName}] ${subject.substring(0, 20)}... (${today})`;

        const campaignPayload = {
            name: campaignName,
            subject: subject,
            sender: sender, // { name: "...", email: "..." }
            replyTo: replyTo, // User's real email for responses
            type: "classic",
            htmlContent: htmlContent,
            recipients: { listIds: [listId] }
            // tag: brandId // Removed: User plan does not support campaign tags
        };

        const campaignRes = await fetch(`${BREVO_API_URL}/emailCampaigns`, {
            method: 'POST',
            headers: brevoHeaders,
            body: JSON.stringify(campaignPayload)
        });

        if (!campaignRes.ok) {
            const err = await campaignRes.json();
            throw new Error(`Failed to create campaign: ${JSON.stringify(err)}`);
        }
        const campaignData = await campaignRes.json();
        console.log('Campaign Created:', JSON.stringify(campaignData)); // DEBUG
        const campaignId = campaignData.id;

        // E. Schedule or Send
        let finalStatus = 'draft';

        console.log('Processing Schedule/Send:', { campaignId, scheduledAt, type: typeof scheduledAt }); // DEBUG

        if (scheduledAt) {
            // Schedule
            const scheduleUrl = `${BREVO_API_URL}/emailCampaigns/${campaignId}/schedule`;
            console.log('Attempting Schedule:', scheduleUrl); // DEBUG

            const scheduleRes = await fetch(scheduleUrl, {
                method: 'POST',
                headers: brevoHeaders,
                body: JSON.stringify({ scheduledAt: scheduledAt })
            });
            if (!scheduleRes.ok) {
                const err = await scheduleRes.json();
                throw new Error(`Failed to schedule campaign: ${JSON.stringify(err)}`);
            }
            finalStatus = 'scheduled';
        } else {
            // Send Now
            const sendRes = await fetch(`${BREVO_API_URL}/emailCampaigns/${campaignId}/sendNow`, {
                method: 'POST',
                headers: brevoHeaders
            });
            if (!sendRes.ok) {
                const err = await sendRes.json();
                throw new Error(`Failed to send campaign: ${JSON.stringify(err)}`);
            }
            finalStatus = 'sent';
        }

        return new Response(
            JSON.stringify({ success: true, campaignId, listId, status: finalStatus }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        // Return 200 with error details to bypass client-side 400 masking
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
