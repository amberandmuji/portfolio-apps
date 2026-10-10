#!/bin/bash
# Builds PomPet.app (universal: Apple Silicon + Intel). Needs Xcode or the Command Line Tools
# (install with:  xcode-select --install).
set -euo pipefail
cd "$(dirname "$0")"

APP="build/PomPet.app"
rm -rf build
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

for arch in arm64 x86_64; do
  echo "Compiling ($arch)..."
  xcrun swiftc -swift-version 5 -O -target "$arch-apple-macos13.0" -o "build/PomPet-$arch" Sources/*.swift
done
lipo -create -output "$APP/Contents/MacOS/PomPet" build/PomPet-arm64 build/PomPet-x86_64
rm build/PomPet-arm64 build/PomPet-x86_64

cp Info.plist "$APP/Contents/Info.plist"
iconutil -c icns Resources/AppIcon.iconset -o "$APP/Contents/Resources/AppIcon.icns"
codesign --force --sign - "$APP"

echo
echo "Built $APP"
echo "Run it:      open $APP"
echo "Install it:  mv $APP /Applications/"
