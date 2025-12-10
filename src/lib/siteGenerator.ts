import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireEnv } from './env-server';

export interface SiteGenerationInput {
    title: string;
    description: string;
    businessType: string;
    theme?: string;
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
    const accentColor = input.theme || '#3B82F6'; // Default to Blue

    // 1. PERSONAL WEBSITE
    if (type === 'personal') {
        const name = data.name || input.title;
        const about = data.about || input.description;
        const social1 = data.social1 ? `- Link: ${data.social1}` : '';
        const social2 = data.social2 ? `- Link: ${data.social2}` : '';
        const imgParams = input.profileImage ? `USE THIS EXACT IMAGE SOURCE FOR THE PROFILE PHOTO: "${input.profileImage}"` : `Use a placeholder profile image from ui-avatars.com`;

        return `${basePrompt}
        CONTENT:
        - Name: "${name}"
        - About Me: "${about}"
        - Social Links: ${social1} ${social2}
        
        STYLE: Clean, minimalist, premium. 
        ACCENT COLOR: ${accentColor}.
        BACKGROUND: White (#ffffff).
        TYPOGRAPHY: 'Inter', sans-serif.
        
        LAYOUT REQUIREMENTS:
        - Desktop: Horizontal Navbar.
        - Mobile: CRITICAL: You MUST implement a functional Hamburger Menu for the navigation. 
          - The inputs are checkboxes or simple JS toggles.
          - When closed: Show Hamburger Icon (☰).
          - When open: Show Fullscreen or Dropdown Menu.
        
        STRUCTURE:
        - Header: Name (Left) + Nav [About, Contact] (Right/Hamburger).
        - Hero: centered or split. "Hi, I'm ${name.split(' ')[0]}". Large modern typography.
        - Profile Image: ${imgParams} (Rounded and prominent).
        - Bio Section: Elegant typography, generous whitespace.
        - Social Section: Minimalist icon buttons.
        - Contact: "Get in Touch" button using the accent color.
        `;
    }

    // 2. BIO CARD (LinkTree style)
    if (type === 'bio-card') {
        const handle = data.handle || input.title;
        const bio = data.bio || input.description;
        const links = data.links || "Portfolio | #\nTwitter | #";
        const imgParams = input.profileImage ? `USE THIS EXACT IMAGE SOURCE FOR THE AVATAR: "${input.profileImage}"` : `Use https://ui-avatars.com/api/?name=${encodeURIComponent(handle)}&background=random`;

        return `${basePrompt}
        CONTENT:
        - Handle: "${handle}"
        - Bio: "${bio}"
        - Links: \n${links}
        
        STYLE: Modern, mobile-first, centered card layout.
        ACCENT COLOR: ${accentColor}.
        BACKGROUND: Soft gradient using the accent color (very light opacity).
        
        STRUCTURE:
        - Container: Centered Card (max-width 480px) with drop shadow.
        - Avatar: Circle Image (100x100). ${imgParams}
        - Name: H1 Centered.
        - Bio: Small text under name, muted color.
        - Links: Stack of full-width buttons. Background: ${accentColor}, Text: White. Hover effects.
        `;
    }

    // 3. SMALL BUSINESS
    if (type === 'business') {
        const busName = data.businessName || input.title;
        const tagline = data.tagline || "";
        const services = data.services || input.description;
        const email = data.email || "";

        return `${basePrompt}
        CONTENT:
        - Business Name: "${busName}"
        - Tagline: "${tagline}"
        - Services: "${services}"
        - Contact: "${email}"
        
        STYLE: Trustworthy, corporate but modern.
        ACCENT COLOR: ${accentColor}.
        STRUCTURE:
        - Navbar: Logo + Contact Button
        - Hero: Headline "${busName}", Subhead "${tagline}". high-quality background (unsplash).
        - Services Grid: 3-item grid. Icons using the accent color.
        - Testimonials: ONE placeholder testimonial.
        - Contact: Footer with email link.
        `;
    }

    return `${basePrompt} Description: "${input.description}"`;
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
        // Check LULO_GEMINI_KEY first (to bypass potential naming conflicts)
        apiKey = process.env.LULO_GEMINI_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Try via getRequestContext
            try {
                apiKey = requireEnv('LULO_GEMINI_KEY');
            } catch {
                apiKey = requireEnv('GEMINI_API_KEY');
            }
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
    - Use 'DM Sans' or 'Inter' from Google Fonts.
    - Ensure fully responsive mobile design.
    - Use generous whitespace and rounded corners.
    - Button styles should be modern (no default borders).
    - **CRITICAL**: You MUST use the provided ACCENT COLOR (${input.theme || '#3B82F6'}) for all main buttons, links, and highlights. Do NOT use a random color. Define a CSS variable: --accent: ${input.theme || '#3B82F6'}; and use it.

    OUTPUT FORMAT:
    Return ONLY valid JSON with this exact structure:
    {"html": "<full html content>", "css": "<full css content>"}
    
    The HTML should start with <!DOCTYPE html> and include <style> with CSS in the <head>.
    Do NOT include any explanations.`;

    let parts: any[] = [promptText];

    // Add file data if present
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

    // Parse the JSON response
    let parsed: { html: string; css: string };
    try {
        // Try to extract JSON if wrapped in code blocks
        let jsonText = text;
        if (text.includes('```')) {
            const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) {
                jsonText = match[1].trim();
            }
        }
        parsed = JSON.parse(jsonText);
    } catch (e) {
        console.error('Failed to parse AI response:', text);
        throw new Error('Failed to generate site: Invalid response format');
    }

    if (!parsed.html || typeof parsed.html !== 'string') {
        throw new Error('Failed to generate site: Missing HTML content');
    }

    return {
        html: parsed.html,
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
