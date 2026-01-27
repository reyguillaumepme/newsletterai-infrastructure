
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Set GOOGLE_APPLICATION_CREDENTIALS for this process
const credentialsPath = path.resolve(process.cwd(), 'service-account.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

console.log("Using credentials from:", credentialsPath);

const run = async () => {
    // With GOOGLE_APPLICATION_CREDENTIALS set, we don't need apiKey to use Vertex AI
    // We just initialize with project and location if needed, or let ADC handle it.
    // NOTE: The node SDK uses ADC automatically if no key is provided? 
    // Let's try explicit Vertex config.

    console.log("Testing Vertex AI Mode (Service Account) for Imagen 3...");

    const client = new GoogleGenAI({
        vertexai: true,
        project: 'newsletteria-484209',
        location: 'us-central1',
        // No apiKey here! Authentication should come from GOOGLE_APPLICATION_CREDENTIALS
    });

    try {
        console.log("Attempting to generate image with model: imagen-3.0-generate-001");
        const response = await client.models.generateImages({
            model: "imagen-3.0-generate-001",
            prompt: "A futuristic city with flying cars, photorealistic, 4k",
            config: {
                numberOfImages: 1,
            }
        });

        console.log("Response received!");
        console.log(JSON.stringify(response, null, 2));

    } catch (error) {
        console.error("Vertex AI Mode Failed.");
        console.error(error);
    }
};

run();
