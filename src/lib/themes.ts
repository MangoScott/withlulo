export interface Theme {
    id: string;
    name: string;
    description: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
        surface: string;
    };
    fonts: {
        heading: string;
        body: string;
        url: string; // Google Fonts URL
    };
    borderRadius: string;
    stylePrompts: string; // Specific instructions for the AI
}

export const THEMES: Theme[] = [
    {
        id: 'modern',
        name: 'Lulo Modern',
        description: 'Friendly, clean, and trustworthy. Features soft shadows and rounded corners.',
        colors: {
            primary: '#F97316', // Orange
            secondary: '#3B82F6', // Blue
            background: '#FFFFFF',
            text: '#1F2937',
            surface: '#F3F4F6',
        },
        fonts: {
            heading: 'Inter',
            body: 'Inter',
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        },
        borderRadius: '12px',
        stylePrompts: `
            - Use a "Bento Grid" layout for feature sections.
            - Use soft, large drop shadows (box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08)).
            - Use pills/badges for tags using the primary color with 10% opacity background.
            - Buttons should be fully rounded or have large radius.
            - Navigation should be clean and sticky.
        `,
    },
    {
        id: 'swiss',
        name: 'Swiss Minimal',
        description: 'Bold, effective, and structured. High contrast with grid lines.',
        colors: {
            primary: '#000000', // Black
            secondary: '#FF3333', // Swiss Red
            background: '#FAFAFA',
            text: '#000000',
            surface: '#FFFFFF',
        },
        fonts: {
            heading: 'Archivo Black',
            body: 'Inter',
            url: 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;600&display=swap',
        },
        borderRadius: '0px',
        stylePrompts: `
            - Use visible grid lines or borders between sections.
            - Use MASSIVE typography for headings (5rem+).
            - No shadows. Use solid borders (border: 1px solid #000).
            - Buttons should be rectangular squares with no border radius.
            - Use plenty of whitespace.
            - Brutalist aesthetic.
        `,
    },
    {
        id: 'neon',
        name: 'Neon Dark',
        description: 'Futuristic, glowing, and dark. Glassmorphism and gradients.',
        colors: {
            primary: '#8B5CF6', // Violet
            secondary: '#06B6D4', // Cyan
            background: '#0F172A', // Slate 900
            text: '#F8FAFC',
            surface: '#1E293B',
        },
        fonts: {
            heading: 'Outfit',
            body: 'Outfit',
            url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap',
        },
        borderRadius: '24px',
        stylePrompts: `
            - DEFAULT TO DARK MODE. Background is dark.
            - Use Linear Gradients for text and button backgrounds.
            - Use Glassmorphism (backdrop-filter: blur(12px); background: rgba(255,255,255,0.05)).
            - Add subtle glowing effects to buttons (box-shadow: 0 0 20px theme-primary).
            - Use thin, high-tech borders (1px solid rgba(255,255,255,0.1)).
        `,
    },
];
