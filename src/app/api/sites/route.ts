import { NextRequest, NextResponse } from 'next/server';
import { Site } from '@/lib/supabase';
import { createServerClient, getUserFromToken } from '@/lib/supabase-server';

export const runtime = 'edge';
import { generateSite, generateSlug } from '@/lib/siteGenerator';

// GET /api/sites - List user's sites
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromToken(request.headers.get('authorization'));
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerClient();
        const { data: sites, error } = await supabase
            .from('sites')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching sites:', error);
            return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
        }

        return NextResponse.json({ sites: sites || [] });
    } catch (error) {
        console.error('Sites GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/sites - Create new site with AI generation
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request.headers.get('authorization'));
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        let { title, description, businessType, theme, customColor, fileData, mimeType, profileImage, subdomain } = body;

        // Auto-use profile picture from auth provider if not provided
        if (!profileImage && user.user_metadata?.avatar_url) {
            profileImage = user.user_metadata.avatar_url;
        }

        if (!title || !description || !businessType || !subdomain) {
            return NextResponse.json(
                { error: 'Missing required fields: title, description, businessType, subdomain' },
                { status: 400 }
            );
        }

        // Validate Subdomain
        const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (cleanSubdomain.length < 3 || cleanSubdomain !== subdomain.toLowerCase()) {
            return NextResponse.json({ error: 'Subdomain must be lowercase alphanumeric (min 3 chars)' }, { status: 400 });
        }

        // Check availability (Optional: Rely on DB constraint constraint for now, or pre-check)
        // Leaving it to DB Unique Exception handling is simpler but less user friendly.
        // We'll proceed and catch unique error.

        // Generate the site content with AI
        const generated = await generateSite({
            title,
            description,
            businessType,
            theme,
            customColor,
            fileData,
            mimeType,
            profileImage
        });

        // Create unique slug
        const slug = generateSlug(title);

        // Save to database
        const supabase = createServerClient();
        const { data: site, error } = await supabase
            .from('sites')
            .insert({
                user_id: user.id,
                slug,
                title,
                description,
                business_type: businessType,
                theme: theme || 'modern',
                html_content: generated.html,
                css_content: generated.css,
                published: false,
                subdomain: cleanSubdomain
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating site:', error);
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ error: 'Subdomain is already taken' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
        }

        return NextResponse.json({ site }, { status: 201 });
    } catch (error) {
        console.error('Sites POST error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
