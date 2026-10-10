# PomPet — Muji

Muji is a cosy pixel-art Pomeranian who lives along the bottom of your Mac screen.

## Build & run (macOS 13+)
    ./build.sh                 # needs Xcode or Command Line Tools (xcode-select --install)
    open build/PomPet.app
    mv build/PomPet.app /Applications/   # then enable "Open at Login" from the paw menu

## What he does
- Wanders, sniffs, sits, looks at you, yawns, stretches, and does the occasional zoomies.
- Gets tired over time and naps (curled up or belly-up); sleepier in the evening, asleep at night (10:30pm-7am).
- Step away for 5 minutes and he curls up; come back and he wakes, stretches, and says hi.
- Click-through: the overlay never blocks your clicks. Shows on every Space, including full-screen apps.

## Paw menu (menu bar)
Status + energy - Hide/Show - Size (Small/Medium/Large) - Walk on Top of the Dock - Open at Login - Quit

## Tweaking
- Name: `petName` at the top of `Sources/main.swift`.
- Behaviour/timings: `Sources/Pet.swift` (speeds, energy rates, nap rules).
- Art: edit `tools/sprites.py`, then `python3 tools/export_sprites.py && ./build.sh`.
