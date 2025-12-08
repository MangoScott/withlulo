-- Sites table for Lulo Website Builder
-- Run this migration in Supabase SQL Editor

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  slug text unique not null,
  title text not null,
  description text,
  business_type text,
  theme text default 'modern',
  html_content text,
  css_content text,
  published boolean default false,
  custom_domain text,
  view_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table sites enable row level security;

-- Users can manage their own sites
create policy "Users can manage their own sites" on sites
  for all using (auth.uid() = user_id);

-- Anyone can view published sites
create policy "Anyone can view published sites" on sites
  for select using (published = true);

-- Index for fast slug lookups
create index if not exists sites_slug_idx on sites(slug);
create index if not exists sites_user_id_idx on sites(user_id);

-- Updated at trigger
create or replace function update_sites_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sites_updated_at
  before update on sites
  for each row
  execute function update_sites_updated_at();
