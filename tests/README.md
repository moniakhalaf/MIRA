# MIRA smoke tests

MIRA is a single static `index.html` with no build step. This folder is a
**dev-only** safety net — run it before every deploy to catch the bugs that
have reached the phone before (recipe save blocked, gram parsing, broken
encrypted backup). Nothing here ships with the app.

## Run

```bash
npm install playwright-core     # once, dev-only (git-ignored)
node tests/regression.mjs
```

- Exits `0` if everything passes, `1` if anything fails.
- The syntax check always runs. The browser checks (parsing, dish save,
  encrypted backup) need `playwright-core` **and** a Chromium binary; they
  **skip** (not fail) if neither is present.
- Point it at a specific Chromium with `PW_CHROMIUM=/path/to/chrome` if it
  can't find one under `/opt/pw-browsers` or `$PLAYWRIGHT_BROWSERS_PATH`.

## What it covers

| # | Area | Why it's here |
|---|------|---------------|
| 1 | Inline `<script>` syntax | A stray typo used to blank the whole app |
| 2 | `amountToGrams` / `ingGrams` | kg, kilo, litres, ml, bare numbers, big qty, "2 eggs" -> 0 |
| 3 | Cooked-dish save | Saving still works when the AI corrects an ingredient's spelling (fixed in build .273) |
| 4 | Encrypted backup | AES-GCM encrypt -> decrypt round-trips; wrong key can't decrypt |

Add a case here whenever a bug reaches the phone, so it can't come back.
