-- QUICK FIX: Add subdomain column to existing sites table
-- Run this in Supabase SQL Editor if your sites table already exists

-- Add the subdomain column (will be NULL for existing sites)
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- Create unique index for subdomain (allows NULL but unique values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_subdomain_unique ON public.sites(subdomain) WHERE subdomain IS NOT NULL;

-- Create regular index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON public.sites(subdomain);

-- Verify the column was added
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'sites' AND column_name = 'subdomain';
