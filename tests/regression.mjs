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
