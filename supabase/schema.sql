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
