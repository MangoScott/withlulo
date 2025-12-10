import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getUserFromToken } from '@/lib/supabase-server';

export const runtime = 'edge';
import { generateSite } from '@/lib/siteGenerator';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/sites/[id] - Get single site
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request.headers.get('authorization'));

        const supabase = createServerClient();

        // Try to get site - if user is authenticated, get their site; otherwise get public site
        let query = supabase.from('sites').select('*').eq('id', id);

        if (user) {
            // User can get their own sites (published or not)
            query = query.eq('user_id', user.id);
        } else {
            // Non-authenticated users can only see published sites
            query = query.eq('published', true);
        }

        const { data: site, error } = await query.single();

        if (error || !site) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        return NextResponse.json({ site });
    } catch (error) {
        console.error('Site GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/sites/[id] - Update site
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request.headers.get('authorization'));
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, published, shouldRegenerate, businessType, theme, profileImage, fileData, mimeType, subdomain } = body;

        const supabase = createServerClient();

        // Build update object
        const updates: Record<string, unknown> = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (published !== undefined) updates.published = published;
        if (businessType !== undefined) updates.business_type = businessType;
        if (theme !== undefined) updates.theme = theme;

        // Validate and update subdomain if provided
        if (subdomain !== undefined) {
            const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
            if (cleanSubdomain.length < 3) {
                return NextResponse.json({ error: 'Subdomain must be at least 3 chars' }, { status: 400 });
            }
            updates.subdomain = cleanSubdomain;
        }

        // If regeneration is requested, run the AI
        if (shouldRegenerate && description && businessType) {
            try {
                const generated = await generateSite({
                    title: title || 'My Website', // Fallback if not provided, though it should be
                    description,
                    businessType,
                    theme,
                    fileData,
                    mimeType,
                    profileImage
                });

                updates.html_content = generated.html;
                updates.css_content = generated.css;
            } catch (genError) {
                console.error('Generation failed during update:', genError);
                return NextResponse.json({ error: 'Failed to regenerate site content' }, { status: 500 });
            }
        }

        const { data: site, error } = await supabase
            .from('sites')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating site:', error);
            return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
        }

        if (!site) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        return NextResponse.json({ site });
    } catch (error) {
        console.error('Site PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/sites/[id] - Delete site
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request.headers.get('authorization'));
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerClient();
        const { error } = await supabase
            .from('sites')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting site:', error);
            return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Site DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
