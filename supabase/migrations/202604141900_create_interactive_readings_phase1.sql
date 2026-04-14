-- Phase 1: Interactive readings + external sharing
-- Target endpoints:
-- - /api/v1/readings/queue/*
-- - /api/v1/readings/match/accept
-- - /api/v1/readings/sessions/:id/*
-- - /api/v1/readings/history
-- - /api/v1/readings/shares/:shareId
-- - /api/public/readings/:slug

begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.interactive_queue_state as enum ('waiting', 'matched', 'left', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.interactive_session_status as enum (
    'matching',
    'in_progress',
    'awaiting_close',
    'closed',
    'cancelled',
    'expired'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.interactive_session_event_type as enum (
    'joined_queue',
    'left_queue',
    'matched',
    'message',
    'draw',
    'state_changed',
    'close_requested',
    'close_confirmed',
    'closed',
    'share_created',
    'share_updated'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.interactive_share_visibility as enum ('private', 'unlisted', 'public');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.interactive_share_content_level as enum ('summary', 'standard', 'full');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.interactive_reading_sessions (
  id uuid primary key default gen_random_uuid(),
  week_ref text not null check (week_ref ~ '^\d{4}-W\d{2}$'),
  status public.interactive_session_status not null default 'matching',
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  matched_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  awaiting_close_at timestamptz,
  closed_at timestamptz,
  last_activity_at timestamptz not null default timezone('utc', now()),
  authoritative_draw_index integer not null default 0 check (authoritative_draw_index >= 0),
  close_requested_by uuid references auth.users(id) on delete set null,
  close_confirmed_by_a boolean not null default false,
  close_confirmed_by_b boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (user_a_id <> user_b_id),
  check (close_requested_by is null or close_requested_by in (user_a_id, user_b_id))
);

create table if not exists public.interactive_reading_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_ref text not null check (week_ref ~ '^\d{4}-W\d{2}$'),
  state public.interactive_queue_state not null default 'waiting',
  matched_session_id uuid references public.interactive_reading_sessions(id) on delete set null,
  preferences jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.interactive_reading_session_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.interactive_reading_sessions(id) on delete cascade,
  event_type public.interactive_session_event_type not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.interactive_reading_session_draws (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interactive_reading_sessions(id) on delete cascade,
  draw_index integer not null check (draw_index > 0),
  card_code text not null,
  card_name text not null,
  is_reversed boolean not null default false,
  drawn_by text not null default 'backend',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, draw_index)
);

create table if not exists public.interactive_reading_shares (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interactive_reading_sessions(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{8,80}$'),
  is_active boolean not null default true,
  expires_at timestamptz,
  visibility public.interactive_share_visibility not null default 'private',
  content_level public.interactive_share_content_level not null default 'summary',
  sanitized_payload jsonb not null default '{}'::jsonb,
  private_payload jsonb not null default '{}'::jsonb,
  last_accessed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at is null or expires_at > created_at)
);

create index if not exists idx_interactive_sessions_user_a
  on public.interactive_reading_sessions (user_a_id, matched_at desc);

create index if not exists idx_interactive_sessions_user_b
  on public.interactive_reading_sessions (user_b_id, matched_at desc);

create index if not exists idx_interactive_sessions_week_ref_status
  on public.interactive_reading_sessions (week_ref, status);

create unique index if not exists uq_interactive_queue_user_waiting
  on public.interactive_reading_queue (user_id)
  where state = 'waiting';

create index if not exists idx_interactive_queue_week_ref_state
  on public.interactive_reading_queue (week_ref, state);

create index if not exists idx_interactive_events_session_created_at
  on public.interactive_reading_session_events (session_id, created_at desc);

create index if not exists idx_interactive_shares_owner_active
  on public.interactive_reading_shares (owner_user_id, is_active);

create unique index if not exists uq_interactive_shares_session_active
  on public.interactive_reading_shares (session_id)
  where is_active = true;

drop trigger if exists tr_interactive_sessions_updated_at on public.interactive_reading_sessions;
create trigger tr_interactive_sessions_updated_at
before update on public.interactive_reading_sessions
for each row execute function public.set_updated_at();

drop trigger if exists tr_interactive_queue_updated_at on public.interactive_reading_queue;
create trigger tr_interactive_queue_updated_at
before update on public.interactive_reading_queue
for each row execute function public.set_updated_at();

drop trigger if exists tr_interactive_shares_updated_at on public.interactive_reading_shares;
create trigger tr_interactive_shares_updated_at
before update on public.interactive_reading_shares
for each row execute function public.set_updated_at();

alter table public.interactive_reading_sessions enable row level security;
alter table public.interactive_reading_queue enable row level security;
alter table public.interactive_reading_session_events enable row level security;
alter table public.interactive_reading_session_draws enable row level security;
alter table public.interactive_reading_shares enable row level security;

drop policy if exists "interactive queue own rows" on public.interactive_reading_queue;
create policy "interactive queue own rows"
on public.interactive_reading_queue
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "interactive sessions participants read" on public.interactive_reading_sessions;
create policy "interactive sessions participants read"
on public.interactive_reading_sessions
for select
to authenticated
using (auth.uid() in (user_a_id, user_b_id));

drop policy if exists "interactive sessions participants update" on public.interactive_reading_sessions;
create policy "interactive sessions participants update"
on public.interactive_reading_sessions
for update
to authenticated
using (auth.uid() in (user_a_id, user_b_id))
with check (auth.uid() in (user_a_id, user_b_id));

drop policy if exists "interactive sessions participant insert" on public.interactive_reading_sessions;
create policy "interactive sessions participant insert"
on public.interactive_reading_sessions
for insert
to authenticated
with check (auth.uid() in (user_a_id, user_b_id));

drop policy if exists "interactive events participants read" on public.interactive_reading_session_events;
create policy "interactive events participants read"
on public.interactive_reading_session_events
for select
to authenticated
using (
  exists (
    select 1
    from public.interactive_reading_sessions s
    where s.id = interactive_reading_session_events.session_id
      and auth.uid() in (s.user_a_id, s.user_b_id)
  )
);

drop policy if exists "interactive events actor insert" on public.interactive_reading_session_events;
create policy "interactive events actor insert"
on public.interactive_reading_session_events
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and exists (
    select 1
    from public.interactive_reading_sessions s
    where s.id = interactive_reading_session_events.session_id
      and auth.uid() in (s.user_a_id, s.user_b_id)
  )
);

drop policy if exists "interactive draws participants read" on public.interactive_reading_session_draws;
create policy "interactive draws participants read"
on public.interactive_reading_session_draws
for select
to authenticated
using (
  exists (
    select 1
    from public.interactive_reading_sessions s
    where s.id = interactive_reading_session_draws.session_id
      and auth.uid() in (s.user_a_id, s.user_b_id)
  )
);

drop policy if exists "interactive shares owner full access" on public.interactive_reading_shares;
create policy "interactive shares owner full access"
on public.interactive_reading_shares
for all
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create or replace function public.get_public_interactive_reading_share(p_slug text)
returns table (
  share_id uuid,
  slug text,
  visibility public.interactive_share_visibility,
  content_level public.interactive_share_content_level,
  expires_at timestamptz,
  session_status public.interactive_session_status,
  payload jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sh.id as share_id,
    sh.slug,
    sh.visibility,
    sh.content_level,
    sh.expires_at,
    se.status as session_status,
    sh.sanitized_payload as payload
  from public.interactive_reading_shares sh
  join public.interactive_reading_sessions se
    on se.id = sh.session_id
  where sh.slug = p_slug
    and sh.is_active = true
    and sh.visibility in ('public', 'unlisted')
    and (sh.expires_at is null or sh.expires_at > timezone('utc', now()))
  limit 1;
$$;

grant execute on function public.get_public_interactive_reading_share(text)
to anon, authenticated;

commit;
