export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { ensureProfile, handleCors, withCors } from '@/lib/auth';

// POST /api/auth/callback - Handle OAuth callback
export async function POST(request: NextRequest) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    try {
        const { access_token, refresh_token } = await request.json();

        if (!access_token) {
            return withCors(NextResponse.json(
                { error: 'Missing access token' },
                { status: 400 }
            ));
        }

        const supabase = createServerClient();

        // Set session from tokens
        const { data: { user }, error } = await supabase.auth.getUser(access_token);

        if (error || !user) {
            return withCors(NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            ));
        }

        // Ensure profile exists
        const profile = await ensureProfile(
            user.id,
            user.email || '',
            user.user_metadata?.full_name || user.user_metadata?.name,
            user.user_metadata?.avatar_url || user.user_metadata?.picture
        );

        return withCors(NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                ...profile
            },
            access_token,
            refresh_token
        }));
    } catch (error) {
        console.error('Callback error:', error);
        return withCors(NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        ));
    }
}

export async function OPTIONS(request: NextRequest) {
    return handleCors(request) || new NextResponse(null, { status: 204 });
}
