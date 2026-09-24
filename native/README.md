# MIRA — native app wrapper (Capacitor)

This folder packages the **existing MIRA web app** (the `index.html` at the repo
root) into real **iOS** and **Android** apps for the App Store / Google Play —
**without changing the live web app at all**. The root files stay the single
source of truth; `copy-web.js` just copies them into `www/`.

Nothing here runs or affects the GitHub Pages site. It sits ready until you
decide to publish.

## What you need first
- **Node.js** installed on your computer.
- **Android:** [Android Studio] (works on Windows / macOS / Linux) + a **Google
  Play Developer** account ($25, one-time).
- **iOS:** a **Mac** with **Xcode** + an **Apple Developer** account ($99/year).

## Build it (Android first — easiest)
From this `native/` folder:
```bash
npm install
npm run add:android      # copies the web app, adds the Android project, syncs
npm run open:android     # opens Android Studio → Build → Run / generate AAB
```

## Build it (iOS — needs a Mac)
```bash
npm install
npm run add:ios
npm run open:ios         # opens Xcode → set signing team → Run / Archive
```

## Whenever you update the web app
The web app is the source of truth. After deploying a new build, refresh the
native bundle and re-open:
```bash
npm run sync             # re-copies the latest web app + syncs native projects
```
Then rebuild in Android Studio / Xcode and submit the update.

## App identity
- App ID: `com.moniakhalaf.mira` (change in `capacitor.config.json` before first
  publish if you want a different bundle id — it can't be changed after release).
- App name: **MIRA**. Icons live at the repo root (`icon-512.png`,
  `icon-maskable-512.png`, `apple-touch-icon.png`).

## Notes / things to decide before store submission
- **Payments:** if you charge for Pro/Team *inside the iOS app*, Apple requires
  In-App Purchase (15–30% fee) — you can't use Stripe there. Web/Android differ.
- **Social login:** Google/Apple sign-in in native needs deep-link handling
  (Capacitor Browser/App plugins) and, on iOS, "Sign in with Apple" becomes
  required if you offer other social logins. Email + password works as-is.
- **Push notifications, biometric unlock, Health data:** available later via
  Capacitor plugins if you want native features.
- `www/`, `android/`, `ios/`, `node_modules/` are generated and git-ignored.
