#!/bin/bash
# Installs Muji (PomPet.app) on macOS 13+ by building it from source:
#   curl -fsSL https://raw.githubusercontent.com/amberandmuji/portfolio-apps/main/muji-desktop-pet/install.sh | bash
set -euo pipefail

if [ "$(uname)" != "Darwin" ]; then
  echo "Muji is a Mac app; this installer only runs on macOS." >&2
  exit 1
fi

if ! xcrun --find swiftc >/dev/null 2>&1; then
  echo "Muji is built with Apple's Command Line Tools, which aren't installed yet."
  echo "Opening the installer now. When it finishes, run this command again."
  xcode-select --install || true
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading Muji..."
curl -fsSL https://github.com/amberandmuji/portfolio-apps/archive/refs/heads/main.tar.gz \
  | tar -xz -C "$tmp" --strip-components=1 portfolio-apps-main/muji-desktop-pet/source

bash "$tmp/muji-desktop-pet/source/build.sh" >/dev/null

dest=/Applications
[ -w "$dest" ] || { dest="$HOME/Applications"; mkdir -p "$dest"; }

pkill -x PomPet 2>/dev/null || true
rm -rf "$dest/PomPet.app"
mv "$tmp/muji-desktop-pet/source/build/PomPet.app" "$dest/"
open "$dest/PomPet.app"

echo "Installed $dest/PomPet.app. Muji is on the bottom of your screen; the paw in the menu bar has his menu."
