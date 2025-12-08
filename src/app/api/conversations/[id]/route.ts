export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { handleCors, withCors, withAuth } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - Get conversation with messages
export async function GET(request: NextRequest, { params }: RouteParams) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;

    return withAuth(request, async (req, userId) => {
        try {
            const supabase = createServerClient();

            const { data: conversation, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    messages (
                        id,
                        role,
                        content,
                        images,
                        metadata,
                        created_at
                    )
                `)
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error || !conversation) {
                return withCors(NextResponse.json(
                    { error: 'Conversation not found' },
                    { status: 404 }
                ));
            }

            // Sort messages by created_at
            if (conversation.messages) {
                conversation.messages.sort((a: { created_at: string }, b: { created_at: string }) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
            }

            return withCors(NextResponse.json({ conversation }));
        } catch (error) {
            console.error('Get conversation error:', error);
            return withCors(NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            ));
        }
    });
}

// PATCH /api/conversations/[id] - Update conversation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;

    return withAuth(request, async (req, userId) => {
        try {
            const body = await req.json();
            const { title, project_id } = body;

            const supabase = createServerClient();

            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (title !== undefined) updates.title = title;
            if (project_id !== undefined) updates.project_id = project_id;

            const { data: conversation, error } = await supabase
                .from('conversations')
                .update(updates)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error || !conversation) {
                return withCors(NextResponse.json(
                    { error: 'Conversation not found' },
                    { status: 404 }
                ));
            }

            return withCors(NextResponse.json({ conversation }));
        } catch (error) {
            console.error('Update conversation error:', error);
            return withCors(NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            ));
        }
    });
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;

    return withAuth(request, async (req, userId) => {
        try {
            const supabase = createServerClient();

            // Messages will be cascade deleted
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) {
                return withCors(NextResponse.json(
                    { error: 'Failed to delete conversation' },
                    { status: 500 }
                ));
            }

            return withCors(NextResponse.json({ success: true }));
        } catch (error) {
            console.error('Delete conversation error:', error);
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
