# Turn on "Continue with Google" for MIRA

This adds passwordless Google sign-in so your testers don't have to type a
password. The buttons are already built into the app — they're just hidden
until Google is wired up in Supabase. Follow this once; it takes ~5–10 minutes.

**Your details (already filled in for you):**
- App URL: `https://moniakhalaf.github.io/MIRA/`
- Supabase project: `rjkgcwswkuhiwavopolb`
- Supabase callback URL: `https://rjkgcwswkuhiwavopolb.supabase.co/auth/v1/callback`

When you finish the steps below, tell me **"Google is on"** and I'll flip the
one flag in the app, bump the build, and push — the buttons go live.

---

## Part A — Google Cloud Console (create the OAuth client)

1. Go to **https://console.cloud.google.com/** and sign in with the Google
   account you want to own this.
2. Top-left project dropdown → **New Project** → name it `MIRA` → **Create**,
   then make sure it's selected.
3. Left menu → **APIs & Services** → **OAuth consent screen**.
   - User type: **External** → **Create**.
   - App name: `MIRA`. User support email: your email. Developer contact:
     your email. Leave the rest default → **Save and Continue** through the
     Scopes and Test-users steps (you can add test users later) → **Back to
     dashboard**.
   - While it's in "Testing" mode only people you add as test users can sign
     in. To let anyone in, click **Publish app** on this page (a basic
     email/profile login needs no Google review).
4. Left menu → **APIs & Services** → **Credentials** → **+ Create Credentials**
   → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `MIRA web`.
   - **Authorized JavaScript origins** → **+ Add URI**:
     ```
     https://moniakhalaf.github.io
     ```
   - **Authorized redirect URIs** → **+ Add URI** (paste the Supabase callback
     exactly — this is NOT your app URL):
     ```
     https://rjkgcwswkuhiwavopolb.supabase.co/auth/v1/callback
     ```
   - **Create**. A popup shows your **Client ID** and **Client secret** —
     keep this tab open, you'll paste both into Supabase next.

> These two values are safe to paste into Supabase (that's their home). Don't
> put them in the app's code or anywhere public.

---

## Part B — Supabase (enable Google + set the URLs)

1. Go to **https://supabase.com/dashboard** → open your **MIRA** project.
2. Left menu → **Authentication** → **Providers** (also called "Sign In /
   Providers") → find **Google** → toggle it **on**.
   - Paste the **Client ID** from Part A into **Client IDs**.
   - Paste the **Client secret** into **Client Secret**.
   - **Save**.
3. Left menu → **Authentication** → **URL Configuration**.
   - **Site URL**:
     ```
     https://moniakhalaf.github.io/MIRA/
     ```
   - **Redirect URLs** → **Add URL** (add both, to be safe):
     ```
     https://moniakhalaf.github.io/MIRA/
     https://moniakhalaf.github.io/MIRA
     ```
   - **Save**.

---

## Part C — Tell me, and I flip the switch

Message me **"Google is on"**. I will:
- change `CLOUD.oauth` from `[]` to `["google"]` in `index.html`,
- bump the build number, run the smoke test, and push.

Within a minute of the deploy, hard-refresh MIRA on your phone (or reopen it)
and you'll see **Continue with Google** on the sign-in screen.

---

## Adding Apple later
Apple ("Sign in with Apple") needs an Apple Developer account ($99/yr) and a
Services ID + key. When you're ready, we do the same shape: create the
credentials in Apple's console, paste them into Supabase → Apple provider, and
I switch the flag to `["google","apple"]`.

## Troubleshooting
- **"redirect_uri_mismatch"** → the Authorized redirect URI in Google (Part A
  step 4) must be the **Supabase callback** exactly:
  `https://rjkgcwswkuhiwavopolb.supabase.co/auth/v1/callback`.
- **"Access blocked / app not verified"** → you're still in Testing mode; add
  the tester's Google address under OAuth consent screen → Test users, or
  Publish the app.
- **Signs in but bounces back to login** → check the Site URL / Redirect URLs
  in Part B step 3 include your exact app URL (with and without the trailing
  slash).
- Your data stays end-to-end encrypted either way — Google only proves who you
  are; it never sees your logs.
