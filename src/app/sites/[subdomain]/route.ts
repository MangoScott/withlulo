import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: { subdomain: string } }) {
    const subdomain = params.subdomain;
    console.log('[Sites Route] Looking up subdomain:', subdomain);

    if (!subdomain) {
        return new NextResponse('Subdomain not found', { status: 404 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return new NextResponse('Configuration Error: Missing Supabase keys', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check subdomain first, then fall back to slug for backwards compatibility
    let { data: site, error } = await supabase
        .from('sites')
        .select('html_content, css_content, title')
        .eq('subdomain', subdomain)
        .single();

    // Fallback: try matching by slug if subdomain not found
    if (!site || error) {
        const slugResult = await supabase
            .from('sites')
            .select('html_content, css_content, title')
            .eq('slug', subdomain)
            .single();
        site = slugResult.data;
        error = slugResult.error;
    }

    if (error || !site) {
        return new NextResponse(`Site not found for subdomain: ${subdomain}`, { status: 404 });
    }

    let html = site.html_content || '';
    const css = site.css_content || '';
    const title = site.title || 'My Site';

    // Check if full HTML document
    if (!html.toLowerCase().includes('<html')) {
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        ${css}
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
    } else {
        // Inject CSS if needed
        if (css) {
            if (html.includes('</head>')) {
                html = html.replace('</head>', `<style>${css}</style></head>`);
            } else {
                html = `<style>${css}</style>` + html;
            }
        }
    }

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
            // Cache for a bit for performance
            'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300'
        },
    });
}
