-- Add subdomain column to sites table
ALTER TABLE sites 
ADD COLUMN subdomain TEXT UNIQUE;

-- Create an index for faster lookups
CREATE INDEX idx_sites_subdomain ON sites(subdomain);

-- Optional: Backfill existing sites with slugs as subdomains (to avoid nulls if needed)
-- UPDATE sites SET subdomain = slug WHERE subdomain IS NULL;
