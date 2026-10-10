-- BookEr AI cloud data schema.
-- Apply this migration to the Supabase project configured for BookEr AI.

create table if not exists public.booker_projects (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  project jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists booker_projects_user_updated_idx
  on public.booker_projects (user_id, updated_at desc);

alter table public.booker_projects enable row level security;

drop policy if exists "Users can read their own projects" on public.booker_projects;
create policy "Users can read their own projects"
  on public.booker_projects for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own projects" on public.booker_projects;
create policy "Users can create their own projects"
  on public.booker_projects for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own projects" on public.booker_projects;
create policy "Users can update their own projects"
  on public.booker_projects for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own projects" on public.booker_projects;
create policy "Users can delete their own projects"
  on public.booker_projects for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.booker_projects to authenticated;

create table if not exists public.booker_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.booker_settings enable row level security;

drop policy if exists "Users can read their own settings" on public.booker_settings;
create policy "Users can read their own settings"
  on public.booker_settings for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own settings" on public.booker_settings;
create policy "Users can create their own settings"
  on public.booker_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own settings" on public.booker_settings;
create policy "Users can update their own settings"
  on public.booker_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.booker_settings to authenticated;

create table if not exists public.booker_daily_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  stat_date date not null,
  words_written integer not null default 0 check (words_written >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, stat_date)
);

alter table public.booker_daily_stats enable row level security;

drop policy if exists "Users can read their own daily stats" on public.booker_daily_stats;
create policy "Users can read their own daily stats"
  on public.booker_daily_stats for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own daily stats" on public.booker_daily_stats;
create policy "Users can create their own daily stats"
  on public.booker_daily_stats for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own daily stats" on public.booker_daily_stats;
create policy "Users can update their own daily stats"
  on public.booker_daily_stats for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.booker_daily_stats to authenticated;
