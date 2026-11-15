-- ===========================================================================
-- GOLIATH initial schema
-- Every user-owned table is protected by Row Level Security (auth.uid()).
-- File contents are NEVER stored in PostgreSQL: only Drive metadata.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles --
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles are self readable" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles are self updatable" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles are self insertable" on public.profiles
  for insert with check (auth.uid() = id);

-- --------------------------------------------------------- google_accounts --
-- Stores ONLY encrypted OAuth material. Never the file contents.
create table if not exists public.google_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  provider text not null default 'google',
  provider_sub text,
  email text,
  encrypted_refresh_token text,
  encrypted_access_token text,
  access_token_expires_at timestamptz,
  scopes text[] not null default '{}',
  drive_root_id text,
  connected_at timestamptz default now(),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_accounts enable row level security;

create policy "own google account read" on public.google_accounts
  for select using (auth.uid() = user_id);
create policy "own google account insert" on public.google_accounts
  for insert with check (auth.uid() = user_id);
create policy "own google account update" on public.google_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own google account delete" on public.google_accounts
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------------ folders --
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drive_folder_id text not null,
  name text not null,
  parent_drive_id text,
  path text,
  updated_at timestamptz not null default now(),
  unique (user_id, drive_folder_id)
);

create index if not exists folders_user_parent_idx on public.folders (user_id, parent_drive_id);
alter table public.folders enable row level security;

create policy "own folders read" on public.folders
  for select using (auth.uid() = user_id);
create policy "own folders write" on public.folders
  for insert with check (auth.uid() = user_id);
create policy "own folders update" on public.folders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own folders delete" on public.folders
  for delete using (auth.uid() = user_id);

-- -------------------------------------------------------------------- files --
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drive_file_id text not null,
  name text not null,
  mime_type text not null default 'application/octet-stream',
  size bigint not null default 0,
  parent_drive_id text,
  is_folder boolean not null default false,
  starred boolean not null default false,
  trashed boolean not null default false,
  md5 text,
  etag text,
  modified_time timestamptz,
  created_time timestamptz,
  web_view_link text,
  thumbnail_link text,
  synced_at timestamptz not null default now(),
  unique (user_id, drive_file_id)
);

create index if not exists files_user_parent_idx on public.files (user_id, parent_drive_id);
create index if not exists files_user_modified_idx on public.files (user_id, modified_time desc);
create index if not exists files_user_starred_idx on public.files (user_id) where starred;
create index if not exists files_name_trgm_idx on public.files (user_id, name);

alter table public.files enable row level security;

create policy "own files read" on public.files
  for select using (auth.uid() = user_id);
create policy "own files insert" on public.files
  for insert with check (auth.uid() = user_id);
create policy "own files update" on public.files
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own files delete" on public.files
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------- transfers --
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('upload', 'download')),
  drive_file_id text,
  name text not null,
  mime_type text not null default 'application/octet-stream',
  size bigint not null default 0,
  bytes_transferred bigint not null default 0,
  chunk_size bigint not null default 0,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'paused', 'completed', 'failed', 'canceled')),
  error text,
  -- Encrypted resumable session URI (server-side only, AES-256-GCM).
  session_uri_encrypted text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists transfers_user_created_idx on public.transfers (user_id, created_at desc);

alter table public.transfers enable row level security;

create policy "own transfers read" on public.transfers
  for select using (auth.uid() = user_id);
create policy "own transfers insert" on public.transfers
  for insert with check (auth.uid() = user_id);
create policy "own transfers update" on public.transfers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transfers delete" on public.transfers
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------- favorites --
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  drive_file_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, drive_file_id)
);

alter table public.favorites enable row level security;

create policy "own favorites read" on public.favorites
  for select using (auth.uid() = user_id);
create policy "own favorites insert" on public.favorites
  for insert with check (auth.uid() = user_id);
create policy "own favorites delete" on public.favorites
  for delete using (auth.uid() = user_id);

-- --------------------------------------------------------- ai_conversations --
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
alter table public.ai_conversations enable row level security;

create policy "own conversations read" on public.ai_conversations
  for select using (auth.uid() = user_id);
create policy "own conversations insert" on public.ai_conversations
  for insert with check (auth.uid() = user_id);
create policy "own conversations update" on public.ai_conversations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own conversations delete" on public.ai_conversations
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------- ai_messages --
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);
alter table public.ai_messages enable row level security;

create policy "own messages read" on public.ai_messages
  for select using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
create policy "own messages insert" on public.ai_messages
  for insert with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
create policy "own messages delete" on public.ai_messages
  for delete using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------- agent_action_logs --
create table if not exists public.agent_action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  target text not null default '-',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'executed', 'denied', 'failed')),
  requires_confirmation boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_logs_user_idx on public.agent_action_logs (user_id, created_at desc);
alter table public.agent_action_logs enable row level security;

create policy "own agent logs read" on public.agent_action_logs
  for select using (auth.uid() = user_id);
create policy "own agent logs insert" on public.agent_action_logs
  for insert with check (auth.uid() = user_id);
create policy "own agent logs update" on public.agent_action_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own agent logs delete" on public.agent_action_logs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------- settings --
create table if not exists public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  grid_view boolean not null default true,
  page_size integer not null default 48 check (page_size between 12 and 200),
  confirm_delete boolean not null default true,
  ai_provider text not null default 'auto',
  reduce_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "own settings read" on public.settings
  for select using (auth.uid() = user_id);
create policy "own settings insert" on public.settings
  for insert with check (auth.uid() = user_id);
create policy "own settings update" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --------------------------------------------------------- updated_at guard --
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists google_accounts_touch on public.google_accounts;
create trigger google_accounts_touch before update on public.google_accounts
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();