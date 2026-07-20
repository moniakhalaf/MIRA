# MIRA — Community food database setup

A shared, MyFitnessPal-style food library. Foods people contribute become
searchable in **Find macros** for everyone using your MIRA. It's optional and
off until you connect a free Supabase project; without it the app simply uses
USDA + OpenFoodFacts + the AI estimate as before.

Nothing personal is stored here — only food names and per-100 g macros.

## One-time setup (~5 minutes)

1. **Create a Supabase project** — go to [supabase.com](https://supabase.com),
   sign in, **New project**. Pick any name and a region close to you. Wait for
   it to finish provisioning.

2. **Create the table + policies** — open **SQL Editor**, paste the whole of
   [`community-food-db.sql`](./community-food-db.sql), and click **Run**. This
   creates the `community_foods` table, the search index, the row-level-security
   policies (public read + insert, no edit/delete), and the "mark useful" / "flag"
   functions.

3. **Copy the two values** — open **Project Settings → API**:
   - **Project URL** — looks like `https://xxxxxxxx.supabase.co`
   - **anon public** key — a long `eyJ…` token (the one labelled *anon* / *public*,
     **not** the *service_role* key)

4. **Paste them into MIRA** — Settings → **Community food database** → fill in the
   Project URL and anon key. The status flips to **Connected**.

That's it. From then on:
- **Find macros** searches the community library alongside USDA/OpenFoodFacts.
  Community results are labelled *community-submitted* (never shown as verified).
- Any food you look up shows a **Share** button in the review card — one tap adds
  it (per 100 g) to the shared library for everyone.
- Logging a community entry quietly bumps its "used" count, so trustworthy entries
  rise to the top of future searches.

## Safety notes

- The **anon key is safe to embed** in the app — row-level security decides what it
  can do: read shared foods, insert new ones, and call the two counter functions.
  It **cannot** update or delete arbitrary rows.
- The **service_role** key can bypass all of that — keep it secret, never put it in
  the app or share it.
- The SQL adds sanity limits (per-100 g ceilings, name length) so the anon key
  can't insert absurd values.

## Moderation

Bad or duplicate entries are a known crowd-sourcing hazard. You (as the project
owner) can triage from the Supabase SQL editor:

```sql
-- entries people flagged as wrong, worst first
select id, name, brand, kcal, p, c, f, flags, uses
from public.community_foods
order by flags desc
limit 50;

-- remove an obviously wrong entry
delete from public.community_foods where id = 'paste-the-id';
```

Because searches order by `uses` descending, the entries most people actually log
naturally surface first, and rarely-used junk sinks.
