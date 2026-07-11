# MIRA — My Integrated Reasoning Assistant

A personal AI assistant that spans work, health, fitness and everything else — with one non-negotiable rule: **every fact is checked against trusted sources, or it is honestly labelled as an estimate.**

This repository contains the **standalone edition**: a single self-contained `index.html` that runs in any browser on your own Anthropic API key, fully independent of any host platform, and installs to your phone's home screen like a native app.

## What's inside

**Four specialist modes (plus your own custom domains)**
- 💼 **Work** — emails, memos, prioritisation, academic support, and deep SAP S/4HANA expertise (MM deepest; SD, FI, CO, PP, PM, QM, EWM, PS, HCM, RE-FX)
- 🥗 **Health** — nutrition, sleep, recovery and supplementation from reputable evidence, with macro arithmetic shown step by step
- 🏋️ **Fitness** — evidence-based training and body-composition interpretation from your own InBody log
- 🌍 **Life** — purchases, travel, tech, finance/legal facts, and Kuwait/GCC local matters

**Core intelligence**
- Source-verification protocol in every answer: reputable sources only (peer-reviewed journals, WHO/NIH/EFSA, official vendor docs), conflicts shown, nothing invented
- 🧠 **Deep Solve** — a two-stage engine for hard problems: problem map first, then systematic resolution with assumptions and trade-offs stated
- Multilingual — replies in whatever language you write in (Arabic ↔ English mid-conversation)
- Live data awareness — your food log, targets, hydration and InBody history are fed into every conversation automatically ("what should I eat tonight?" gets exact remaining amounts)

**Nutrition tracker**
- Daily food log grouped by day (today open, past days collapse to one line)
- Targets with goal-completion bars — green tick when reached, amber when exceeded
- Hydration tracker: tap 250 ml glasses, totals shown in glasses and litres
- Portion scaler, saved-foods one-tap re-entry (individually forgettable)
- 📷 Photo & PDF intake — nutrition labels read exactly (official, always override databases); meal photos estimated and labelled; everything reviewed before saving
- "Find macros" for unknown items with honest confidence labels: **official / estimate / not available**
- Sanity checking — energy must be consistent with macros (4P + 4C + 9F); impossible numbers are rejected with the reason shown
- Pan-Arab food and Kuwait restaurant awareness, cooking-method aware (مشوي / مقلي / مسلوق …)

**Body composition**
- InBody log (weight, score, body-fat mass, skeletal-muscle mass, visceral-fat area, phase angle) with automatic per-metric change vs the previous scan
- Fill by uploading a result sheet photo/PDF — values reviewed before saving, never guessed
- One-tap trend analysis in Fitness mode

**Privacy & data ownership**
- 🔒 PIN lock (stored only as a hash), auto-unlocks on the last digit, animated indicators
- All data — logs, targets, saved foods, chats, API key — lives only in your browser
- Backup & restore to a JSON file so nothing is lost across devices or reinstalls
- Own-key model: your Anthropic key never leaves your device except to reach `api.anthropic.com` directly

## Getting started

1. Host `index.html` on any static host (GitHub Pages works: Settings → Pages → deploy from branch), or just open the file in a browser.
2. On first open, set your name, style, depth, language and domains, and paste your Anthropic API key (from [console.anthropic.com](https://console.anthropic.com)).
3. On your phone, open the page and choose **Add to Home Screen** — MIRA runs full-screen like a native app.
4. Export a backup from **Settings → Backup & data** every so often; browser-stored data can be cleared by the device.

## Honest limitations

- No live web search in this runtime — MIRA answers from verified knowledge and labels results accordingly; it never invents sources or links.
- Small local venues rarely publish macros, so many restaurant items are estimates by design; your own numbers always take precedence.
- A PIN in a downloadable file is a casual lock, not hardened security — keep the file and backups private.
