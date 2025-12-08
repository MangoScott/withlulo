import { createClient } from '@supabase/supabase-js';

// Types for our database
export interface Profile {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
}

export interface Project {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface Recording {
    id: string;
    user_id: string;
    project_id: string | null;
    title: string;
    description: string | null;
    webm_key: string | null;
    mp4_key: string | null;
    thumbnail_key: string | null;
    duration_seconds: number | null;
    file_size_bytes: number | null;
    is_public: boolean;
    share_slug: string | null;
    view_count: number;
    status: 'processing' | 'ready' | 'failed';
    created_at: string;
    updated_at: string;
}

export interface Conversation {
    id: string;
    user_id: string;
    project_id: string | null;
    title: string | null;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'action';
    content: string;
    images: string[] | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface Image {
    id: string;
    user_id: string;
    title: string;
    url: string;
    description: string | null;
    created_at: string;
}

// Database schema type
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, 'created_at'>;
                Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
            };
            projects: {
                Row: Project;
                Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>;
            };
            recordings: {
                Row: Recording;
                Insert: Omit<Recording, 'id' | 'created_at' | 'updated_at' | 'view_count'>;
                Update: Partial<Omit<Recording, 'id' | 'user_id' | 'created_at'>>;
            };
            conversations: {
                Row: Conversation;
                Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Conversation, 'id' | 'user_id' | 'created_at'>>;
            };
            messages: {
                Row: Message;
                Insert: Omit<Message, 'id' | 'created_at'>;
                Update: Partial<Omit<Message, 'id' | 'conversation_id' | 'created_at'>>;
            };
            api_keys: {
                Row: {
                    id: string;
                    user_id: string;
                    key_hash: string;
                    label: string | null;
                    last_used_at: string | null;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    key_hash: string;
                    label?: string | null;
                    created_at?: string;
                };
                Update: {
                    last_used_at?: string;
                };
            };
            images: {
                Row: Image;
                Insert: Omit<Image, 'id' | 'created_at'>;
                Update: Partial<Omit<Image, 'id' | 'user_id' | 'created_at'>>;
            };
        };
    };
}

// Server-side client (for API routes)
export function createServerClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables');
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

// Client-side client (for browser/dashboard)
let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function createBrowserClient() {
    if (browserClient) return browserClient;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
    }

    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
    return browserClient;
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('api_keys' as any)
                .select('user_id')
                .eq('key_hash', token)
                .single();

            if (!error && keyData) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return { id: keyData.user_id } as any;
            }
        } catch (e) {
            // api_keys table might not exist, continue to JWT check
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
