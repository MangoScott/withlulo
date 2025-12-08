export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getUserFromToken } from '@/lib/supabase-server';
import { handleCors, withCors, withAuth } from '@/lib/auth';

// GET /api/recordings - List user's recordings
export async function GET(request: NextRequest) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    return withAuth(request, async (req, userId) => {
        try {
            const supabase = createServerClient();
            const { searchParams } = new URL(req.url);
            const projectId = searchParams.get('project_id');
            const limit = parseInt(searchParams.get('limit') || '50');
            const offset = parseInt(searchParams.get('offset') || '0');

            let query = supabase
                .from('recordings')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (projectId) {
                query = query.eq('project_id', projectId);
            }

            const { data: recordings, error, count } = await query;

            if (error) {
                console.error('Error fetching recordings:', error);
                return withCors(NextResponse.json(
                    { error: 'Failed to fetch recordings' },
                    { status: 500 }
                ));
            }

            return withCors(NextResponse.json({
                recordings,
                total: count,
                limit,
                offset
            }));
        } catch (error) {
            console.error('Recordings error:', error);
            return withCors(NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            ));
        }
    });
}

// POST /api/recordings - Create new recording metadata
export async function POST(request: NextRequest) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    return withAuth(request, async (req, userId) => {
        try {
            const body = await req.json();
            const { title, description, project_id, webm_key, file_size_bytes, duration_seconds } = body;

            if (!title) {
                return withCors(NextResponse.json(
                    { error: 'Title is required' },
                    { status: 400 }
                ));
            }

            const supabase = createServerClient();

            const { data: recording, error } = await supabase
                .from('recordings')
                .insert({
                    user_id: userId,
                    title,
                    description: description || null,
                    project_id: project_id || null,
                    webm_key: webm_key || null,
                    file_size_bytes: file_size_bytes || null,
                    duration_seconds: duration_seconds || null,
                    status: (webm_key && webm_key !== 'null') ? 'processing' : (body.status || 'ready'),
                    is_public: false
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating recording:', error);
                return withCors(NextResponse.json(
                    { error: 'Failed to create recording' },
                    { status: 500 }
                ));
            }

            return withCors(NextResponse.json({ recording }, { status: 201 }));
        } catch (error) {
            console.error('Create recording error:', error);
            return withCors(NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            ));
        }
    });
}

export async function OPTIONS(request: NextRequest) {
    return handleCors(request) || new NextResponse(null, { status: 204 });
}
