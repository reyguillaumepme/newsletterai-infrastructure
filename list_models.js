
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Read API Key manually
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = '';
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
    if (match) {
        apiKey = match[1].trim();
    }
} catch (e) {
    process.exit(1);
}

const run = async () => {
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.list();
        console.log("Full Response Keys:", Object.keys(response));
        console.log("Response:", JSON.stringify(response, null, 2));
    } catch (error) {
        console.error(error);
    }
};

run();
