-- Migração recomendada para reforçar idempotência por semana (user_id + week_ref)
-- e persistir metadados de status/cache no backend.

alter table if exists public.unified_readings
  add column if not exists status text not null default 'ok',
  add column if not exists cached boolean not null default false,
  add column if not exists ai_failed boolean not null default false;

create unique index if not exists unified_readings_user_week_ref_uidx
  on public.unified_readings (user_id, week_ref);

