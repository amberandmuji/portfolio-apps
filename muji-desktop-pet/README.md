# Muji · Desktop Pom

A cosy 8-bit Pomeranian who lives along the bottom of your Mac screen, drawn from photos of Muji. He wanders, sniffs, sits, looks at you, yawns, stretches and does the odd zoomies. He gets tired and naps, curled up or belly-up, is sleepier in the evening and sleeps through the night (10:30pm–7am). Step away for 5 minutes and he curls up; come back and he stretches and says hi. The overlay is click-through and shows on every Space, including full-screen apps.

## About Muji

Muji is my Pomeranian, and he lives in Taiwan. This little pixel version of him is drawn from his real photos.

Every sprite is based on him: his deep ginger coat with the darker crown and cheeks, the cream bib, legs and plume of a tail curled over his back, his big shiny dark eyes and his open-mouthed, tongue-out smile. His poses come from the photos too. There's the front-facing "looking at you" sit, the flat-out pancake on the floor, the curled-up nap and the belly-up sleep with his paws in the air.

## Using it

- **Preview:** open `index.html` in a browser. It's a single self-contained file (fonts load from Google Fonts) that runs the same behaviour as the Mac app, with Muji wandering along the bottom of the page. "Zoomies!" sends him running, and "Speed up time ×20" and "Pretend I left" show the nap-and-greet cycle quickly.
- **Mac app (macOS 13+):** paste this into Terminal:

  ```
  curl -fsSL https://raw.githubusercontent.com/amberandmuji/portfolio-apps/main/muji-desktop-pet/install.sh | bash
  ```

  It downloads the latest build, installs him to `/Applications` and opens him. Releases are semantically versioned: pushing a tag like `muji-v1.2.3` runs `.github/workflows/muji-release.yml`, which builds the app with that version and publishes it as the latest release. `.github/workflows/muji-ci.yml` checks that the app compiles on every PR that touches `source/`. To build by hand instead (needs Xcode or the Command Line Tools): `cd source && bash build.sh && open build/PomPet.app`. The paw menu in the menu bar has "Zoomies!" (⌘Z while the menu is open), size, hide, walk on the Dock and "Open at Login" (the installer already puts it in /Applications).
- **Demo:** `demo.mp4`, a 20-second clip of Muji's day: walking, sniffing, saying hi, yawning, napping belly-up, stretching and zoomies.
- **Source:** `source/` (Swift + AppKit, no Xcode project needed).
  - `Sources/Pet.swift`: the behaviour state machine (energy, time of day, away/back).
  - `Sources/main.swift`: the overlay window, pixel-perfect drawing and the menu.
  - `tools/sprites.py`: every sprite is generated from code here. Run `python3 tools/export_sprites.py` (Swift) and `python3 tools/export_web.py` (this page) after editing.
