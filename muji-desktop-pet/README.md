# Muji · Desktop Pom

A cosy 8-bit Pomeranian who lives along the bottom of your Mac screen, drawn from photos of Muji. He wanders, sniffs, sits, looks at you, yawns, stretches and does the odd zoomies. He gets tired and naps, curled up or belly-up, is sleepier in the evening and sleeps through the night (10:30pm–7am). Step away for 5 minutes and he curls up; come back and he stretches and says hi. The overlay is click-through and shows on every Space, including full-screen apps.

- **Preview:** open `index.html` in a browser. It's a single self-contained file (fonts load from Google Fonts) that runs the same behaviour as the Mac app, with Muji wandering along the bottom of the page. "Zoomies!" sends him running, and "Speed up time ×20" and "Pretend I left" show the nap-and-greet cycle quickly.
- **Mac app (macOS 13+):** `cd source && bash build.sh && open build/PomPet.app`. Needs Xcode or the Command Line Tools (`xcode-select --install`). The paw menu in the menu bar has "Zoomies!" (⌘Z while the menu is open), size, hide, walk on the Dock and "Open at Login" (move the app to /Applications first).
- **Demo:** `demo.mp4`, a 20-second clip of Muji's day: walking, sniffing, saying hi, yawning, napping belly-up, stretching and zoomies.
- **Source:** `source/` (Swift + AppKit, no Xcode project needed).
  - `Sources/Pet.swift`: the behaviour state machine (energy, time of day, away/back).
  - `Sources/main.swift`: the overlay window, pixel-perfect drawing and the menu.
  - `tools/sprites.py`: every sprite is generated from code here. Run `python3 tools/export_sprites.py` (Swift) and `python3 tools/export_web.py` (this page) after editing.
