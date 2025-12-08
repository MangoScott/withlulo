import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getUserFromToken } from '@/lib/supabase-server';

export const runtime = 'edge';
import { generateSite } from '@/lib/siteGenerator';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/sites/[id]/regenerate - Regenerate site content with AI
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request.headers.get('authorization'));
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerClient();

        // Get existing site
        const { data: existingSite, error: fetchError } = await supabase
            .from('sites')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !existingSite) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        // Optionally get new parameters from request body
        const body = await request.json().catch(() => ({}));
        const title = body.title || existingSite.title;
        const description = body.description || existingSite.description;
        const businessType = body.businessType || existingSite.business_type;

        // Regenerate content
        const generated = await generateSite({
            title,
            description,
            businessType,
            theme: existingSite.theme
        });

        // Update site with new content
        const { data: site, error: updateError } = await supabase
            .from('sites')
            .update({
                html_content: generated.html,
                css_content: generated.css,
                title,
                description,
                business_type: businessType
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating site:', updateError);
            return NextResponse.json({ error: 'Failed to regenerate site' }, { status: 500 });
        }

        return NextResponse.json({ site });
    } catch (error) {
        console.error('Site regenerate error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
