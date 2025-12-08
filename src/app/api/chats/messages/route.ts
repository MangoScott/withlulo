import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }); // or whichever model we prefer for chat

export const POST = async (request: NextRequest) => {
    return withAuth(request, async (req, userId) => {
        try {
            const { conversationId, content } = await request.json();

            if (!conversationId || !content) {
                return NextResponse.json({ error: 'Missing conversationId or content' }, { status: 400 });
            }

            const supabase = createServerClient();

            // 1. Verify Ownership / Existence
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .eq('user_id', userId)
                .single();

            if (convError || !conversation) {
                return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
            }

            // 2. Save User Message
            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    role: 'user',
                    content: content
                });

            if (msgError) throw msgError;

            // 3. Get History for Context (Last 10 messages)
            const { data: history } = await supabase
                .from('messages')
                .select('role, content')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true }); // We need chronological order for AI

            // 4. Generate AI Response
            const chat = model.startChat({
                history: history?.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                })) || []
            });

            const result = await chat.sendMessage(content);
            const responseText = result.response.text();

            // 5. Save Assistant Message
            const { data: aiMsg, error: aiError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    role: 'assistant',
                    content: responseText
                })
                .select()
                .single();

            if (aiError) throw aiError;

            return NextResponse.json({
                success: true,
                message: aiMsg
            });

        } catch (error: any) {
            console.error('Chat API Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    });
};
