-- Run this in Supabase: Project -> SQL Editor -> New query -> paste the WHOLE file and run.
-- Safe to run more than once.

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
drop policy if exists "Users can view their own diagnostics" on diagnostics;
create policy "Users can view their own diagnostics"
  on diagnostics for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own diagnostics" on diagnostics;
create policy "Users can insert their own diagnostics"
  on diagnostics for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Client portal: engagements (one per service request) and uploaded files.
-- All reads/writes go through the Next.js server using the service role key,
-- after checking the signed-in user owns the engagement (or is an admin).
-- RLS is enabled with no public policies, so the browser can't query directly.
-- ---------------------------------------------------------------------------
create table if not exists engagements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  service text not null,
  status text not null default 'draft',          -- draft | submitted | needs_info | in_review | solution_ready
  company_name text,
  client_name text,
  client_email text,
  inputs jsonb not null default '{}'::jsonb,     -- answers to the data collection form
  requests jsonb not null default '[]'::jsonb,   -- extra items the consultant asked for
  request_note text,                              -- message shown to the client with those requests
  admin_notes text,                               -- private consultant notes (never shown to client)
  solution text,                                  -- markdown solution write-up
  solution_published_at timestamp with time zone,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists engagements_user_idx on engagements(user_id);
alter table engagements enable row level security;

create table if not exists engagement_files (
  id uuid default gen_random_uuid() primary key,
  engagement_id uuid references engagements(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  doc_type text not null,                         -- checklist key, 'other', 'req:<id>' or 'deliverable'
  file_name text not null,
  storage_path text not null,
  size_bytes bigint,
  uploaded_by_admin boolean not null default false,
  created_at timestamp with time zone default now()
);

create index if not exists engagement_files_eng_idx on engagement_files(engagement_id);
alter table engagement_files enable row level security;

-- Private storage bucket for uploaded documents (50 MB per file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('engagement-files', 'engagement-files', false, 52428800)
on conflict (id) do nothing;
