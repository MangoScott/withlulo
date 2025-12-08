import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireEnv } from './env-server';

export interface SiteGenerationInput {
    title: string;
    description: string;
    businessType: string;
    theme?: string;
}

export interface GeneratedSite {
    html: string;
    css: string;
}

const BUSINESS_TYPE_PROMPTS: Record<string, string> = {
    'coffee-shop': 'a cozy, artisanal coffee shop with warm browns and creams',
    'restaurant': 'an upscale restaurant with elegant typography and appetizing imagery',
    'portfolio': 'a creative portfolio showcasing work with bold, modern design',
    'startup': 'a tech startup with gradient backgrounds and dynamic energy',
    'agency': 'a professional agency with clean lines and corporate sophistication',
    'personal': 'a personal brand with friendly, approachable design',
    'ecommerce': 'an online store with product-focused clean layout',
    'fitness': 'a fitness brand with energetic colors and motivational feel',
    'real-estate': 'a real estate business with elegant, trustworthy design',
    'default': 'a modern, professional business'
};

export async function generateSite(input: SiteGenerationInput): Promise<GeneratedSite> {
    const apiKey = requireEnv('GEMINI_API_KEY');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const businessPrompt = BUSINESS_TYPE_PROMPTS[input.businessType] || BUSINESS_TYPE_PROMPTS['default'];

    const prompt = `You are an expert web designer creating a stunning, premium landing page. Generate a complete, beautiful landing page for:

**Business Name:** ${input.title}
**Description:** ${input.description}
**Style:** ${businessPrompt}

Create a single-page landing page with these sections:
1. **Hero Section** - Large headline, subheadline, and a call-to-action button
2. **Features/Services** - 3 key features or services in a grid
3. **About Section** - Brief about text
4. **Contact/CTA Section** - Final call-to-action with button

DESIGN REQUIREMENTS (CRITICAL - follow exactly):
- Use a warm cream background (#FFFBF7) as the base
- Primary accent color: #8B6DB8 (purple) for buttons and highlights
- Dark text: #2D2B3A for headlines, #5d5d6b for body text
- Typography: Use 'DM Sans' for headings (import from Google Fonts), system fonts for body
- Large, bold headlines (48-64px) with -0.02em letter-spacing
- Generous padding (80-100px vertical sections)
- Rounded corners on buttons (border-radius: 32px) and cards (border-radius: 24px)
- Subtle shadows: box-shadow: 0 4px 20px rgba(0,0,0,0.08)
- Smooth hover transitions (0.2s ease)
- Feature cards with #FFFFFF background on the cream base
- Mobile responsive using flexbox and max-width containers

BUTTON STYLES:
- Primary: background #2D2B3A, color white, padding 16px 32px, rounded
- Secondary: background white, border 1px solid #E8E4DE, color #2D2B3A

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{"html": "<full html content>", "css": "<full css content>"}

The HTML should be a complete webpage starting with <!DOCTYPE html> and including the <style> tag with all CSS inline in the head (for portability). The CSS field should contain the same CSS for reference.

Do NOT include any explanations - ONLY the JSON object.`;

    const result = await model.generateContent(prompt);
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
