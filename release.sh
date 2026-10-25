#!/usr/bin/env bash
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

VERSION=$(grep -oP '"version":\s*"\K[^"]+' manifest.json 2>/dev/null || true)
if [ -z "$VERSION" ]; then
    echo "Blad: Nie znaleziono pola 'version' w manifest.json!" >&2
    exit 1
fi

if git rev-parse "refs/tags/$VERSION" >/dev/null 2>&1; then
    echo "Blad: Tag '$VERSION' juz istnieje w git! Zmien najpierw wersje w manifest.json." >&2
    exit 1
fi

# Synchronizacja package.json i versions.json z wersja wpisana recznie w manifest.json
python3 - <<EOF
import json, os
ver = "$VERSION"
with open("manifest.json") as f:
    min_app = json.load(f).get("minAppVersion", "1.5.8")
if os.path.exists("package.json"):
    with open("package.json") as f: p = json.load(f)
    if p.get("version") != ver:
        p["version"] = ver
        with open("package.json", "w") as f: json.dump(p, f, indent="\t"); f.write("\n")
if os.path.exists("versions.json"):
    with open("versions.json") as f: v = json.load(f)
    if ver not in v:
        v[ver] = min_app
        with open("versions.json", "w") as f: json.dump(v, f, indent="\t"); f.write("\n")
EOF

# Jesli zsynchronizowano package.json/versions.json, dolacz je przed tagiem
if ! git diff --quiet manifest.json package.json versions.json 2>/dev/null; then
    git add manifest.json package.json versions.json package-lock.json 2>/dev/null || true
    git commit -m "chore: sync version $VERSION" || true
fi

read -r -p "Wydac wersje $VERSION z manifest.json na GitHub? [t/N]: " CONFIRM
if [[ ! "$CONFIRM" =~ ^[tTyY] ]]; then
    echo "Anulowano."
    exit 0
fi

git push origin "$(git branch --show-current)"
git tag -a "$VERSION" -m "Release $VERSION"
git push origin "$VERSION"

echo "Gotowe: Tag $VERSION wypchniety. GitHub Actions buduje podpisany release."

