export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { handleCors, withCors, withAuth } from '@/lib/auth';

// GET /api/conversations - List user's conversations
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
                .from('conversations')
                .select('*, messages(count)')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (projectId) {
                query = query.eq('project_id', projectId);
            }

            const { data: conversations, error } = await query;

            if (error) {
                console.error('Error fetching conversations:', error);
                return withCors(NextResponse.json(
                    { error: 'Failed to fetch conversations' },
                    { status: 500 }
                ));
            }

            return withCors(NextResponse.json({ conversations }));
        } catch (error) {
            console.error('Conversations error:', error);
            return withCors(NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            ));
        }
    });
}

// POST /api/conversations - Create new conversation or sync from extension
export async function POST(request: NextRequest) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    return withAuth(request, async (req, userId) => {
        try {
            const body = await req.json();
            const { title, project_id, messages, external_id } = body;

            const supabase = createServerClient();

            // Check if syncing existing conversation by external ID
            if (external_id) {
                const { data: existing } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('id', external_id)
                    .single();

                if (existing) {
                    // Conversation exists, just add new messages
                    if (messages && messages.length > 0) {
                        const messagesToInsert = messages.map((msg: { role: string; content: string; images?: string[] }) => ({
                            conversation_id: existing.id,
                            role: msg.role,
                            content: msg.content,
                            images: msg.images || null
                        }));

                        await supabase
                            .from('messages')
                            .insert(messagesToInsert);

                        await supabase
                            .from('conversations')
                            .update({ updated_at: new Date().toISOString() })
                            .eq('id', existing.id);
                    }

                    return withCors(NextResponse.json({
                        conversation: existing,
                        synced: true
                    }));
                }
            }

            // Create new conversation
            const { data: conversation, error } = await supabase
                .from('conversations')
                .insert({
                    user_id: userId,
                    title: title || 'New Conversation',
                    project_id: project_id || null
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating conversation:', error);
                return withCors(NextResponse.json(
                    { error: 'Failed to create conversation' },
                    { status: 500 }
                ));
            }

            // Add initial messages if provided
            if (messages && messages.length > 0) {
                const messagesToInsert = messages.map((msg: { role: string; content: string; images?: string[] }) => ({
                    conversation_id: conversation.id,
                    role: msg.role,
                    content: msg.content,
                    images: msg.images || null
                }));

                await supabase
                    .from('messages')
                    .insert(messagesToInsert);
            }

            return withCors(NextResponse.json({ conversation }, { status: 201 }));
        } catch (error) {
            console.error('Create conversation error:', error);
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
