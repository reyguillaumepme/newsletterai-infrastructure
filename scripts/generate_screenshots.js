
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.join(__dirname, '../public/tutorial');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    console.log('Starting screenshot generation...');
    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        defaultViewport: { width: 1440, height: 1024 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Helper to take screenshot
    const takeScreenshot = async (name) => {
        // Wait for animations to settle
        await delay(1000);
        const filePath = path.join(OUTPUT_DIR, `${name}.png`);
        await page.screenshot({ path: filePath });
        console.log(`Saved screenshot: ${name}.png`);
    };

    // Helper to type in Quill editor
    const typeInQuill = async (selector, text) => {
        await page.click(selector);
        await page.keyboard.type(text);
    };

    try {
        // --- 1. Login / Signup ---
        console.log('Navigating to Auth...');
        await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle0' });

        // Switch to Sign Up
        console.log('Switching to Sign Up...');
        // Find the button with text "Inscription"
        const buttons = await page.$$('button');
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Inscription')) {
                await btn.click();
                break;
            }
        }

        await delay(500);
        // Take screenshot of Signup page
        await takeScreenshot('01_signup');

        // Fill Sign Up Form
        const uniqueId = Date.now();
        const email = `tuto_${uniqueId}@example.com`;
        const password = 'Password123!';

        console.log(`Signing up as ${email}...`);
        await page.waitForSelector('input[type="email"]', { visible: true, timeout: 5000 });
        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', password);
        // Determine which input is the confirm password (it's the second password input)
        const passwordInputs = await page.$$('input[type="password"]');
        if (passwordInputs.length > 1) {
            await passwordInputs[1].type(password);
        }

        await delay(500);
        // Submit
        const submitBtn = await page.$('button[type="submit"]');
        await submitBtn.click();

        // Wait for navigation/login success
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
        } catch (e) {
            // sometimes navigation happens via client side routing without full reload
            await delay(2000);
        }

        // Check if "Compte créé avec succès" is visible or if we need to switch to Login tab
        console.log('Logging in...');
        // Ensure we are on login tab
        const loginButtons = await page.$$('button');
        for (const btn of loginButtons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Connexion')) {
                await btn.click();
                break;
            }
        }

        await delay(500);
        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', password);
        await delay(500);

        const loginSubmitBtn = await page.$('button[type="submit"]');
        await loginSubmitBtn.click();

        await delay(3000); // Wait for dashboard load

        await takeScreenshot('02_dashboard');


        // --- 2. Create Brand ---
        console.log('Navigating to Brands...');
        await page.goto(`${BASE_URL}/brands`, { waitUntil: 'networkidle0' });
        await delay(1000);
        await takeScreenshot('03_brands_list_empty');

        console.log('Creating Brand...');
        // Click "Nouvelle marque"
        const newBrandBtns = await page.$$('button');
        let createBrandBtn;
        for (const btn of newBrandBtns) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Nouvelle marque')) {
                createBrandBtn = btn;
                break;
            }
        }
        await createBrandBtn.click();
        await delay(500);
        await takeScreenshot('04_create_brand_modal');

        // Fill Brand Form
        await page.waitForSelector('input[placeholder="Ex: AI Trends Weekly"]', { visible: true, timeout: 5000 });
        await page.type('input[placeholder="Ex: AI Trends Weekly"]', 'TechDaily');
        await page.type('input[placeholder="Ex: Entrepreneurs, CTOs"]', 'Passionnés de Tech');
        await page.type('input[placeholder="Ex: Expert, minimaliste et visionnaire"]', 'Inspirant et informatif');
        await page.type('textarea', 'Une newsletter quotidienne sur les dernières innovations technologiques.');

        await takeScreenshot('05_create_brand_filled');

        // Submit
        const brandSubmitBtns = await page.$$('button[type="submit"]');
        // The modal submit is likely the last one or visible one.
        await brandSubmitBtns[brandSubmitBtns.length - 1].click();

        await delay(2000);
        await takeScreenshot('06_brands_list_populated');


        // --- 3. Create Idea ---
        console.log('Navigating to Ideas...');
        await page.goto(`${BASE_URL}/ideas`, { waitUntil: 'networkidle0' });
        await delay(1000);

        console.log('Creating Idea...');
        // Click "Nouveau Concept"
        const newIdeaBtns = await page.$$('button');
        let createIdeaBtn;
        for (const btn of newIdeaBtns) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Nouveau Concept')) {
                createIdeaBtn = btn;
                break;
            }
        }
        await createIdeaBtn.click();
        await delay(1000); // Wait for modal animation

        // We are now in the Idea Editor Modal (based on Ideas.tsx, it opens a full screen modal)
        await takeScreenshot('07_create_idea_modal');

        // Fill Title
        await page.type('input[placeholder="Titre de l\'idée..."]', 'Les futurs de l\'IA générative');

        // Fill Content (Quill)
        await page.click('.ql-editor');
        await page.keyboard.type('L\'IA générative transforme notre façon de travailler. Voici les 3 tendances à suivre cette année...');

        await takeScreenshot('08_create_idea_content');

        // Save
        const saveIdeaBtns = await page.$$('button');
        let saveIdeaBtn;
        for (const btn of saveIdeaBtns) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Enregistrer le concept')) {
                saveIdeaBtn = btn;
                break;
            }
        }
        await saveIdeaBtn.click();
        await delay(2000);
        await takeScreenshot('09_ideas_list_populated');


        // --- 4. Create Newsletter ---
        console.log('Navigating to Newsletters...');
        await page.goto(`${BASE_URL}/newsletters`, { waitUntil: 'networkidle0' });
        await delay(1000);

        console.log('Creating Newsletter...');
        const newNlBtns = await page.$$('button');
        let createNlBtn;
        for (const btn of newNlBtns) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Nouvelle Newsletter')) {
                createNlBtn = btn;
                break;
            }
        }
        await createNlBtn.click();
        // This navigates to /newsletters/new
        await delay(2000);

        // Modal Select Brand and Title
        await takeScreenshot('10_create_newsletter_modal');

        await page.type('input[placeholder="Sujet de la newsletter"]', 'Édition Spéciale : Le Futur de la Tech');

        const startCreationBtns = await page.$$('button');
        let startBtn;
        for (const btn of startCreationBtns) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Commencer la rédaction')) {
                startBtn = btn;
                break;
            }
        }
        if (startBtn) await startBtn.click();

        await delay(3000);
        await takeScreenshot('11_newsletter_editor');

    } catch (error) {
        console.error('Error during automation:', error);
    } finally {
        await browser.close();
        console.log('Screenshots generated in public/tutorial');
    }
}

run();
