export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { handleCors, withCors } from '@/lib/auth';

// GET /api/auth/me - Get current user
export async function GET(request: NextRequest) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader?.startsWith('Bearer ')) {
            return withCors(NextResponse.json({ user: null }, { status: 200 }));
        }

        const token = authHeader.substring(7);
        const supabase = createServerClient();

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return withCors(NextResponse.json({ user: null }, { status: 200 }));
        }

        // Get profile data
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        return withCors(NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                ...profile
            }
        }));
    } catch (error) {
        console.error('Auth error:', error);
        return withCors(NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        ));
    }
}

export async function OPTIONS(request: NextRequest) {
    return handleCors(request) || new NextResponse(null, { status: 204 });
}
