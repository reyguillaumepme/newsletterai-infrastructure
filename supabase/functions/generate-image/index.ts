// Deno.serve is native in Supabase Edge Runtime


/*
  Helper to sign JWT for Google Service Account (Vertex AI)
  This avoids massive Node.js dependencies in Deno/Edge Runtime.
*/
async function getAccessToken(serviceAccount: any) {
    const pem = serviceAccount.private_key;
    const clientEmail = serviceAccount.client_email;

    // Header
    const header = {
        alg: "RS256",
        typ: "JWT",
    };

    // Claim Set
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
    };

    // Encode
    const b64Header = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const b64Claim = btoa(JSON.stringify(claimSet)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signInput = b64Header + "." + b64Claim;

    // Sign using Web Crypto API
    const pemContents = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\s/g, "");
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        new TextEncoder().encode(signInput)
    );

    const b64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

    const jwt = signInput + "." + b64Signature;

    // Exchange JWT for Access Token
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResp.json();
    return tokenData.access_token;
}

// ... imports ...

// ... getAccessToken helper ...

Deno.serve(async (req) => {
    // ... CORS ...
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const { prompt, aspectRatio = "1:1", model = "imagen-3.0-generate-001" } = await req.json();

        if (!prompt) throw new Error("Prompt is required");

        // LOAD SECRETS
        const serviceAccountStr = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
        if (!serviceAccountStr) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON secret");
        const serviceAccount = JSON.parse(serviceAccountStr);
        const projectId = serviceAccount.project_id;
        const location = "us-central1";

        const accessToken = await getAccessToken(serviceAccount);
        if (!accessToken) throw new Error("Failed to get Google Access Token");

        let endpoint, body, method;

        // GESTION GEMINI (Flash 2.0 / 2.5) for Image Generation
        if (model.includes("gemini")) {
            // Vertex AI Gemini Endpoint
            endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

            body = JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseModalities: ["IMAGE"]
                }
            });
        }
        // GESTION IMAGEN (Default)
        else {
            // Vertex AI Imagen Endpoint
            endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;

            body = JSON.stringify({
                instances: [{ prompt: prompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: aspectRatio
                }
            });
        }

        console.log(`Generating image with model: ${model}`);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json; charset=utf-8",
            },
            body: body
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Vertex AI Error:", errorText);
            throw new Error(`Vertex AI Error (${model}): ${errorText}`);
        }

        const data = await response.json();
        let base64Image;

        // PARSING REPONSE
        if (model.includes("gemini")) {
            // Gemini Response: candidates[0].content.parts[0].inlineData.data
            // or sometimes executableCode if rejected?
            const part = data.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData?.data) {
                base64Image = part.inlineData.data;
            }
        } else {
            // Imagen Response
            base64Image = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0];
        }

        if (!base64Image) {
            console.error("Full Response:", JSON.stringify(data, null, 2));
            throw new Error("No image data in response");
        }

        return new Response(
            JSON.stringify({ image: base64Image }),
            { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
    }
});
