import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase';
import { getEnv } from './env-server';

export * from './supabase';

// Server-side client (for API routes on Cloudflare Pages)
export function createServerClient(): SupabaseClient<Database> {
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase Init Error. Missing variables.');
        throw new Error('Missing Supabase environment variables');
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

// Helper to get user from auth header (JWT or API Key)
export async function getUserFromToken(authHeader: string | null) {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    const supabase = createServerClient();

    // 1. Check if it's an API Key (lulo_ prefix)
    if (token.startsWith('lulo_')) {
        // First try API keys table
        try {
            const { data: keyData, error } = await supabase
                .from('api_keys')
                .select('user_id')
                .eq('key_hash', token)
                .single();

            if (!error && keyData) {
                return { id: keyData.user_id };
            }
        } catch (e) {
            // api_keys table might not exist or error, continue to JWT check
        }

        // If api_keys lookup failed, the token might be a pseudo-token
        // derived from an access token (lulo_ + first 32 chars of JWT)
        // We can't validate these without the full JWT, so return null
        return null;
    }

    // 2. Standard JWT Check
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return null;
    }

    return user;
}
