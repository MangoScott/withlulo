export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export const POST = async (request: NextRequest) => {
    return withAuth(request, async (req, userId) => {
        const supabase = createServerClient();
        const key = `lulo_${nanoid(32)}`;

        const { error } = await supabase
            .from('api_keys' as any)
            .insert({
                user_id: userId,
                key_hash: key, // Storing plain for MVP
                label: 'Chrome Extension'
            });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ key });
    });
};

export const GET = async (request: NextRequest) => {
    return withAuth(request, async (req, userId) => {
        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('api_keys' as any)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ keys: data || [] });
    });
};

export const DELETE = async (request: NextRequest) => {
    return withAuth(request, async (req, userId) => {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const supabase = createServerClient();

        const { error } = await supabase
            .from('api_keys' as any)
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    });
};
