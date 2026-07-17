-- MIRA — Supabase schema for zero-knowledge, multi-user cloud sync.
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- The server only ever stores CIPHERTEXT + wrapped keys — it cannot read user data.

-- ── Vault: one encrypted blob per user (the whole app state, AES-GCM) ──────────
create table if not exists public.vaults (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  cipher      text        not null,               -- base64 AES-GCM ciphertext of the app state
  iv          text        not null,               -- base64 12-byte IV
  version     bigint      not null default 1,      -- optimistic concurrency (bump on each write)
  updated_at  timestamptz not null default now()
);

-- ── Wrapped Account Keys: one row per unlock method (passphrase / passkey / recovery) ──
create table if not exists public.key_wraps (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  method       text        not null check (method in ('pass','passkey','recovery')),
  salt         text        not null,               -- base64 KDF salt
  wrap_iv      text        not null,               -- base64 IV used to wrap the Account Key
  wrapped_key  text        not null,               -- base64 wrapped Account Key
  meta         jsonb,                              -- e.g. { "credId": "...", "kdf": "PBKDF2", "iter": 250000 }
  created_at   timestamptz not null default now(),
  unique (user_id, method)
);

-- ── Row-Level Security: every user can touch ONLY their own rows ───────────────
alter table public.vaults    enable row level security;
alter table public.key_wraps enable row level security;

drop policy if exists "own vault"  on public.vaults;
drop policy if exists "own wraps"  on public.key_wraps;

create policy "own vault"  on public.vaults    for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own wraps"  on public.key_wraps for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── keep updated_at fresh + optional: reject stale writes at the DB layer ──────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists vaults_touch on public.vaults;
create trigger vaults_touch before update on public.vaults
  for each row execute function public.touch_updated_at();

-- Notes:
--  • Store base64 text (simplest for the browser); switch to bytea later if you prefer.
--  • The service-role key can bypass RLS — keep it SERVER-ONLY, never in the app.
--  • The app uses only the public "anon" key + the user's session JWT, so RLS applies.
