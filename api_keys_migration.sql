
-- API Keys for Extension Access
create table if not exists api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  key_hash text not null,
  label text default 'Chrome Extension',
  last_used_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table api_keys enable row level security;

create policy "Users can insert their own api keys"
  on api_keys for insert
  with check ( auth.uid() = user_id );

create policy "Users can view their own api keys"
  on api_keys for select
  using ( auth.uid() = user_id );

create policy "Users can delete their own api keys"
  on api_keys for delete
  using ( auth.uid() = user_id );
