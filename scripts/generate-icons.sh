#!/usr/bin/env bash
set -euo pipefail

# Régénère les icônes PWA à partir de l'icône Seatiks fournie.
# Dépendance : ImageMagick (commande `convert`).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/assets/seatiks-appicon-v2.png"
OUT="$ROOT/public/icons"
BG="#24523a"

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick est requis (commande convert)." >&2
  exit 1
fi

if [ ! -f "$SOURCE" ]; then
  echo "Icône source introuvable : $SOURCE" >&2
  exit 1
fi

mkdir -p "$OUT"

# Icônes « any » : on conserve les coins transparents de l'icône source.
convert "$SOURCE" -resize 1024x1024 "$OUT/icon-1024.png"
for size in 512 384 192 180 96 32; do
  convert "$OUT/icon-1024.png" -resize "${size}x${size}" "$OUT/icon-${size}.png"
done

# Apple exige une icône opaque, sans transparence.
convert "$OUT/icon-1024.png" -resize 180x180 -background "$BG" -alpha remove -alpha off "$OUT/apple-touch-icon.png"

# Icône maskable : marge de sécurité autour du logo, fond plein.
convert "$OUT/icon-1024.png" -resize 820x820 -background "$BG" -gravity center -extent 1024x1024 "$OUT/.maskable-1024.png"
convert "$OUT/.maskable-1024.png" -resize 512x512 "$OUT/maskable-512.png"
convert "$OUT/.maskable-1024.png" -resize 192x192 "$OUT/icon-192-maskable.png"
rm -f "$OUT/.maskable-1024.png"
convert "$OUT/icon-1024.png" -resize 32x32 "$ROOT/public/favicon.png"

echo "Icônes générées dans $OUT"
