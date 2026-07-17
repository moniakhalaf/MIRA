# Phase 1 — Stand up Supabase (your part, ~15 minutes)

This is the only step that needs **you** (an account + secrets I can't create).
Once it's done, I build and test the account + encrypted-sync layer against your
real project. Follow the security architecture in `hosting-security.md`.

## Steps

1. **Create a project** at <https://supabase.com> → New project.
   - Pick a region close to your users (e.g. Frankfurt for GCC/EU latency + GDPR).
   - Save the database password somewhere safe.

2. **Create the tables.** Open **SQL Editor** → paste all of
   [`supabase-schema.sql`](./supabase-schema.sql) → **Run**. You should see the
   `vaults` and `key_wraps` tables with Row-Level Security enabled.

3. **Turn on the sign-in methods you want** (Authentication → Providers):
   - **Email** (magic link / OTP) — simplest to start.
   - Optionally **Google** and **Apple** (needed for a smooth iPhone experience).
   - Passkeys can be layered on later for Face ID.

4. **Lock down email confirmations** (Authentication → Settings): require email
   confirmation so accounts are verified.

5. **Copy two values** (Project Settings → API):
   - **Project URL** — looks like `https://xxxxxxxx.supabase.co`
   - **anon public key** — the long `eyJ...` token labelled **anon / public**

   ✅ The **anon key is safe to put in the app** — it's public and RLS protects
   the data. ❌ **Never** share or ship the **service_role** key; that one
   bypasses RLS and must stay server-side only (we won't use it in the app).

## Then send me

- the **Project URL**, and
- the **anon public key**.

With those I'll add (behind a feature flag, off for everyone until you're ready):
1. **Accounts** — sign up / sign in / sign out in Settings.
2. **Zero-knowledge sync** — your encrypted vault uploads/downloads; the server
   only ever holds ciphertext.
3. **Multi-device + recovery code.**

Everything stays reversible and flag-gated, so your current on-device app is
unaffected while we build and test.

## What I still can't do for you

- Create the Supabase/Stripe accounts or hold your secrets.
- Write your legal **privacy policy / terms** (get a lawyer — your zero-knowledge
  design makes "we can't read your data" a true, strong claim).
