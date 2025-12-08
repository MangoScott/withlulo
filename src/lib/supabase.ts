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

export interface Site {
    id: string;
    user_id: string;
    slug: string;
    title: string;
    description: string | null;
    business_type: string | null;
    theme: string;
    html_content: string | null;
    css_content: string | null;
    published: boolean;
    custom_domain: string | null;
    view_count: number;
    created_at: string;
    updated_at: string;
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
            sites: {
                Row: Site;
                Insert: Omit<Site, 'id' | 'created_at' | 'updated_at' | 'view_count'>;
                Update: Partial<Omit<Site, 'id' | 'user_id' | 'created_at'>>;
            };
        };
    };
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


