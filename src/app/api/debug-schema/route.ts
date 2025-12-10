import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const { data, error } = await supabase.rpc('get_schema_info', { table_name: 'sites' });

        // If RPC doesn't exist (likely), try query
        // Supabase-js can't query information_schema directly with standard client usually unless exposed?
        // Let's try selecting from sites limit 1 to see structure? No.

        // Let's try raw SQL via RPC if enabled? No.
        // Let's try to just insert a dummy site and see the error?

        const { error: insertError } = await supabase
            .from('sites')
            .insert({
                // Minimal invalid insert to trigger schematic error
                slug: 'test-schema-' + Date.now(),
                title: 'Test',
                description: 'Test',
                business_type: 'test',
                // Theme, html_content missing?
                // If column missing, it will say "column x does not exist"
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError });
        }

        // If successful, clean up
        // ... (can't delete easily without ID, but assumes success means table is good)

        return NextResponse.json({ status: 'Table schema seems compatible for basic insert' });

    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
