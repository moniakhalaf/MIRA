/*
 * MIRA regression smoke test.
 *
 * MIRA ships as a single static index.html with no build step, so this is a
 * dev-only safety net: run it before every deploy to catch the kinds of bugs
 * that have slipped through to the phone (recipe save blocked, gram parsing,
 * broken encrypted backup). It is NOT shipped with the app.
 *
 * What it checks
 *   1. Syntax   — every inline <script> block parses (pure Node, always runs).
 *   2. Parsing  — amountToGrams / ingGrams handle kg, kilo, litres, ml, bare
 *                 numbers, big quantities, and "2 eggs" (no unit -> 0).
 *   3. Dish save — cooking a dish still saves to the recipe box even when the
 *                 AI corrects an ingredient's spelling (the bug fixed in .273).
 *   4. Backup   — AES-GCM encrypt -> decrypt round-trips (E2EE cloud backup).
 *
 * Run:  node tests/regression.mjs
 * Needs (dev only):  npm install playwright-core   + a Chromium/headless_shell.
 * Steps 2-4 auto-skip (not fail) if no browser is found; step 1 always runs.
 */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const INDEX = path.join(ROOT, "index.html");
const require = createRequire(import.meta.url);

let pass = 0, fail = 0, skip = 0;
const ok   = (name)      => { pass++; console.log(`  ✓ ${name}`); };
const bad  = (name, why) => { fail++; console.log(`  ✗ ${name}\n      ${why}`); };
const eq   = (name, got, want) =>
  JSON.stringify(got) === JSON.stringify(want)
    ? ok(name)
    : bad(name, `expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);

// ---------------------------------------------------------------- 1. syntax
function syntaxCheck(html) {
  console.log("\n1. Inline script syntax");
  const re = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(html))) {
    i++;
    try { new vm.Script(m[1], { filename: `script#${i}` }); ok(`script #${i} parses`); }
    catch (e) { bad(`script #${i} parses`, e.message); }
  }
}

// ------------------------------------------------ locate a Chromium binary
function findBrowser() {
  const envs = [process.env.PW_CHROMIUM, process.env.CHROMIUM_PATH].filter(Boolean);
  for (const p of envs) if (fs.existsSync(p)) return p;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  const candidates = [];
  try {
    for (const d of fs.readdirSync(base)) {
      if (/^chromium/.test(d)) {
        candidates.push(path.join(base, d, "chrome-linux", "headless_shell"));
        candidates.push(path.join(base, d, "chrome-linux", "chrome"));
      }
    }
  } catch { /* base dir absent */ }
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// -------------------------------------------- 2-4. browser-driven checks
async function browserChecks(html) {
  let chromium;
  try { ({ chromium } = require("playwright-core")); }
  catch { console.log("\n(skipping browser checks: playwright-core not installed)"); skip += 3; return; }
  const exe = findBrowser();
  if (!exe) { console.log("\n(skipping browser checks: no Chromium binary found)"); skip += 3; return; }

  const browser = await chromium.launch({ executablePath: exe, headless: true });
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto("file://" + INDEX);
    await page.waitForTimeout(400);

    // ---- 2. gram parsing --------------------------------------------------
    console.log("\n2. Ingredient gram parsing");
    const parse = await page.evaluate(() => ({
      kg:     ingGrams("2 kg"),
      kilo:   ingGrams("2 kilo"),
      kilos:  ingGrams("2 kilos"),
      grams:  ingGrams("500 g"),
      bare:   ingGrams("50"),
      big:    ingGrams("2000 g"),
      litre:  ingGrams("1.5 l"),
      ml:     ingGrams("250 ml"),
      eggs:   ingGrams("2 eggs"),
      a2kg:   amountToGrams("2 kg"),
      a2kilo: amountToGrams("2 kilo"),
    }));
    eq("2 kg   -> 2000 g", parse.kg, 2000);
    eq("2 kilo -> 2000 g", parse.kilo, 2000);
    eq("2 kilos-> 2000 g", parse.kilos, 2000);
    eq("500 g  -> 500 g",  parse.grams, 500);
    eq("50     -> 50 g (bare number)", parse.bare, 50);
    eq("2000 g -> 2000 g (big qty)",   parse.big, 2000);
    eq("1.5 l  -> 1500 g", parse.litre, 1500);
    eq("250 ml -> 250 g",  parse.ml, 250);
    eq("2 eggs -> 0 (no weight unit)", parse.eggs, 0);
    eq("amountToGrams 2 kg",   parse.a2kg, 2000);
    eq("amountToGrams 2 kilo", parse.a2kilo, 2000);

    // ---- 3. dish save survives AI spelling correction ---------------------
    console.log("\n3. Cooked-dish save (with AI spelling correction)");
    const save = await page.evaluate(async () => {
      window.llmJsonCall = async (_sys, user) => {
        const lines = String(user).split("\n").filter((l) => l.trim().startsWith("- "));
        return JSON.stringify(lines.map((l) => {
          const nm = l.trim().slice(2).split("—")[0].trim();
          const fixed = nm.toLowerCase() === "parsely" ? "Parsley" : nm; // AI corrects the typo
          return { name: fixed, amount: "100 g", kcal: 100, p: 5, c: 8, f: 5, yield: 1, note: "" };
        }));
      };
      S.settings.apiKey = "test-key";
      dishForm.open = true; dishForm.editId = null; dishForm.name = "Zucchini Stew";
      dishForm.ings = [
        { n: "Zucchini",  a: "2 kilo" },
        { n: "Onion",     a: "200 g" },
        { n: "Olive oil", a: "3 tbsp" },
        { n: "Parsely",   a: "100 g" }, // deliberate typo
      ];
      dishForm.res = null;

      await dishMacros();
      const items = (dishForm.res && dishForm.res.items) || [];
      const pendingAfter = dishPendingIngs().length;
      const dupParsley = items.filter((x) => /parsley/i.test(x.name)).length;

      const before = (S.recipes || []).length;
      await dishSaveToRecipes();
      const after = (S.recipes || []).length;

      return { pendingAfter, dupParsley, added: after - before, name: (S.recipes[0] || {}).name };
    });
    eq("no ingredient left pending after pricing", save.pendingAfter, 0);
    eq("corrected ingredient not duplicated", save.dupParsley, 1);
    eq("recipe saved to the box", save.added, 1);
    eq("saved recipe keeps its name", save.name, "Zucchini Stew");

    // ---- 4. encrypted backup round-trip -----------------------------------
    console.log("\n4. Encrypted backup round-trip (AES-GCM)");
    const crypto = await page.evaluate(async () => {
      const secret = JSON.stringify({ hello: "world", n: 42, arr: [1, 2, 3] });
      // passphrase -> key -> encrypt -> decrypt (the cloud-backup path)
      const dek = await SEC.genDEK();
      const enc = await SEC.encData(dek, secret);
      const dec = await SEC.decData(dek, enc);
      // wrong-key must fail (data stays private without the passphrase)
      let wrongFailed = false;
      try { await SEC.decData(await SEC.genDEK(), enc); } catch { wrongFailed = true; }
      return { roundTrips: dec === secret, hasCipher: !!(enc && enc.iv && enc.ct), wrongFailed };
    });
    eq("plaintext survives encrypt -> decrypt", crypto.roundTrips, true);
    eq("ciphertext produced (iv + ct)", crypto.hasCipher, true);
    eq("wrong key cannot decrypt", crypto.wrongFailed, true);

    // ---- 5. meal-prep totals ---------------------------------------------
    console.log("\n5. Prepared-meals totals");
    const prep = await page.evaluate(() => {
      S.prep = [
        { id: "a", name: "Baladi bread", meal: "breakfast", kcal: 284, p: 9.8, c: 54.7, f: 2.2 },
        { id: "b", name: "Makdous",      meal: "breakfast", kcal: 103, p: 1.7, c: 5.1,  f: 9.1 },
        { id: "c", name: "Labneh",       meal: "breakfast", kcal: 197, p: 9,   c: 5.4,  f: 15.1 },
        { id: "d", name: "Chicken",      meal: "lunch",     kcal: 300, p: 40,  c: 0,    f: 14 },
      ];
      const grand = prepMacroSum(S.prep);
      const bfast = prepMacroSum(S.prep.filter((p) => p.meal === "breakfast"));
      const html = prepHTML();
      return { grand, bfast, hasTotalRow: /prep-total/.test(html), hasSub: /prep-sub/.test(html) };
    });
    eq("grand total sums every item", prep.grand, { kcal: 884, p: 60.5, c: 65.2, f: 40.4 });
    eq("breakfast subtotal sums its 3 items", prep.bfast, { kcal: 584, p: 20.5, c: 65.2, f: 26.4 });
    eq("grand-total row renders", prep.hasTotalRow, true);
    eq("per-meal subtotal renders", prep.hasSub, true);

    // ---- 6. Save-to-meal-prep uses your weighed portion, not the whole dish -
    console.log("\n6. Recipe -> meal prep saves the chosen portion");
    const portion = await page.evaluate(async () => {
      S.recipes = [{ id: "r1", name: "High-protein bake", servings: 1,
        per: { kcal: 2040, p: 155.5, c: 71, f: 124.3 }, cookedWeight: 1813 }];
      S.prep = [];
      R.recipeGrams = "300";                 // the portion typed in the Log-by-weight card
      const s = recipePrepServing(S.recipes[0]);
      await M.recipeToPrep("r1", s.inDish);  // save via the real path
      const saved = S.prep[0] || {};
      return { servingKcal: Math.round(s.kcal), amount: saved.amount, kcal: saved.kcal,
        qty: saved.qty, inDish: s.inDish, isPortion: s.portion };
    });
    eq("serving = 300 g portion, not whole dish", portion.servingKcal, 338);
    eq("saved amount is the portion", portion.amount, "300 g");
    eq("saved kcal is the portion", portion.kcal, 338);
    eq("count defaults to portions in the dish", portion.qty, 6);
    eq("flagged as a weighed portion", portion.isPortion, true);

    // ---- 7. Adaptive targets: measure & apply real maintenance ------------
    console.log("\n7. Adaptive maintenance (measure from data + apply)");
    const adapt = await page.evaluate(async () => {
      const day = (back) => new Date(Date.now() - back * 864e5).toLocaleDateString("en-CA");
      S.foods = [];
      for (let i = 0; i < 14; i++) S.foods.push({ date: day(i), name: "meal", kcal: 1850, p: 120, c: 150, f: 60 });
      S.inbody = [{ date: day(20), weight: 80.0 }, { date: day(0), weight: 79.0 }]; // losing ~1 kg / 20 d
      S.settings.maintenanceKcal = 2400;   // a stale, drifted value
      const e = expenditureEstimate();
      await M.adaptMaintApply();
      return { tdee: e && e.tdee, applied: num(S.settings.maintenanceKcal),
        plausible: !!(e && e.tdee > 1900 && e.tdee < 2600) };
    });
    eq("maintenance measured from intake + weight trend", adapt.plausible, true);
    eq("apply writes the measured value to settings", adapt.applied, adapt.tdee);

    // ---- 8. Favorites: pin a food and one-tap log it ----------------------
    console.log("\n8. Favorites (pin + one-tap log)");
    const fav = await page.evaluate(async () => {
      const today = new Date().toLocaleDateString("en-CA");
      S.foods = [{ id: "f1", date: today, name: "Greek yogurt", amount: "170 g", kcal: 100, p: 17, c: 6, f: 0 }];
      S.favs = [];
      M.favToggleItem("f1");                 // pin it
      const pinnedAfterAdd = isFav("Greek yogurt");
      const before = S.foods.length;
      M.favLog(0);                           // one-tap log from favorites
      const loggedName = (S.foods[S.foods.length - 1] || {}).name;
      const added = S.foods.length - before;
      M.favToggleItem("f1");                 // unpin
      return { pinnedAfterAdd, added, loggedName, pinnedAfterRemove: isFav("Greek yogurt"), favCount: S.favs.length };
    });
    eq("pinning a food adds it to favorites", fav.pinnedAfterAdd, true);
    eq("favorite logs in one tap", fav.added, 1);
    eq("logged the right food", fav.loggedName, "Greek yogurt");
    eq("unpinning removes it", fav.pinnedAfterRemove, false);
    eq("favorites list empty after unpin", fav.favCount, 0);

    // ---- 9. Deficit Home widget ------------------------------------------
    console.log("\n9. Deficit widget");
    const defw = await page.evaluate(() => {
      const today = new Date().toLocaleDateString("en-CA");
      S.settings.maintenanceKcal = 2150;
      S.foods = [{ id: "d1", date: today, name: "day", kcal: 1800, p: 100, c: 180, f: 60 }];
      const d = widgetData("deficit");
      // now go over maintenance
      S.foods.push({ id: "d2", date: today, name: "extra", kcal: 600, p: 0, c: 80, f: 20 });
      const over = widgetData("deficit");
      return { label: d.label, center: d.center, overLabel: over.label, overCenter: over.center,
        inCatalog: WIDGET_META.some(w => w.id === "deficit") };
    });
    eq("deficit widget shows the deficit number", defw.center, "350");   // 2150 - 1800
    eq("deficit widget labels a deficit", defw.label, "Deficit today");
    eq("flips to surplus when over maintenance", defw.overLabel, "Surplus today");
    eq("surplus number is correct", defw.overCenter, "250");             // 2400 - 2150
    eq("deficit is in the widget catalog", defw.inCatalog, true);

    // ---- 10. Storage stats + photo cleanup -------------------------------
    console.log("\n10. Storage meter, breakdown & cleanup");
    const stor = await page.evaluate(() => {
      const bigImg = "data:image/jpeg;base64," + "A".repeat(60000);
      S.photos = [{ id: "p1", date: "2026-01-01", data: bigImg }, { id: "p2", date: "2026-02-01", data: bigImg }];
      S.recipes = [{ id: "r1", name: "Bake", image: "data:image/jpeg;base64," + "B".repeat(40000), per: {} }];
      const st = storageStats();
      const photoBytesBefore = st.photos;
      const topKey = st.parts[0] && st.parts[0].key;
      M.clearPhotos = M.clearPhotos; // ensure present
      // simulate the confirm() as accepted
      const origConfirm = window.confirm; window.confirm = () => true;
      M.clearPhotos();
      window.confirm = origConfirm;
      return { photoBytesBefore, topKey, photosAfter: (S.photos || []).length,
        recipeImgBytes: storageStats().recipeImgs, fmt: fmtBytes(1536), fmtMb: fmtBytes(2 * 1048576) };
    });
    eq("photos measured as biggest space user", stor.topKey, "Photos");
    eq("photo bytes counted (~120 KB)", stor.photoBytesBefore > 100000, true);
    eq("clear photos empties the album", stor.photosAfter, 0);
    eq("recipe image bytes still counted", stor.recipeImgBytes > 30000, true);
    eq("fmtBytes KB", stor.fmt, "1.5 KB");
    eq("fmtBytes MB", stor.fmtMb, "2.0 MB");

    // ---- 11. Shareable weekly progress card ------------------------------
    console.log("\n11. Weekly progress card (banked math + PNG)");
    const week = await page.evaluate(async () => {
      const day = (b) => new Date(Date.now() - b * 864e5).toLocaleDateString("en-CA");
      S.settings.maintenanceKcal = 2150;
      S.foods = [];
      for (let i = 0; i < 5; i++) S.foods.push({ id: "w" + i, date: day(i), name: "meal", kcal: 1800, p: 140, c: 150, f: 55 });
      const bk = weekBanked();
      const blob = await weekReportImage();
      const cap = weekShareCaption();
      return { banked: bk && bk.banked, days: bk && bk.days, kgOk: !!(bk && Math.abs(bk.kg - 1750 / 7700) < 1e-6),
        blobType: blob && blob.type, blobHasBytes: !!(blob && blob.size > 1000), capHasMira: /MIRA/.test(cap) };
    });
    eq("banked = sum of (maintenance - eaten)", week.banked, 1750);   // 5 * (2150-1800)
    eq("counts only logged days", week.days, 5);
    eq("kg conversion uses 7700 kcal/kg", week.kgOk, true);
    eq("produces a PNG blob", week.blobType, "image/png");
    eq("PNG has real bytes", week.blobHasBytes, true);
    eq("share caption is branded", week.capHasMira, true);

    // ---- 12. Reminders: schedule logic + native bridge -------------------
    console.log("\n12. Reminders (schedule payload + native sync)");
    const rem = await page.evaluate(async () => {
      S.settings.reminders = {enabled: true, items: {
        breakfast: {on: true, time: "08:15"}, lunch: {on: false}, dinner: {on: false}, water: {on: true, time: "15:30"},
      }};
      const activeIds = Reminders.active().map(x => x.id).sort();
      const payload = Reminders.payload();
      const bf = payload.find(p => p.id === 101);
      // web (no Capacitor) sync is a no-op that reports native:false
      const webSync = await Reminders.sync();
      // now mock the native plugin and confirm it schedules the active ones
      const scheduled = [];
      window.Capacitor = {Plugins: {LocalNotifications: {
        checkPermissions: async () => ({display: "granted"}),
        requestPermissions: async () => ({display: "granted"}),
        cancel: async () => {},
        schedule: async (o) => { o.notifications.forEach(n => scheduled.push(n.id)); },
      }}};
      const nativeSync = await Reminders.sync();
      delete window.Capacitor;
      return {activeIds, bfHour: bf && bf.schedule.on.hour, bfMin: bf && bf.schedule.on.minute,
        bfRepeats: bf && bf.schedule.repeats, webNative: webSync.native, nativeScheduled: nativeSync.scheduled, scheduledIds: scheduled.sort()};
    });
    eq("only enabled reminders are active", rem.activeIds, ["breakfast", "water"]);
    eq("breakfast scheduled at 08:15", [rem.bfHour, rem.bfMin], [8, 15]);
    eq("reminders repeat daily", rem.bfRepeats, true);
    eq("web sync is a graceful no-op", rem.webNative, false);
    eq("native sync schedules the active reminders", rem.nativeScheduled, 2);
    eq("native scheduled the right notification ids", rem.scheduledIds, [101, 104]);

    console.log("\n" + (errs.length ? "Console errors: " + JSON.stringify(errs) : "No console errors."));
    if (errs.length) fail += errs.length;
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------------- run
const html = fs.readFileSync(INDEX, "utf8");
console.log("MIRA regression smoke test");
console.log("Build:", (html.match(/const BUILD = "([^"]+)"/) || [])[1] || "?");
syntaxCheck(html);
await browserChecks(html);

console.log(`\n${"=".repeat(40)}`);
console.log(`PASS ${pass}   FAIL ${fail}   SKIP ${skip}`);
process.exit(fail ? 1 : 0);
