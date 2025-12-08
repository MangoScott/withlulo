import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getUserFromToken } from './supabase-server';

// Auth middleware for API routes
export async function withAuth(
    request: NextRequest,
    handler: (request: NextRequest, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    return handler(request, user.id);
}

// Optional auth - continues even without auth but provides userId if available
export async function withOptionalAuth(
    request: NextRequest,
    handler: (request: NextRequest, userId: string | null) => Promise<NextResponse>
): Promise<NextResponse> {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    return handler(request, user?.id ?? null);
}

// Get or create profile for a new user
export async function ensureProfile(userId: string, email: string, name?: string, avatar?: string) {
    const supabase = createServerClient();

    // Check if profile exists
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

    if (existing) {
        return existing;
    }

    // Create new profile
    const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            email,
            display_name: name || email.split('@')[0],
            avatar_url: avatar || null
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating profile:', error);
        throw error;
    }

    // Create default project
    await supabase
        .from('projects')
        .insert({
            user_id: userId,
            name: 'General',
            is_default: true
        });

    return profile;
}

// Generate a short, unique share slug
export function generateShareSlug(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// CORS headers for extension requests
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // TODO: Restrict to extension ID in production
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Handle OPTIONS preflight
export function handleCors(request: NextRequest): NextResponse | null {
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: corsHeaders
        });
    }
    return null;
}

// Add CORS headers to response
export function withCors(response: NextResponse): NextResponse {
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}
