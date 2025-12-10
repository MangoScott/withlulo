-- Lulo Cloud Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- =====================================================
-- PROFILES (extends Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow service role to insert profiles
CREATE POLICY "Service role can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (TRUE);

-- =====================================================
-- PROJECTS (Folders for organizing content)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for API
CREATE POLICY "Service role can manage projects" ON public.projects
    FOR ALL USING (TRUE);

-- Index
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);

-- =====================================================
-- RECORDINGS (Video recordings)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    
    -- File info
    webm_key TEXT,          -- R2 key for original WebM
    mp4_key TEXT,           -- R2 key for converted MP4
    thumbnail_key TEXT,     -- R2 key for thumbnail
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    
    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_slug TEXT UNIQUE, -- Short unique ID for sharing
    view_count INTEGER DEFAULT 0,
    
    -- Processing status
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own recordings" ON public.recordings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public recordings" ON public.recordings
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can create own recordings" ON public.recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings" ON public.recordings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings" ON public.recordings
    FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role can manage recordings" ON public.recordings
    FOR ALL USING (TRUE);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recordings_user ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_share ON public.recordings(share_slug) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_recordings_project ON public.recordings(project_id);

-- =====================================================
-- CONVERSATIONS (Chat history)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role can manage conversations" ON public.conversations
    FOR ALL USING (TRUE);

-- Index
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);

-- =====================================================
-- MESSAGES (Chat messages)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'action')),
    content TEXT NOT NULL,
    images TEXT[], -- Array of image URLs/base64
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies (messages inherit access from conversation)
CREATE POLICY "Users can view messages of own conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to own conversations" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.user_id = auth.uid()
        )
    );

-- Service role bypass
CREATE POLICY "Service role can manage messages" ON public.messages
    FOR ALL USING (TRUE);

-- Index
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
    );
    
    -- Create default project
    INSERT INTO public.projects (user_id, name, is_default)
    VALUES (NEW.id, 'General', TRUE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- INITIAL SETUP COMPLETE
-- =====================================================

-- =====================================================
-- API KEYS (Extension Access)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    key_hash TEXT NOT NULL,
    label TEXT DEFAULT 'Chrome Extension',
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own api keys"
  ON public.api_keys FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can view their own api keys"
  ON public.api_keys FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own api keys"
  ON public.api_keys FOR DELETE
  USING ( auth.uid() = user_id );
