-- Migration: Add Sites Table with Subdomain Support
-- Run this in Supabase SQL Editor

-- =====================================================
-- SITES (Generated Websites)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    business_type TEXT,
    theme TEXT,
    
    -- Generated Content
    html_content TEXT,
    css_content TEXT,
    
    -- URL Routing
    slug TEXT NOT NULL UNIQUE,
    subdomain TEXT UNIQUE,  -- e.g. 'mybrand' for mybrand.heylulo.com
    custom_domain TEXT,     -- Future: full custom domain
    
    -- Status
    published BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own sites" ON public.sites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sites" ON public.sites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites" ON public.sites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites" ON public.sites
    FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for API
CREATE POLICY "Service role can manage sites" ON public.sites
    FOR ALL USING (TRUE);

-- Public can view published sites (for subdomain routing)
CREATE POLICY "Public can view published sites" ON public.sites
    FOR SELECT USING (published = TRUE);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sites_user ON public.sites(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON public.sites(subdomain);
CREATE INDEX IF NOT EXISTS idx_sites_slug ON public.sites(slug);
CREATE INDEX IF NOT EXISTS idx_sites_published ON public.sites(published);

-- =====================================================
-- MIGRATION: Add subdomain column if table already exists
-- =====================================================
-- Run this if the table already exists but lacks subdomain:
-- ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;
-- CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON public.sites(subdomain);
