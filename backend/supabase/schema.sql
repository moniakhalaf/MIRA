-- MIRA — production backend schema (Supabase / Postgres)
-- Run this once in the Supabase SQL editor. It creates the account +
-- subscription model, Row-Level Security, an admin helper, a signup trigger,
-- and the members view the Admin console reads.
--
-- Personal health data stays on the device. Only account + subscription state
-- lives here.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. profiles  — one row per auth user, mirrors auth.users
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'member'
              check (role in ('member', 'admin', 'owner')),
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Account profile, 1:1 with auth.users.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. subscriptions  — one row per user, current plan + billing state
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  user_id                uuid primary key
                         references public.profiles (id) on delete cascade,
  plan                   text not null default 'free'
                         check (plan in ('free', 'pro', 'team')),
  status                 text not null default 'active'
                         check (status in ('active', 'trial', 'past_due', 'cancelled')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

comment on table public.subscriptions is 'Current plan + Stripe billing state per user.';

create index if not exists subscriptions_stripe_customer_idx
  on public.subscriptions (stripe_customer_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. is_admin()  — true for admins and owners; used by RLS policies
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. handle_new_user()  — on signup, create a profile + free subscription
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Row-Level Security
--    Users read/update only their own rows. Admins/owners see everyone.
--    Writes to billing state come only from the service_role (Edge Functions),
--    which bypasses RLS — so no INSERT/UPDATE policy is granted to end users
--    on subscriptions.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'member');
  -- users may edit their own profile but cannot escalate their own role;
  -- role changes are done by an admin/owner or via SQL.

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- subscriptions -------------------------------------------------------------
drop policy if exists subs_select_self_or_admin on public.subscriptions;
create policy subs_select_self_or_admin on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- (no user INSERT/UPDATE/DELETE policies: only service_role writes billing)

-- ─────────────────────────────────────────────────────────────────────────
-- 6. members_admin  — the console's member list (RLS-guarded)
--    A security_invoker view: it runs with the caller's rights, so the
--    profiles/subscriptions RLS above already limits rows to admins/owners.
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.members_admin
with (security_invoker = true) as
  select
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at,
    coalesce(s.plan, 'free')     as plan,
    coalesce(s.status, 'active') as status,
    s.current_period_end
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id;

comment on view public.members_admin is
  'Member list for the Admin console. RLS returns rows only to admins/owners.';

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Make yourself the owner (run once, after your first sign-in)
-- ─────────────────────────────────────────────────────────────────────────
-- update public.profiles set role = 'owner'
-- where email = 'monia.khalaf.mk@gmail.com';
