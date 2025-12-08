export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { handleCors, withCors, withAuth } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/conversations/[id]/messages - Add messages to conversation
export async function POST(request: NextRequest, { params }: RouteParams) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;

    return withAuth(request, async (req, userId) => {
        try {
            const body = await req.json();
            const { messages } = body;

            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                return withCors(NextResponse.json(
                    { error: 'Messages array is required' },
                    { status: 400 }
                ));
            }

            const supabase = createServerClient();

            // Verify conversation belongs to user
            const { data: conversation } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (!conversation) {
                return withCors(NextResponse.json(
                    { error: 'Conversation not found' },
                    { status: 404 }
                ));
            }

            // Insert messages
            const messagesToInsert = messages.map((msg: {
                role: string;
                content: string;
                images?: string[];
                metadata?: Record<string, unknown>;
            }) => ({
                conversation_id: id,
                role: msg.role,
                content: msg.content,
                images: msg.images || null,
                metadata: msg.metadata || null
            }));

            const { data: insertedMessages, error } = await supabase
                .from('messages')
                .insert(messagesToInsert)
                .select();

            if (error) {
                console.error('Error inserting messages:', error);
                return withCors(NextResponse.json(
                    { error: 'Failed to add messages' },
                    { status: 500 }
                ));
            }

            // Update conversation timestamp
            await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', id);

            // Auto-generate title from first user message if conversation has no title
            const { data: convo } = await supabase
                .from('conversations')
                .select('title')
                .eq('id', id)
                .single();

            if (convo?.title === 'New Conversation' || !convo?.title) {
                const userMessage = messages.find((m: { role: string }) => m.role === 'user');
                if (userMessage) {
                    const autoTitle = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
                    await supabase
                        .from('conversations')
                        .update({ title: autoTitle })
                        .eq('id', id);
                }
            }

            return withCors(NextResponse.json({
                messages: insertedMessages,
                count: insertedMessages?.length || 0
            }, { status: 201 }));
        } catch (error) {
            console.error('Add messages error:', error);
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
