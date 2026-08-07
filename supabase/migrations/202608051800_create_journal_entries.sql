-- Diário de reflexão: anotações livres do usuário, com carta+mensagem
-- opcionais geradas a partir do texto ("avaliar a reflexão com uma tiragem").

begin;

create extension if not exists pgcrypto;

-- create or replace: idempotente mesmo se a migration anterior
-- (202604141900) que também define essa função nunca tiver sido aplicada.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  reflection_card_name text,
  reflection_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_journal_entries_user_created
  on public.journal_entries (user_id, created_at desc);

drop trigger if exists tr_journal_entries_updated_at on public.journal_entries;
create trigger tr_journal_entries_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

alter table public.journal_entries enable row level security;

drop policy if exists "journal_entries own rows" on public.journal_entries;
create policy "journal_entries own rows"
on public.journal_entries
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

commit;
