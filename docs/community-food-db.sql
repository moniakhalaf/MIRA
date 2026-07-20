-- MIRA — Community food database (MyFitnessPal-style shared library).
-- Paste this whole file into the Supabase SQL Editor and run it once.
--
-- Unlike the encrypted vault (supabase-schema.sql), this table is intentionally
-- PUBLIC: anyone using your MIRA can read the shared foods and add new ones with
-- the anon key. No personal data lives here — only food names and per-100 g
-- macros. Row-Level Security still fences what the anon key may do (read + insert
-- + the one "mark useful" RPC; never update or delete arbitrary rows).

create table if not exists public.community_foods (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  name_lc    text        not null,               -- lowercased name, for case-insensitive ilike search
  brand      text        default '',
  kcal       numeric     not null default 0,     -- all macros are PER 100 g / 100 ml
  p          numeric     not null default 0,
  c          numeric     not null default 0,
  f          numeric     not null default 0,
  uses       integer     not null default 1,     -- how many times an entry has been logged (good entries rise)
  flags      integer     not null default 0,     -- abuse / "looks wrong" reports
  created_at timestamptz not null default now(),
  -- light sanity gates so the anon key can't insert junk
  constraint name_len   check (char_length(name) between 1 and 120),
  constraint macros_pos check (kcal >= 0 and p >= 0 and c >= 0 and f >= 0),
  constraint macros_sane check (kcal <= 1000 and p <= 100 and c <= 100 and f <= 100)  -- per-100 g ceilings
);

-- fast case-insensitive search on the lowercased name
create index if not exists community_foods_name_lc_idx on public.community_foods using gin (name_lc gin_trgm_ops);
create extension if not exists pg_trgm;

-- ── Row-Level Security ─────────────────────────────────────────────────────────
alter table public.community_foods enable row level security;

drop policy if exists "community read"   on public.community_foods;
drop policy if exists "community insert" on public.community_foods;

-- anyone (anon) may read the shared library
create policy "community read"   on public.community_foods for select using (true);
-- anyone (anon) may contribute a new food; the CHECK constraints above guard quality
create policy "community insert" on public.community_foods for insert with check (true);
-- NOTE: no update/delete policy → the anon key cannot edit or remove rows.

-- ── "this entry was useful" counter (good entries float to the top) ────────────
-- SECURITY DEFINER so it can bump the row despite there being no anon UPDATE policy.
create or replace function public.community_food_use(fid uuid)
returns void language plpgsql security definer as $$
begin
  update public.community_foods set uses = uses + 1 where id = fid;
end $$;

grant execute on function public.community_food_use(uuid) to anon;

-- Optional: a "looks wrong" report so bad entries can be triaged later.
create or replace function public.community_food_flag(fid uuid)
returns void language plpgsql security definer as $$
begin
  update public.community_foods set flags = flags + 1 where id = fid;
end $$;

grant execute on function public.community_food_flag(uuid) to anon;

-- Moderation ideas (run manually as owner):
--   • review high-flag rows:   select * from public.community_foods order by flags desc limit 50;
--   • hide obvious junk:        delete from public.community_foods where id = '...';
--   • the anon key can never do the above — only you, from the SQL editor.
