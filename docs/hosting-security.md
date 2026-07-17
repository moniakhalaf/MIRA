# MIRA — Hosting & Security Architecture (multi-user, cloud)

This is the plan for turning MIRA from a **single-user, on-device** app into a
**published, multi-user, cloud-synced** app **without weakening security**. It is
a technical spec and roadmap — not legal advice.

The guiding principle: **zero-knowledge**. The server stores only ciphertext it
**cannot read**. If the database is ever breached, the attacker gets unreadable
blobs. This is how Proton, Bitwarden and Standard Notes work, and it is the
right bar for health data.

---

## 1. The core decision (and its honest trade-off)

| | Zero-knowledge (recommended) | Server-readable |
|---|---|---|
| Server can read user data | **No** | Yes |
| Breach impact | Ciphertext only | Plaintext health data leaks |
| Server-side search / analytics | No | Yes |
| Account recovery | Needs a **recovery key** (or data is lost) | Easy (server can reset) |
| Your legal liability | Much lower | Much higher |

We choose **zero-knowledge**. It is the natural extension of the AES-GCM
encryption already in the app (`SEC` module in `index.html`): today the key
comes from a passphrase and stays on-device; in the cloud version the **same
ciphertext** is what gets synced.

---

## 2. Recommended stack

```
┌────────────┐   TLS    ┌──────────────────────────┐
│  MIRA PWA  │ ───────▶ │  Supabase                │
│ (browser)  │          │  • Auth (passkeys/OAuth) │
│  encrypts  │ ◀──────▶ │  • Postgres + RLS        │
│  data with │  cipher  │  • Storage (blobs)       │
│  E2E key   │  text    │  (stores ciphertext only)│
└─────┬──────┘          └──────────────────────────┘
      │ direct, with the user's OWN key (launch)
      ▼
┌──────────────┐
│ api.anthropic│  ← AI calls never touch your server at launch
└──────────────┘
```

- **Frontend:** the existing PWA (unchanged UI). Add an auth screen + a sync layer.
- **Auth:** **Supabase Auth** — passkeys (WebAuthn) and/or email OTP / Google / Apple. Never roll your own auth.
- **Database:** **Supabase Postgres** with **Row-Level Security (RLS)** so every query is hard-limited to the signed-in user's own rows — enforced by the database, not just app code.
- **Storage of the data:** one encrypted blob per user (plus a monotonically increasing version for conflict handling). Postgres `jsonb`/`bytea` or Supabase Storage.
- **Transport:** TLS everywhere (automatic on Supabase).
- **At rest:** Supabase disk encryption **+** your E2E ciphertext on top.

Alternatives that are also fine: Firebase (Firestore + Auth + Security Rules), Cloudflare (Workers + D1/KV + Access). Supabase is recommended because RLS gives strong per-user isolation with little code.

---

## 3. Encryption & key hierarchy (zero-knowledge)

Never derive the data key from the login password directly, and **never send any
key to the server**. Use an envelope with a recovery path:

```
passphrase ──PBKDF2/Argon2──▶ KEK_pass ┐
                                        ├─wrap─▶ [ Account Key (AK) ] ──AES-GCM──▶ encrypted data blob
passkey (WebAuthn PRF) ──HKDF──▶ KEK_bio ┘        (random, 256-bit)
recovery code ──HKDF──▶ KEK_rec ─wrap──────────────┘
```

- **Account Key (AK):** a random 256-bit AES-GCM key. It actually encrypts the data. It is generated once, on-device, at sign-up.
- The AK is stored on the server **only in wrapped (encrypted) form** — wrapped by:
  1. a key derived from the **passphrase** (PBKDF2 ≥ 250k or Argon2id),
  2. optionally a key derived from a **passkey** (WebAuthn PRF) for Face ID unlock,
  3. a **recovery code** shown once at sign-up ("write this down") — the only way to recover if the passphrase is forgotten.
- To read data: authenticate → download wrapped AK + ciphertext → unwrap AK on-device with passphrase/passkey/recovery → decrypt.
- **Changing the passphrase** re-wraps the AK; it does **not** re-encrypt all data. Fast and safe.
- Reuse the app's existing `SEC` helpers (AES-GCM, PBKDF2, wrap/unwrap) — they already implement this envelope for the on-device case.

**Result:** the server sees an opaque wrapped key + ciphertext. It can authenticate
users and store/serve blobs, but it can never decrypt anyone's data.

---

## 4. Database schema (Supabase / Postgres)

```sql
-- One row per user. Everything sensitive is ciphertext.
create table vaults (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  cipher       bytea       not null,     -- AES-GCM encrypted app state (the whole S blob)
  iv           bytea       not null,
  version      bigint      not null default 1,   -- optimistic concurrency
  updated_at   timestamptz not null default now()
);

-- Wrapped Account Key(s): one per unlock method (pass / passkey / recovery).
create table key_wraps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  method       text not null check (method in ('pass','passkey','recovery')),
  salt         bytea not null,
  wrap_iv      bytea not null,
  wrapped_key  bytea not null,
  meta         jsonb,                     -- e.g. WebAuthn credential id, kdf params
  created_at   timestamptz not null default now()
);

alter table vaults    enable row level security;
alter table key_wraps enable row level security;

-- Every user can touch ONLY their own rows — enforced by the DB.
create policy "own vault"  on vaults    for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own wraps"  on key_wraps for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

RLS is the single most important server-side control: even a bug in app code
cannot let user A read user B's row.

---

## 5. Sync protocol (simple & safe)

The app already keeps all state in one object (`S`). Sync that object as one
encrypted blob:

1. **On change (debounced):** encrypt `S` with AK → `PUT /vaults` with the
   current `version`. Server does an atomic `update ... where version = $expected`
   and returns `version+1`.
2. **Conflict (someone edited on another device):** server rejects the stale
   version; client pulls the newer blob, merges (last-writer-wins per top-level
   list is fine to start; add per-record merge later), re-encrypts, retries.
3. **On launch / focus:** pull latest, decrypt, render.
4. **Offline:** keep working on-device (the app already persists locally and has
   a service worker); sync when back online.

Because the payload is a single opaque blob, the server needs zero knowledge of
MIRA's data model — which is exactly what makes it zero-knowledge.

---

## 6. The AI / API-key model

Two paths; you can ship #1 and add #2 later.

**Launch — bring-your-own key (most private, zero cost/liability to you):**
- Each user pastes their own Anthropic key (encrypted inside their vault).
- AI calls go **directly** from the browser to `api.anthropic.com`.
- Your server never sees prompts **or** data. Cleanest zero-knowledge story.

**Later — you provide AI + subscription (a real product):**
- A backend **proxy** holds one Anthropic key (in a secrets vault, never in the
  client), meters usage per user, rate-limits, and bills via **Stripe**.
- Trade-off to be transparent about: prompts (which contain health text) pass
  **through your server transiently**. Mitigate: TLS, never log prompt bodies,
  process in memory only, document it in the privacy policy.
- Add abuse controls: per-user quotas, spend caps, anomaly alerts.

Recommendation: **launch BYO-key**, add the paid proxy once there's demand.

---

## 7. Migration path (phased, low-risk)

1. **Phase 0 (done):** on-device AES-GCM encryption + passkey unlock (already shipped).
2. **Phase 1 — Accounts:** add Supabase Auth (passkey/email) behind a feature flag; no data leaves the device yet.
3. **Phase 2 — Encrypted sync:** add the vault + key_wraps tables, the E2E key hierarchy, and blob sync. On-device stays the source of truth; cloud is a synced encrypted copy.
4. **Phase 3 — Multi-device & recovery:** recovery codes, sign in on a second device, conflict handling.
5. **Phase 4 (optional) — Paid AI proxy + Stripe.**
6. **Phase 5 — Compliance hardening & launch:** privacy policy, DPA, pen-test, security.txt.

Each phase is shippable and reversible.

---

## 8. Security hardening checklist

- [ ] **RLS on every table**, verified with tests (user A cannot read user B).
- [ ] **TLS/HSTS** everywhere; secure cookies; SameSite.
- [ ] **Content-Security-Policy** on the app (lock down script/connect origins).
- [ ] **Secrets in a vault** (Supabase secrets / env), never in the client bundle or git.
- [ ] **Rate limiting** on auth and any proxy endpoints.
- [ ] **Argon2id or PBKDF2 ≥ 250k** for passphrase KDF; unique salts.
- [ ] **Encrypted, tested backups**; documented restore.
- [ ] **Audit logging** for auth + admin actions; **2FA** for admin accounts.
- [ ] **Dependency & secret scanning** in CI (extend the existing GitHub Action).
- [ ] **`/.well-known/security.txt`** with a contact for responsible disclosure.
- [ ] **Least-privilege** service keys; separate anon vs service-role keys.
- [ ] **Data export & delete** endpoints (user right to their data).
- [ ] **Session timeout / auto-lock** (already in the app) + server session expiry.

---

## 9. Legal & compliance (get a lawyer for the policy)

Health/wellness data is sensitive personal data. Before public launch:

- **Privacy Policy + Terms of Service** (what you collect, why, retention, sharing — for zero-knowledge, "we cannot read your data" is a strong, true selling point).
- **GDPR** (any EU users): lawful basis, consent, data export/erasure, breach notification within 72h, a Data Processing Agreement with Supabase/Anthropic.
- **Kuwait Data Protection** (CITRA DPPR / Law framework) for local users.
- **Anthropic usage policies** and their data-handling terms for the proxy path.
- **HIPAA** generally does **not** apply to a consumer wellness app (it's for US healthcare providers/insurers) — but don't market it as a medical device or make medical claims.
- Keep MIRA's existing honesty rule visible: it's information, not medical advice.

This document is engineering guidance, not legal advice — have a qualified lawyer
review the privacy policy and terms for your jurisdictions.

---

## 10. What you provide vs what I can build

**You provide (accounts/secrets/decisions I can't make for you):**
- Supabase project, domain, Stripe account (if paid), and the lawyer-reviewed policy.
- The choice of BYO-key vs paid proxy.

**I can build:**
- The client-side **auth screens** and **E2E key hierarchy** (reusing `SEC`).
- The **encrypted sync layer** (vault upload/download, versioning, conflict handling).
- The **Supabase schema + RLS policies + migrations** (as in §4).
- The optional **AI-proxy backend** (metering, rate limits, Stripe) if you go paid.
- A **deployment + security runbook** and CI security checks.

---

## 11. Rough cost (order of magnitude)

- **BYO-key + Supabase free/'Pro' tier:** ~$0–25/month until you have real traffic.
- **Paid AI proxy:** you pay Anthropic per token/search + Stripe fees; you'd price a subscription above your blended cost. Add spend caps to avoid surprises.

---

_Bottom line: keep the encryption on the client, let the cloud be a "dumb"
encrypted blob store with strong auth + RLS, and start with bring-your-own key so
your server never sees data or prompts. That gives users real, provable privacy
and keeps your liability low — the best security posture for a health app._
