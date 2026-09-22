-- MIRA — end-to-end-encrypted cloud backup
-- Run this in the Supabase SQL editor (after schema.sql).
--
-- Stores ONE row per user: the whole app state, encrypted on the device with
-- the user's backup passphrase BEFORE upload. Supabase only ever sees
-- ciphertext — it cannot read your logs, and neither can anyone with database
-- access. Row-Level Security additionally limits every row to its owner.

create table if not exists public.backups (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  blob       text not null,          -- AES-GCM ciphertext as JSON {v, iv, ct}
  salt       text not null,          -- PBKDF2 salt (base64) — not secret; lets any
                                      -- of your devices derive the key from the passphrase
  device     text,                   -- last device that wrote (informational)
  app_build  text,                   -- MIRA build that wrote (informational)
  updated_at timestamptz not null default now()
);

comment on table public.backups is
  'One encrypted whole-account backup per user. Server stores ciphertext only (E2EE).';

alter table public.backups enable row level security;

-- Each user can read/write ONLY their own row; no one can see anyone else's.
drop policy if exists backups_own on public.backups;
create policy backups_own on public.backups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
