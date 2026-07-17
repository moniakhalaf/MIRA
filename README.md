# MIRA — My Integrated Reasoning Assistant

A personal AI assistant that spans work, health, fitness and everything else — with one non-negotiable rule: **every fact is checked against trusted sources, or it is honestly labelled as an estimate.**

This repository contains the **standalone edition**: a single self-contained `index.html` that runs in any browser on your own Anthropic API key, fully independent of any host platform, and installs to your phone's home screen like a native app.

## What's inside

**Four specialist modes (plus your own custom domains)**
- **Work** — emails, memos, prioritisation, academic support, and deep SAP S/4HANA expertise (MM deepest; SD, FI, CO, PP, PM, QM, EWM, PS, HCM, RE-FX)
- **Health** — nutrition, sleep, recovery and supplementation from reputable evidence, with macro arithmetic shown step by step
- **Healthy snack ideas** — a Snacks tab that shows the calories/protein you have left today and suggests snacks that fit: a curated, evidence-based go-to list (Greek yogurt, boiled eggs, veg & hummus, dates & nuts, labneh…) filterable by goal (high-protein/low-calorie/fibre/healthy-fats/GCC) and one-tap loggable, plus **"Suggest snacks that fit my day"** for a personalised set from MIRA — all with honest per-serving macro estimates
- **Wellness check-in** — a daily mood check with five emoji faces, "what's affecting today" factors, a gratitude line and a private journal. Produces a 0–100 wellness score (with a trend chart in Insights) and an on-demand, honest, evidence-based read from MIRA — warm but never toxic-positive, with a gentle nudge to seek support if entries look concerning
- **Fitness** — evidence-based training and body-composition interpretation from your own InBody log
- **Life** — purchases, travel, tech, finance/legal facts, and Kuwait/GCC local matters. Add a trip (destination, dates, budget) and MIRA runs a live web search to find real flight and hotel options from trusted sources, cited with links — not just a place to log the plan
- **Budget dashboard** — log income and expenses by category and see a spending **donut** ("where it goes most"), your **savings rate**, and a **savings plan**: set a monthly saving amount to project 3/6/12-month totals, add a goal (e.g. a new laptop) to get an ETA, and tap **"Ask MIRA how to save more"** for honest, specific, numbers-anchored saving ideas (information to decide from, not regulated advice)

**Core intelligence**
- Source-verification protocol in every answer: reputable sources only (peer-reviewed journals, WHO/NIH/EFSA, official vendor docs), conflicts shown, nothing invented
- **Live web research** — with the globe toggle on, MIRA searches the real internet through your API key like a professional researcher: primary sources first, cross-checked, cited with working links (Anthropic bills ~$10 per 1,000 searches)
- **Acting on your behalf** — approved email drafts and calendar events become one-tap cards ("Open in Mail", "Add to calendar") fired from your own accounts; draft first, send second, always
- **Specialist embodiment** — each domain answers as a senior professional of that field (the marketer, the engineer, the photographer, the student's tutor); new custom domains get an AI-generated specialist brief
- **Deep Solve** — a two-stage engine for hard problems: problem map first, then systematic resolution with assumptions and trade-offs stated
- Multiple saved conversations per mode, kept until you delete them
- Multilingual — replies in whatever language you write in (Arabic ↔ English mid-conversation)
- Live data awareness — your food log, targets, hydration and InBody history are fed into every conversation automatically ("what should I eat tonight?" gets exact remaining amounts)
- **Command-style search** — "Search everything" jumps to any screen (type "recipes", "sleep", "budget") and searches across tasks, notes, foods, recipes, workouts, bills, trips and chats on this device
- **Grouped areas** — each domain's actions are organised under clear headers (Track · Plan · Tools · Ask MIRA) instead of one long list, so features are easy to find
- **One Home landing** — greeting and search on top, then chips for **Today · Health · Fitness · Work · Life**. "Today" is a **customizable widget board** — tap Customize to choose exactly which widgets you see from a catalog (progress rings for calories/protein/carbs/fat/water/wellness; tiles for sleep, mood, weight, weekly workouts, fasting, next task, open tasks, focus, next bill, habits, spending). Plus recent chats to pick up where you left off; each domain chip shows that area's live stats and quick actions. A floating **+ (quick add)** logs food, water, a workout, weight or a task from anywhere on Home. Four clean tabs: Home · Chat · Insights · Settings
- **Insights** — charts your trends over time from logged data only: weight, calories and protein vs target, sleep, and weekly training volume, each with an honest "not enough data yet" state until there are at least two points
- **Patterns & streaks** — Insights surfaces honest observations from your own logs once there's enough data: logging/check-in/training streaks, whether your wellness score is higher after 7 h+ sleep, and your average protein on training vs rest days — associations to notice, never medical advice
- **Weekly review** — sits at the top of Insights: a cross-domain summary of your last 7 days (training, nutrition, hydration, sleep, tasks, focus, habits, mood, spending) as honest stat tiles — blank means nothing was logged, never faked progress — plus one-tap "Ask MIRA for my weekly review" for grounded wins, watch-outs and next-week priorities
- Guided first-run setup captures your name, profession/field and current primary goal (all editable later in Settings) so answers and reviews stay oriented to what you're working toward

**Nutrition tracker**
- Daily food log grouped by day (today open, past days collapse to one line), each entry timestamped with the time you ate (editable) and **organised by meal — Breakfast · Lunch · Dinner · Snack** (auto-set from the time, changeable per entry) with per-meal subtotals
- **Edit any entry** — tap the pencil to reopen a logged item and change its name, amount, time, meal or macros in place; a one-tap **move-to-meal** button on each entry recategorises it (Breakfast/Lunch/Dinner/Snack) instantly if you picked the wrong one; **delete shows an "Undo"** so a mis-tap never loses data
- **Finish your day** — once you've logged meals, if macros remain MIRA shows the exact kcal/protein/carbs/fat left plus your last-meal time, and **"Suggest what to eat"** proposes 3–5 realistic foods or mini-meals to close the gap (prioritising the biggest shortfall, sensible for the time of day), each one-tap loggable — honest macro estimates
- Targets with goal-completion bars — green tick when reached, amber when exceeded
- Hydration tracker: tap 250 ml glasses, totals shown in glasses and litres
- Portion scaler, saved-foods one-tap re-entry (individually forgettable)
- Photo & PDF intake — nutrition labels read exactly (official, always override databases); meal photos estimated and labelled; everything reviewed before saving. When a label gives values **per 100 g / 100 ml / serving**, the review card asks **how much you actually had** and rescales the macros live — with a one-tap **"Whole pack"** shortcut (e.g. drank the whole 320 ml can, ate the whole 200 g bag)
- "Find macros" for unknown items with honest confidence labels: **official / estimate / not available**
- **Share food log** — pick any From/To date range (or quick 7/30-day/today) and export it as a **shareable message** (native share sheet → WhatsApp, email, Notes…), a **CSV spreadsheet** (Excel/Google Sheets), a **printable PDF**, or copy to clipboard — with daily breakdown, averages, targets, and estimate labels preserved
- **Recipe box (your own recipes)** — starts empty; you fill it with recipes you actually want. **Upload a photo or screenshot of a recipe** — a website, a book page, a note, a social post — and MIRA reads it and fills in the name, ingredients, method and per-serving macros for you to review and save. You can also import from a link (website / Instagram / TikTok) or pasted text, ask MIRA to **find** a recipe for a request ("high-protein GCC dinner under 500 kcal"), or add your own manually. **Browse by category** (Breakfast · Lunch/Dinner · Salads · Snacks · Sweets · Drinks) and **log any recipe as a serving straight into the food log**. Macros are the source's where published or clearly-labelled estimates otherwise
- Sanity checking — energy must be consistent with macros (4P + 4C + 9F); impossible numbers are rejected with the reason shown
- Pan-Arab food and Kuwait restaurant awareness, cooking-method aware (مشوي / مقلي / مسلوق …)

**Body composition**
- InBody log (weight, score, body-fat mass, skeletal-muscle mass, visceral-fat area, phase angle) with automatic per-metric change vs the previous scan
- Fill by uploading a result sheet photo/PDF — values reviewed before saving, never guessed
- One-tap trend analysis in Fitness mode

**Design**
- Seven themes chosen from a visual swatch grid: Dark, Light, Glass (frosted aurora), OLED (true black), Midnight (deep navy + gold), Sepia (warm paper), and Auto (follows the device setting)
- Monochrome line-icon system, mobile-first sizing, installs full-screen to the home screen
- Email sign-up screen built in but feature-flagged off (`FEATURES.emailSignup` in `index.html`) until the hosted backend is published

**Reliability & data safety**
- **Works offline** — a service worker caches the app shell so MIRA launches on the home screen with no connection; it fetches fresh whenever you're online (network-first), so new versions land automatically
- **Backup safety** — Settings shows how long since your last backup (amber when overdue/never) and an on-device storage meter (~5 MB budget), nudging you to export before the browser clears anything
- **Gentle reminders** — contextual, dismissible nudges on Home when relevant (no check-in yet today, water short of goal, nothing logged, backup overdue) — derived from your own data, no background tracking
- **Resilient API calls** — automatic retry with backoff on transient Anthropic overloads/rate-limits, with clear human messages
- **Never white-screens** — if a display error ever occurs, a crash-guard shows a recovery screen ("your data is safe") with reload and backup, instead of a blank page
- Continuous checks — a GitHub Action syntax-validates the app on every change

**Privacy & data ownership**
- All data — logs, targets, saved foods, chats, API key — lives only in your browser; there is no server, account database or cloud copy
- **On-device encryption (opt-in)** — turn it on in Settings → Encryption and everything is encrypted at rest with **AES-GCM 256**. A random data key encrypts your store and is itself wrapped by a key derived from your passphrase (**PBKDF2, 250k iterations**); without the passphrase the storage is unreadable ciphertext, even in dev tools, and **backups are exported already-encrypted**. Enabling verifies the round-trip before anything is removed, a wrong passphrase never destroys data, and the passphrase is unrecoverable by design (write it down — MIRA can't reset it)
- **Face ID / fingerprint unlock** — after encrypting, register a device passkey (**WebAuthn PRF**) to unlock with biometrics; the passphrase always remains the master key, so a biometric hiccup can never lock you out
- **Auto-lock** — clear the key from memory after 1/5/15/60 min idle (or lock on demand), so a walk-away can't expose an unlocked app
- PIN lock (stored only as a hash) still available as a lightweight screen gate
- Backup & restore to a JSON file so nothing is lost across devices or reinstalls
- Own-key model: your Anthropic key never leaves your device except to reach `api.anthropic.com` directly

## Getting started

1. Host `index.html` on any static host (GitHub Pages works: Settings → Pages → deploy from branch), or just open the file in a browser.
2. On first open, set your name, style, depth, language and domains, and paste your Anthropic API key (from [console.anthropic.com](https://console.anthropic.com)).
3. On your phone, open the page and choose **Add to Home Screen** — MIRA runs full-screen like a native app.
4. Export a backup from **Settings → Backup & data** every so often; browser-stored data can be cleared by the device.

## Honest limitations

- With live web search off, MIRA answers from verified knowledge and labels results accordingly; it never invents sources or links.
- Small local venues rarely publish macros, so many restaurant items are estimates by design; your own numbers always take precedence.
- A PIN in a downloadable file is a casual lock, not hardened security — keep the file and backups private.
