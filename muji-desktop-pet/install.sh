#!/bin/bash
# Installs Muji (PomPet.app) on macOS 13+ from the latest build on GitHub:
#   curl -fsSL https://raw.githubusercontent.com/amberandmuji/portfolio-apps/main/muji-desktop-pet/install.sh | bash
set -euo pipefail

if [ "$(uname)" != "Darwin" ]; then
  echo "Muji is a Mac app; this installer only runs on macOS." >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading Muji..."
curl -fsSL -o "$tmp/PomPet.zip" https://github.com/amberandmuji/portfolio-apps/releases/download/muji/PomPet.zip
ditto -x -k "$tmp/PomPet.zip" "$tmp"

dest=/Applications
[ -w "$dest" ] || { dest="$HOME/Applications"; mkdir -p "$dest"; }

pkill -x PomPet 2>/dev/null || true
rm -rf "$dest/PomPet.app"
mv "$tmp/PomPet.app" "$dest/"
open "$dest/PomPet.app"

echo "Installed $dest/PomPet.app. Muji is on the bottom of your screen; the paw in the menu bar has his menu."
