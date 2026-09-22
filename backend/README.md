# MIRA — production backend (Supabase + Stripe)

This folder is the **real** members & subscriptions backend that turns the
on-device Admin/Subscription prototype into a true multi-user product.

The MIRA app itself stays a static PWA (GitHub Pages is fine) — it talks to
**Supabase** (auth + database, called directly from the browser with Row-Level
Security) and to **Stripe** for billing via two small **Supabase Edge
Functions**. Personal health data stays on the device; only account +
subscription state lives in the cloud.

```
backend/
├─ supabase/
│  ├─ schema.sql                     ← tables, roles, RLS, triggers, admin view
│  └─ functions/
│     ├─ stripe-checkout/index.ts    ← create a Stripe Checkout session (auth’d)
│     └─ stripe-webhook/index.ts     ← sync Stripe → subscriptions table
└─ .env.example                      ← the secrets each function needs
```

## 1. Create the accounts (free tiers work to start)
- **Supabase** → new project. Note the **Project URL** and **anon key**
  (Settings → API) and the **service_role key** (keep it secret — server only).
- **Stripe** → create two recurring **Products/Prices**: *Pro* ($6.99/mo) and
  *Team* ($19.99/mo). Note each **Price ID** (`price_...`).

## 2. Database
Open Supabase → SQL editor → paste and run **`supabase/schema.sql`**.
It creates `profiles` and `subscriptions`, auto-creates a profile + free
subscription on signup, adds an `is_admin()` helper, enables **RLS**
(users see only their own rows; admins/owners see everyone), and a
`members_admin` view for the console.

Then run **`supabase/backups.sql`** to add end-to-end-encrypted cloud backup.
It creates a `backups` table (one row per user) with RLS so each user can only
touch their own row. The MIRA app encrypts the whole account state with the
user's **backup passphrase** before upload, so Supabase stores only ciphertext —
it can never read anyone's logs. Enable it in the app under Settings →
Privacy & data → Cloud backup once you're signed in.

Make yourself the owner (run once, with your signup email):
```sql
update public.profiles set role = 'owner'
where email = 'monia.khalaf.mk@gmail.com';
```

## 3. Edge Functions (Stripe)
Install the Supabase CLI, then from `backend/supabase`:
```bash
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_PRO=price_... \
  STRIPE_PRICE_TEAM=price_... \
  SITE_URL=https://your-domain \
  SUPABASE_URL=https://xxxx.supabase.co \
  SUPABASE_ANON_KEY=eyJ... \
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
In Stripe → Developers → Webhooks, add an endpoint pointing at the deployed
`stripe-webhook` URL and subscribe to: `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`. Copy its
signing secret into `STRIPE_WEBHOOK_SECRET` above.

## 4. Connect the app (later wiring)
The app calls the backend only when a Supabase URL + anon key are configured.
Once you have them, the wiring is:
- **Sign in** — `supabase.auth.signInWithOtp({ email })` (magic link) or password.
- **Read my plan** — `select plan,status from subscriptions where user_id = auth.uid()` → drives the Subscription screen instead of the local `S.settings.plan`.
- **Upgrade** — POST to the `stripe-checkout` function with `{ plan }` and the user’s access token, then redirect to the returned Stripe URL.
- **Admin console** — `select * from members_admin` (RLS returns rows only for admins/owners) → replaces the local `S.admin.members` list.

I can do that wiring in the app whenever your Supabase project is up — just
share the Project URL + anon key (both are safe to expose to the browser;
never the service_role key).

## Notes
- **Never** put the `service_role` or `STRIPE_SECRET_KEY` in the client app —
  they live only in Edge Function secrets.
- Test with Stripe **test mode** keys first (`sk_test_…`, test price IDs).
- Costs: Supabase + Stripe both have free tiers; Stripe takes its usual
  per-transaction fee on real payments.
