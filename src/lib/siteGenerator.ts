import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireEnv } from './env-server';
import { THEMES } from './themes';

export interface SiteGenerationInput {
    title: string;
    description: string;
    businessType: string;
    theme?: string;
    customColor?: string; // NEW: Allow explicit hex override
    fileData?: string; // Base64
    mimeType?: string;
    profileImage?: string; // URL or Base64
}

export interface GeneratedSite {
    html: string;
    css: string;
}

const getPromptForType = (type: string, input: SiteGenerationInput): string => {
    // Attempt to parse structured data from description (packed by frontend)
    let data: any = {};
    let isStructured = false;
    try {
        const parsed = JSON.parse(input.description);
        if (parsed.fields) {
            data = parsed.fields;
            isStructured = true;
        }
    } catch (e) {
        // Fallback to raw description string
    }



    const basePrompt = `You are an expert web designer. Generate a single-page website.`;

    // Resolve Theme
    let selectedTheme = THEMES.find(t => t.id === input.theme);
    // Backward compatibility: If input.theme is a hex code (starts with #), use Modern but override color
    let customColor = null;
    if (!selectedTheme && input.theme && input.theme.startsWith('#')) {
        selectedTheme = THEMES.find(t => t.id === 'modern');
        customColor = input.theme;
    }
    // Default to Modern
    if (!selectedTheme) selectedTheme = THEMES[0];

    // Priority: Input Custom Color > Theme Default
    const primaryColor = input.customColor || customColor || selectedTheme.colors.primary;

    console.log('[SiteGenerator] Using Theme:', selectedTheme.name, 'Primary:', primaryColor);

    // Prompt Construction
    const themeInstructions = `
        DESIGN SYSTEM (${selectedTheme.name.toUpperCase()}):
        - Primary Color: ${primaryColor}
        - Font Heading: '${selectedTheme.fonts.heading}'
        - Font Body: '${selectedTheme.fonts.body}'
        - Border Radius: ${selectedTheme.borderRadius}
        - Style Rules: 
          ${selectedTheme.stylePrompts}
    `;

    // 1. PERSONAL WEBSITE
    if (type === 'personal') {
        const name = data.name || input.title;
        const about = data.about || input.description;
        const social1 = data.social1 ? `- Link: ${data.social1}` : '';
        const social2 = data.social2 ? `- Link: ${data.social2}` : '';
        const imgParams = input.profileImage ? `USE THIS EXACT IMAGE SOURCE FOR THE PROFILE PHOTO: "${input.profileImage}"` : `Use a placeholder profile image from ui-avatars.com`;

        return `${basePrompt}
        ${themeInstructions}

        CONTENT:
        - Name: "${name}"
        - About Me: "${about}"
        - Social Links: ${social1} ${social2}
        
        STRUCTURE (MODERN PORTFOLIO):
        - Navbar: Minimal. Name on left, Links on right.
        - Hero Section: SPLIT LAYOUT. Text on the Left ("Hi, I'm ${name.split(' ')[0]}"), Large Profile Image on the Right.
        - Stat/Grid Section: "What I Do" - 3 columns, clean icons.
        - Bio Section: Full width, elegant typography, generous whitespace.
        - Footer: Simple, centered.
        - Contact: "Get in Touch" button.
        
        MOBILE REQUIREMENTS:
        - Implement a functional Hamburger Menu for mobile.
        - Stack columns vertically on mobile.
        `;
    }

    // 2. BIO CARD (LinkTree style)
    if (type === 'bio-card') {
        const handle = data.handle || input.title;
        const bio = data.bio || input.description;
        const links = data.links || "Portfolio | #\nTwitter | #";
        const imgParams = input.profileImage ? `USE THIS EXACT IMAGE SOURCE FOR THE AVATAR: "${input.profileImage}"` : `Use https://ui-avatars.com/api/?name=${encodeURIComponent(handle)}&background=random`;

        return `${basePrompt}
        ${themeInstructions}

        CONTENT:
        - Handle: "${handle}"
        - Bio: "${bio}"
        - Links: \n${links}
        
        STRUCTURE:
        - Container: Centered Card (max-width 480px).
        - Avatar: Circle Image (100x100). ${imgParams}
        - Name: H1 Centered.
        - Bio: Small text under name.
        - Links: Stack of full-width buttons.
        `;
    }

    // 3. SMALL BUSINESS
    if (type === 'business') {
        const busName = data.businessName || input.title;
        const tagline = data.tagline || "";
        const services = data.services || input.description;
        const email = data.email || "";

        return `${basePrompt}
        ${themeInstructions}

        CONTENT:
        - Business Name: "${busName}"
        - Tagline: "${tagline}"
        - Services: "${services}"
        - Contact: "${email}"
        
        STRUCTURE:
        - Navbar: Logo + Contact Button
        - Hero: Headline "${busName}", Subhead "${tagline}".
        - Services Grid: 3-item grid.
        - Testimonials: ONE placeholder testimonial.
        - Contact: Footer with email link.
        `;
    }

    return `${basePrompt} ${themeInstructions} Description: "${input.description}"`;
};

export async function generateSite(input: SiteGenerationInput): Promise<GeneratedSite> {
    let apiKey: string | undefined;

    // Helper to get all env keys for debugging
    const getDebugKeys = () => {
        const keys = new Set<string>();
        if (typeof process !== 'undefined' && process.env) Object.keys(process.env).forEach(k => keys.add(k));
        try {
            const ctx = require('@cloudflare/next-on-pages').getRequestContext();
            if (ctx && ctx.env) Object.keys(ctx.env).forEach(k => keys.add(k));
        } catch (e) { /* ignore */ }
        return Array.from(keys).filter(k => !k.includes('KEY') && !k.includes('SECRET') || k.startsWith('NEXT_PUBLIC')); // Redact sensitive
    };

    try {
        // Try accessing directly from process.env first (Cloudflare sometimes puts it there directly)
        apiKey = process.env.LULO_GEMINI_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            try { apiKey = requireEnv('LULO_GEMINI_KEY'); } catch { apiKey = requireEnv('GEMINI_API_KEY'); }
        }
    } catch (e) {
        const availableKeys = getDebugKeys().join(', ');
        throw new Error(`Configuration Error: AI Key is missing. Checked LULO_GEMINI_KEY and GEMINI_API_KEY. Available env vars: [${availableKeys}]`);
    }

    if (!apiKey) {
        const availableKeys = getDebugKeys().join(', ');
        throw new Error(`Configuration Error: AI Key is missing. Checked LULO_GEMINI_KEY and GEMINI_API_KEY. Available env vars: [${availableKeys}]`);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Construct the full prompt
    const specificPrompt = getPromptForType(input.businessType, input);

    const promptText = `${specificPrompt}
    
    DESIGN REQUIREMENTS (CRITICAL):
    - Ensure fully responsive mobile design.
    - Use generous whitespace.
    - **CRITICAL**: 
      1. You MUST define CSS variables: --primary, --text, --background, --radius, --font-heading, --font-body.
      2. You MUST use these variables throughout the CSS.
      3. Wrap your CSS in a <style> block inside the HTML.
      4. DO NOT use markdown code blocks (\`\`\`) in your response. just return valid JSON.

    OUTPUT FORMAT:
    Return ONLY valid JSON with this exact structure:
    {"html": "<full html content>", "css": "<full css content>"}
    
    The HTML should start with <!DOCTYPE html> and include <style> with CSS in the <head>.
    Do NOT include any explanations.`;

    let parts: any[] = [promptText];

    if (input.fileData && input.mimeType) {
        parts.push({
            inlineData: {
                data: input.fileData,
                mimeType: input.mimeType
            }
        });
        parts.push("Use the attached file content to populate the website details (Experience, Bio, Service List, etc). Priority: File Content > Description.");
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    let parsed: { html: string; css: string };
    try {
        let jsonText = text.trim();
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        }
        parsed = JSON.parse(jsonText);
    } catch (e) {
        console.error('Failed to parse AI response:', text);
        const snippet = text.slice(0, 100).replace(/\n/g, ' ');
        throw new Error(`Failed to generate site: Invalid AI response. (${snippet}...)`);
    }

    if (!parsed.html || typeof parsed.html !== 'string') {
        throw new Error('Failed to generate site: Missing HTML content');
    }

    let selectedTheme = THEMES.find(t => t.id === input.theme);
    let customColor = null;
    if (!selectedTheme && input.theme && input.theme.startsWith('#')) {
        selectedTheme = THEMES.find(t => t.id === 'modern');
        customColor = input.theme;
    }
    if (!selectedTheme) selectedTheme = THEMES[0];
    const primaryColor = input.customColor || customColor || selectedTheme.colors.primary;

    const themeInjection = `
        <link rel="stylesheet" href="${selectedTheme.fonts.url}">
        <style>
            :root { 
                --primary: ${primaryColor} !important; 
                --background: ${selectedTheme.colors.background} !important;
                --text: ${selectedTheme.colors.text} !important;
                --button-text: ${selectedTheme.colors.buttonText} !important;
                --radius: ${selectedTheme.borderRadius} !important;
                --font-heading: '${selectedTheme.fonts.heading}', sans-serif !important;
                --font-body: '${selectedTheme.fonts.body}', sans-serif !important;
            }
            body { 
                font-family: var(--font-body); 
                background-color: var(--background); 
                color: var(--text); 
            }
            h1, h2, h3, h4, h5, h6 { 
                font-family: var(--font-heading); 
            }
            button, .btn, a.btn, [class*="button"], [class*="cta"] { 
                background-color: var(--primary) !important; 
                color: var(--button-text) !important;
                border-color: var(--primary) !important; 
                border-radius: var(--radius) !important;
            } 
            a:hover { color: var(--primary) !important; }
        </style>
    `;

    let finalHtml = parsed.html;
    if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', themeInjection + '</head>');
    } else if (finalHtml.includes('<body')) {
        finalHtml = finalHtml.replace('<body', themeInjection + '<body');
    } else {
        finalHtml = themeInjection + finalHtml;
    }

    console.log('[SiteGenerator] Injected theme override:', selectedTheme.name);

    return {
        html: finalHtml,
        css: parsed.css || ''
    };
}


// Generate a URL-safe slug from title
export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) + '-' + Math.random().toString(36).slice(2, 8);
}
