#!/usr/bin/env bash
set -euo pipefail

# Publie le build SeatShop sur la branche gh-pages (GitHub Pages).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REMOTE="$(git config --get remote.origin.url || true)"
if [ -z "$REMOTE" ]; then
  echo "Aucun remote Git 'origin'. Ajoutez le dépôt GitHub avant de déployer." >&2
  exit 1
fi

NAME="$(git config user.name || true)"
EMAIL="$(git config user.email || true)"

BASE_PATH="${BASE_PATH:-/seatshop/}" npm run build

TMP="$(mktemp -d "${TMPDIR:-/tmp}/seatshop-pages.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
cp -a dist/. "$TMP/"
touch "$TMP/.nojekyll"

cd "$TMP"
git init -q -b gh-pages
git config user.name "${NAME:-SeatShop Deploy}"
git config user.email "${EMAIL:-seatshop@users.noreply.github.com}"
git add -A
git commit -q -m "Déploiement SeatShop $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push --force "$REMOTE" HEAD:gh-pages

echo "SeatShop publié sur la branche gh-pages."
