# MIRA — product & engineering review

A professional pass over the whole app, focused on the highest-leverage
improvements for user experience and for long-term health of the codebase.
Each item is tagged **Impact** (to the user) and **Effort** (to build).

---

## ✅ Shipped this session (build .282)

The top of the roadmap is done — each item tested and bilingual (EN/AR):

1. **Adaptive targets** — MIRA measures your real maintenance from intake +
   weight trend and offers a one-tap recalibration when it drifts (Insights +
   Settings). *(Tier 1 #1)*
2. **Faster logging — favorites** — pin any food with a star for one-tap
   logging, alongside the existing frequent/copy-day tools. *(Tier 1 #3)*
3. **Deficit Home widget** — a glanceable "Deficit today" ring, green under
   maintenance / amber over. *(Tier 1 #4)*
4. **Storage hardening** — a "what's using space" breakdown, one-tap photo
   cleanup, and quota-aware save that never fails silently. *(Tier 2 #5)*
5. **Shareable weekly progress card** — the weekly report as a polished PNG
   (score, key numbers, deficit banked, a win) via the native share sheet.
   *(Tier 2 #8)*
6. **Daily reminders** — meal/water/weight/review notifications; real on-device
   notifications in the native app (Capacitor Local Notifications, wired into
   the scaffold), saved-and-ready on the web. *(Tier 1 #2 — the native path)*

Plus earlier fixes this session: recipe-save name-drift, large-portion gram
parsing, meal-prep servings/totals, and a **dev regression suite** (`tests/`)
now at 66 checks, run before every deploy.

## What still needs a platform MIRA doesn't have yet
- **Background reminders / Apple Health / Google Fit** → the **native app**
  (reminders code is already written and waiting).
- **Weekly email summary, coach login, real payments** → the **hosted backend**
  (the `backend/` scaffold is ready).

## Launch checklist (what's left is shipping, not coding)
1. **Google sign-in** — do Parts A & B in `docs/google-signin-setup.md`, then
   tell me "Google is on" and I flip the flag.
2. **Native app** — `cd native && npm install && npm run add:android`
   (or `add:ios` on a Mac), open in Android Studio / Xcode, build. Reminders and
   Health become available there.
3. **Testers** — the web PWA at the GitHub Pages URL already works for testers
   today (account + encrypted backup + everything above).

---

## Where MIRA stands today

This is a strong, mature app, not an early prototype. It already has:
encrypted on-device data + E2EE cloud backup, undo, crash-recovery, full
EN/AR with RTL, water, fasting, meal planning, barcode + photo meal scan,
InBody tracking, TDEE + deficit + calorie bank, weekly review, recipe box
with pricing, meal prep, streaks, an AI chat across Work/Health/Life/Train,
and an installable PWA. The bar is high, so the notes below are about going
from "very good" to "best-in-class."

**Two honest realities to design around:**
- It's a **single 1.4 MB, ~17k-line `index.html`** (1,024 functions). That's a
  legitimate deployment choice for a PWA, but it shapes several
  recommendations below (load speed, testing, storage).
- The **only automated test** is the smoke test we just added. Correctness-
  critical math (macros, TDEE, deficit) has bitten before and deserves more.

---

## Tier 1 — do these first (biggest UX return)

### 1. Adaptive targets (auto-recalibrating TDEE) — **Impact: very high · Effort: medium**
Right now maintenance/target is set once from a formula. The single most
valuable thing a calorie app can do is **learn the user's real TDEE from their
own data**: compare logged intake vs. actual weight-trend change over 2–3 weeks
and nudge the calorie target to match. It turns MIRA from a calculator into a
coach, and it's a genuine differentiator. You already have all the inputs
(intake history + smoothed weight trend + the 7,700 kcal/kg constant).
- Show it as a gentle card: *"Your real maintenance looks closer to 2,050 than
  2,151 — want me to update your target?"* (always opt-in, never silent).

### 2. Real reminders / notifications — **Impact: very high · Effort: medium**
Today reminders are in-app nudges + calendar `.ics` export. The biggest driver
of retention in a habit app is a **timely push**: "log lunch?", "fasting window
ends in 30 min", "weigh-in day", "you're 20 g protein short with 3 h left."
- Use the Notification API + service-worker `showNotification` for installed
  PWAs (works on iOS 16.4+ when added to Home Screen; degrade gracefully
  elsewhere). Let the user pick which nudges and quiet hours.

### 3. Faster logging (the #1 retention lever) — **Impact: very high · Effort: low–medium**
Food logging lives or dies on friction. Add:
- **Recents & Favorites**: a one-tap row of the foods this user logs most, and
  a ⭐ to pin favorites. "Log again" from any past entry.
- **Copy a day**: "same as yesterday" / duplicate any previous day's meals.
- **First-class voice logging**: you already have voice hooks — make
  *"two eggs and a slice of toast"* a headline entry point that parses to items.

### 4. A glanceable Home summary — **Impact: high · Effort: low**
Add a single at-a-glance header: three rings/bars for **calories, protein, and
today's deficit** vs. target, with the number that matters most (remaining
kcal) largest. Users should learn their day in under a second before scrolling.

---

## Tier 2 — strong value, do next

### 5. Storage hardening for the long haul — **Impact: high · Effort: medium**
Everything is one JSON blob in `localStorage` (~5 MB cap), and progress photos
are resized but still stored inline. As history + photos grow, a heavy user can
hit the quota; today that's a toast and a stuck save.
- Move **photos and long history to IndexedDB** (already used for the crypto
  key), keep the hot state in `localStorage`.
- Add a **"Storage used" meter** in Settings and a quota-aware save that warns
  and offers to archive/export old data *before* it fails.

### 6. Apple Health / Google Fit two-way sync — **Impact: high · Effort: high**
You have "Sync & import from fitness apps." Deepening this to **auto-import
weight, steps, and workouts** (and optionally write back nutrition) removes
manual entry and feeds the adaptive-target loop in #1. On native (Capacitor)
this is a Health plugin; on web it's file import.

### 7. Load performance — **Impact: medium–high · Effort: low**
Parsing 1.4 MB on every cold start is the main perceived-speed cost.
- Switch the service worker to **precache the shell + stale-while-revalidate**
  so repeat opens are instant and offline-solid.
- Consider a tiny **build step** that concatenates source modules into the one
  shipped `index.html` — you keep single-file deploy but develop in parts
  (smaller diffs, easier review, room to code-split later).

### 8. Weekly review as the emotional payoff — **Impact: high · Effort: low–medium**
You already compute a weekly review. Make it a **shareable progress card**
(a rendered image: deficit banked, protein hit-rate, weight trend, a win and a
tip). Sharing is the cheapest growth channel and the card is its own reward.

---

## Tier 3 — engineering health (protects everything above)

### 9. Expand the regression tests — **Impact: high (indirect) · Effort: low**
The math is the product's credibility. Add cases for: TDEE for a few
body profiles, deficit/bank accumulation, recipe per-gram scaling, barcode →
macros, and the meal-prep totals. Run before every deploy (already wired).

### 10. Accessibility pass — **Impact: medium · Effort: medium**
Good `aria` coverage already. The full-rerender model can drop focus and
screen-reader context, though. Add: focus restoration after `render()`, an
`aria-live` region for toasts, visible focus rings, and a real screen-reader
walkthrough of the core flows. Honor `prefers-reduced-motion` everywhere.

### 11. Error visibility — **Impact: medium · Effort: low**
Failures currently surface as toasts. Add an opt-in, privacy-respecting local
error log (viewable in Settings) so when a user says "it broke," there's a
breadcrumb — without sending anything off device unless they choose to.

---

## Tier 4 — nice-to-have / differentiators
- **Barcode-to-pantry & smart shopping list** from the meal plan (you have the
  pieces).
- **Restaurant / eating-out mode**: quick estimates for meals you didn't cook.
- **Trends you can ask about in chat**: "how was my protein last week?" answered
  from local data (you already have the AI + the data).
- **Widgets / lock-screen** (native): remaining calories at a glance.
- **Multi-device conflict UX**: clear "this device is newer" merge prompt on
  restore (partly handled by the backup reconcile).

---

## If I had to pick three
1. **Adaptive targets (#1)** — turns the app into a coach; nothing else on the
   market for this user does it well.
2. **Real reminders (#2)** — the habit engine that drives daily return.
3. **Faster logging (#3)** — recents/favorites/voice/copy-day; the difference
   between an app people keep and one they abandon in week two.

Everything here is additive and fits the existing architecture — no rewrite
required.
