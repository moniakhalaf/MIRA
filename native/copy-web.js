/* Copies the live MIRA web app (repo root) into native/www/ so Capacitor can
   bundle it. The root files stay the single source of truth — this never edits
   them, it only copies. Run automatically by the npm scripts. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const www = path.join(__dirname, "www");
fs.mkdirSync(www, { recursive: true });

const files = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "apple-touch-icon.png",
  "icon-512.png",
  "icon-maskable-512.png",
];

let n = 0;
for (const f of files) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(www, f)); n++; }
}
console.log(`Copied ${n} web asset(s) into native/www/`);
