-- Run this in Supabase: Project -> SQL Editor -> New query -> paste and run.

create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text,
  contact text,
  category text,
  preferred_day text,
  preferred_time text,
  transcript text,
  onepager text,
  created_at timestamp with time zone default now()
);

-- Optional: enable row level security (recommended). Since we only ever write
-- from the server using the service role key, no public policies are needed.
alter table leads enable row level security;

-- Diagnostics: one row per completed diagnostic conversation, tied to the
-- logged-in user who ran it. This powers the "My diagnostics" history page.
create table if not exists diagnostics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category text,
  transcript text,
  onepager text,
  created_at timestamp with time zone default now()
);

alter table diagnostics enable row level security;

-- Users can only see and insert their own diagnostics - this is enforced
-- using the public anon key from the browser, so RLS policies are required here.
create policy "Users can view their own diagnostics"
  on diagnostics for select
  using (auth.uid() = user_id);

create policy "Users can insert their own diagnostics"
  on diagnostics for insert
  with check (auth.uid() = user_id);
